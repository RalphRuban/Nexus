from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.routes import log_activity
from app.services.firestore import (
    create_document,
    get_document,
    list_documents,
)

router = APIRouter()

_PLAN_IDS = {"A", "B", "C"}


def _next_plan_id() -> str:
    documents = list_documents("plans")

    numbers = []

    for item in documents:
        document_id = item.get("id", "")

        if document_id.startswith("PLAN-"):
            try:
                numbers.append(int(document_id[5:]))
            except ValueError:
                continue

    next_number = max(numbers, default=0) + 1

    return f"PLAN-{next_number:03d}"


@router.post("/incidents/{incident_id}/plans/{plan_id}/approve", status_code=201)
def approve_plan(incident_id: str, plan_id: str):
    if plan_id.upper() not in _PLAN_IDS:
        raise HTTPException(
            status_code=404,
            detail="Plan not found",
        )

    incident = get_document(
        "incidents",
        incident_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    existing = list_documents(
        "plans",
        {
            "incident_id": incident_id,
            "plan_id": plan_id.upper(),
        },
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Plan already approved",
        )

    now = datetime.now(timezone.utc).isoformat()

    document = {
        "id": _next_plan_id(),
        "incident_id": incident_id,
        "plan_id": plan_id.upper(),
        "label": _plan_label(plan_id.upper()),
        "approved_at": now,
        "status": "APPROVED",
    }

    create_document(
        "plans",
        document["id"],
        document,
    )

    log_activity(
        f"Plan {document['label']} approved for incident {incident_id}",
        actor="OPERATOR",
        severity="INFO",
    )

    return document


@router.get("/plans")
def plans(incident_id: str | None = None):
    filters = {}

    if incident_id is not None:
        filters["incident_id"] = incident_id

    documents = list_documents("plans", filters)

    return sorted(
        documents,
        key=lambda item: item.get("approved_at", ""),
        reverse=True,
    )


def _plan_label(plan_id: str) -> str:
    labels = {
        "A": "Evacuation First",
        "B": "Infrastructure First",
        "C": "Balanced",
    }

    return labels.get(plan_id, plan_id)
