from typing import Literal

from pydantic import BaseModel

from app.models.nexus import Location


class ExtractedIncident(BaseModel):
    title: str
    type: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    status: Literal["ACTIVE", "MONITORING", "RESOLVED"] = "ACTIVE"
    description: str
    location: Location
    affected_zones: list[str]
    affected_population: int


class VisionExtraction(BaseModel):
    mode: Literal["deterministic", "llm"]
    confidence: float
    notes: list[str]
    incident: ExtractedIncident