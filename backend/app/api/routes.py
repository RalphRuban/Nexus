from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request

from app.agents.registry import get_fleet
from app.agents.schemas import AgentAnalysis
from app.agents.service import analyze_incident, get_agent_activity, get_traces
from app.models.nexus import IncidentCreate, IncidentUpdate
from app.services.firestore import (
    create_document,
    delete_document,
    get_document,
    list_documents,
    reset_store,
    update_document,
)

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _next_id(collection: str, prefix: str) -> str:
    documents = list_documents(collection)

    numbers = []

    for item in documents:
        document_id = item.get("id", "")

        if document_id.startswith(prefix):
            try:
                numbers.append(int(document_id[len(prefix):]))
            except ValueError:
                continue

    next_number = max(numbers, default=0) + 1

    return f"{prefix}{next_number:03d}"


def log_activity(message: str, actor: str = "OPERATOR", severity: str = "INFO") -> None:
    activity_id = _next_id("activity", "LOG-")

    create_document(
        "activity",
        activity_id,
        {
            "timestamp": _now_iso(),
            "actor": actor,
            "message": message,
            "severity": severity,
        },
    )


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "nexus-backend",
    }


@router.post("/reset")
def reset_demo_data():
    count = reset_store()

    log_activity(
        f"Demo data reset ({count} documents reseeded)",
        actor="OPERATOR",
        severity="INFO",
    )

    return {
        "reset": True,
        "documents": count,
    }


@router.get("/incidents")
def incidents(
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    type: str | None = Query(default=None),
):
    filters = {}

    if severity is not None:
        filters["severity"] = severity.upper()

    if status is not None:
        filters["status"] = status.upper()

    if type is not None:
        filters["type"] = type.upper()

    return list_documents("incidents", filters)


@router.get("/incidents/{incident_id}")
def incident(incident_id: str):
    result = get_document(
        "incidents",
        incident_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return result


@router.post("/incidents", status_code=201)
def create_incident(payload: IncidentCreate):
    incident_id = _next_id("incidents", "INC-")

    now = _now_iso()

    document = payload.model_dump()

    document.update(
        {
            "id": incident_id,
            "detected_at": now,
            "updated_at": now,
        }
    )

    create_document(
        "incidents",
        incident_id,
        document,
    )

    log_activity(
        f"Incident {incident_id} created",
        actor="OPERATOR",
        severity="INFO",
    )

    return document


@router.patch("/incidents/{incident_id}")
def update_incident(incident_id: str, payload: IncidentUpdate):
    existing = get_document(
        "incidents",
        incident_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    changes = payload.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    if not changes:
        return existing

    changes["updated_at"] = _now_iso()

    updated = update_document(
        "incidents",
        incident_id,
        changes,
    )

    log_activity(
        f"Incident {incident_id} updated",
        actor="OPERATOR",
        severity="INFO",
    )

    return updated


@router.delete("/incidents/{incident_id}")
def remove_incident(incident_id: str):
    deleted = delete_document(
        "incidents",
        incident_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    log_activity(
        f"Incident {incident_id} deleted",
        actor="OPERATOR",
        severity="INFO",
    )

    return {
        "deleted": True,
        "id": incident_id,
    }


@router.get("/zones")
def zones():
    return list_documents("zones")


@router.get("/zones/{zone_id}")
def zone(zone_id: str):
    result = get_document(
        "zones",
        zone_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Zone not found",
        )

    return result


@router.get("/roads")
def roads():
    return list_documents("roads")


@router.get("/shelters")
def shelters():
    return list_documents("shelters")


@router.get("/hospitals")
def hospitals():
    return list_documents("hospitals")


@router.get("/teams")
def teams():
    return list_documents("teams")


@router.get("/vehicles")
def vehicles():
    return list_documents("vehicles")


@router.get("/supplies")
def supplies():
    return list_documents("supplies")


@router.get("/weather")
def weather(
    zone: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=10000),
    date: str | None = Query(default=None),
):
    filters = {}

    if zone is not None:
        filters["zone"] = zone

    if date is not None:
        filters["date"] = date

    events = list_documents("weather_events", filters)

    events = sorted(events, key=lambda item: item["timestamp"], reverse=True)

    if limit:
        events = events[:limit]

    return events


@router.get("/reports")
def reports():
    return list_documents("incident_reports")


@router.get("/wards")
def wards(
    zone: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
):
    filters = {}

    if zone is not None:
        filters["zone"] = zone

    records = list_documents("wards", filters)

    if limit:
        records = records[:limit]

    return records


@router.get("/activity")
def activity():
    return list_documents("activity")


@router.get("/agents")
def agents():
    return get_fleet()


@router.get("/agents/traces")
def agent_traces(
    limit: int = Query(default=20, ge=1, le=200),
):
    return get_traces(limit)


@router.post("/agents/analyze/{incident_id}", response_model=AgentAnalysis)
async def analyze(incident_id: str, request: Request):
    result = get_document(
        "incidents",
        incident_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    principal = request.headers.get("X-Agent-Principal", "operator-1")

    return await analyze_incident(incident_id, requested_by=principal)


@router.get("/agents/activity")
def agent_activity():
    return get_agent_activity()
