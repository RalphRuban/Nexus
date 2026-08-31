from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.scenarios.engine import run_scenario
from app.scenarios.presets import get_presets
from app.scenarios.schemas import Scenario, ScenarioCreate
from app.services.firestore import (
    create_document,
    delete_document,
    get_document,
    list_documents,
)

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _next_scenario_id() -> str:
    documents = list_documents("scenarios")

    numbers = []

    for item in documents:
        document_id = item.get("id", "")

        if document_id.startswith("SCEN-"):
            try:
                numbers.append(int(document_id[5:]))
            except ValueError:
                continue

    next_number = max(numbers, default=0) + 1

    return f"SCEN-{next_number:03d}"


@router.get("/scenarios/presets")
def scenario_presets(incident_id: str):
    incident = get_document("incidents", incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return get_presets(incident_id)


@router.post("/scenarios", status_code=201, response_model=Scenario)
async def create_scenario(payload: ScenarioCreate):
    incident = get_document(
        "incidents",
        payload.incident_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    scenario_id = _next_scenario_id()

    baseline, result = await run_scenario(
        payload.incident_id,
        payload.mutations,
        scenario_name=payload.name,
    )

    scenario = Scenario(
        id=scenario_id,
        name=payload.name,
        incident_id=payload.incident_id,
        description=payload.description,
        template=payload.template,
        mutations=payload.mutations,
        baseline=baseline,
        result=result,
        created_at=datetime.now(timezone.utc),
    )

    create_document(
        "scenarios",
        scenario_id,
        scenario.model_dump(mode="json"),
    )

    return scenario


@router.get("/scenarios")
def scenarios():
    documents = list_documents("scenarios")

    return sorted(
        documents,
        key=lambda item: item.get("created_at", ""),
        reverse=True,
    )


@router.get("/scenarios/{scenario_id}")
def scenario(scenario_id: str):
    result = get_document(
        "scenarios",
        scenario_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Scenario not found",
        )

    return result


@router.delete("/scenarios/{scenario_id}")
def remove_scenario(scenario_id: str):
    deleted = delete_document(
        "scenarios",
        scenario_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Scenario not found",
        )

    return {
        "deleted": True,
        "id": scenario_id,
    }