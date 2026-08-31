import json
import re
from typing import Any, Dict

from app.config import GOOGLE_API_KEY, VISION_MODE, VISION_MODEL
from app.services.firestore import list_documents
from app.vision.schemas import ExtractedIncident, VisionExtraction

_INCIDENT_TYPES = [
    "FLOOD",
    "FIRE",
    "EARTHQUAKE",
    "LANDSLIDE",
    "STORM",
    "HEATWAVE",
    "ACCIDENT",
    "OTHER",
]

_PROMPT = """You are a crisis-dispatch analyst for the NEXUS command center.
Analyze the attached field image and extract a structured incident report.

Available incident zones:
{zones}

Available incident types: {types}

Return ONLY valid JSON matching exactly this shape:
{{
  "confidence": <float 0..1 estimating confidence in the extraction>,
  "notes": [<short observation strings>],
  "incident": {{
    "title": <short title>,
    "type": <one of the available types>,
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "status": "ACTIVE",
    "description": <1-2 sentence description of what the image shows>,
    "location": {{"latitude": <float>, "longitude": <float>}},
    "affected_zones": [<zone ids from the available list that seem affected>],
    "affected_population": <integer estimate>
  }}
}}

Do not include markdown fences or any text outside the JSON.
"""


def _zone_context() -> str:
    zones = list_documents("zones")

    return ", ".join(
        f"{zone['id']} ({zone['name']})"
        for zone in zones
        if "id" in zone
    )


def _parse_json(text: str) -> Dict[str, Any]:
    cleaned = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        text.strip(),
        flags=re.MULTILINE,
    )

    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    parsed_objects: list[Any] = []

    for candidate in _json_objects(cleaned):
        parsed = _try_load(candidate)
        if parsed is not None:
            parsed_objects.append(parsed)

    for parsed in parsed_objects:
        if isinstance(parsed, dict) and "incident" in parsed:
            return parsed

    for parsed in parsed_objects:
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("Could not parse JSON from model response")


def _try_load(text: str) -> Any | None:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


def _json_objects(text: str) -> list[str]:
    """Yield each top-level {...} block found in the text."""
    candidates: list[str] = []
    start: int | None = None
    depth = 0
    in_string = False
    escape = False

    for index, char in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            if depth == 0:
                start = index
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0 and start is not None:
                candidates.append(text[start : index + 1])
                start = None

    return candidates


def _gemini_extract(
    image_bytes: bytes,
    mime_type: str,
) -> VisionExtraction:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GOOGLE_API_KEY)

    prompt = _PROMPT.format(
        zones=_zone_context(),
        types=", ".join(_INCIDENT_TYPES),
    )

    response = client.models.generate_content(
        model=VISION_MODEL,
        contents=[
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            ),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    text = getattr(response, "text", None) or ""

    data = _parse_json(text)

    incident_payload = data.get("incident")

    if not isinstance(incident_payload, dict):
        raise ValueError("Gemini response did not include an incident object")

    incident = ExtractedIncident.model_validate(incident_payload)

    return VisionExtraction(
        mode="llm",
        confidence=float(data.get("confidence", 0.8)),
        notes=[str(note) for note in data.get("notes", [])],
        incident=incident,
    )


def _deterministic_extract() -> VisionExtraction:
    return VisionExtraction(
        mode="deterministic",
        confidence=0.72,
        notes=[
            "Offline mode: no GOOGLE_API_KEY or VISION_MODE=deterministic.",
            "Extraction uses the sample flood template.",
        ],
        incident=ExtractedIncident(
            title="Reported flooding near river district",
            type="FLOOD",
            severity="HIGH",
            status="ACTIVE",
            description=(
                "Field report suggests rising water levels in the "
                "northern river district."
            ),
            location={"latitude": 12.985, "longitude": 77.595},
            affected_zones=["ZONE-N01", "ZONE-N02"],
            affected_population=8200,
        ),
    )


def extract_from_image(
    image_bytes: bytes,
    mime_type: str,
) -> VisionExtraction:
    """Analyze an image and return a structured incident extraction.

    Uses real Gemini vision when VISION_MODE=llm and a GOOGLE_API_KEY is
    set; falls back to a deterministic sample otherwise.
    """
    if VISION_MODE == "llm" and GOOGLE_API_KEY:
        return _gemini_extract(image_bytes, mime_type)

    return _deterministic_extract()