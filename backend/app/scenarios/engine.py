import copy
from datetime import datetime, timezone
from typing import Any, Dict

from app.agents.schemas import AgentAnalysis, AgentStep
from app.agents.service import (
    analyze_incident,
    compute_deterministic,
    log_scenario_activity,
    run_simulation_workflow,
)
from app.scenarios.schemas import ScenarioMutations
from app.services.firestore import (
    MOCK_COLLECTIONS,
    list_documents,
    set_store_override,
)

# Collections included in the isolated snapshot. Scenarios are excluded
# because they are read/written through the live store only.
_DATA_COLLECTIONS = [
    name
    for name in MOCK_COLLECTIONS
    if name != "scenarios"
]


def _snapshot_store() -> Dict[str, Dict[str, Dict[str, Any]]]:
    """Copy all live data collections into a fresh isolated store.

    Works in both mock and Firestore mode by reading through the
    existing data layer.
    """
    store: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for collection_name in _DATA_COLLECTIONS:
        documents = list_documents(collection_name)

        store[collection_name] = {
            document["id"]: copy.deepcopy(document)
            for document in documents
            if "id" in document
        }

    return store


def _apply_mutations(
    store: Dict[str, Dict[str, Dict[str, Any]]],
    incident_id: str,
    mutations: ScenarioMutations,
) -> None:
    for zone in mutations.zones:
        collection = store.setdefault("zones", {})
        target = collection.get(zone.id)

        if target is None:
            continue

        update = {
            key: value
            for key, value in zone.model_dump().items()
            if value is not None and key != "id"
        }

        target.update(update)

    for road in mutations.roads:
        collection = store.setdefault("roads", {})
        target = collection.get(road.id)

        if target is None:
            continue

        update = {
            key: value
            for key, value in road.model_dump().items()
            if value is not None and key != "id"
        }

        target.update(update)

    for hospital in mutations.hospitals:
        collection = store.setdefault("hospitals", {})
        target = collection.get(hospital.id)

        if target is None:
            continue

        update = {
            key: value
            for key, value in hospital.model_dump().items()
            if value is not None and key != "id"
        }

        target.update(update)

    if mutations.incident is not None:
        collection = store.setdefault("incidents", {})
        target = collection.get(incident_id)

        if target is not None:
            update = {
                key: value
                for key, value in mutations.incident.model_dump().items()
                if value is not None
            }

            target.update(update)


def compute_scenario_result(
    incident_id: str,
    mutations: ScenarioMutations,
    scenario_name: str = "scenario",
) -> AgentAnalysis:
    """Compute the scenario result against an isolated snapshot and append
    a Simulation agent step. Never mutates the live store."""
    baseline = compute_deterministic(incident_id)

    store = _snapshot_store()

    _apply_mutations(store, incident_id, mutations)

    set_store_override(store)

    try:
        result = compute_deterministic(incident_id)
    finally:
        set_store_override(None)

    result.steps.append(
        AgentStep(
            agent="simulation",
            status="COMPLETED",
            summary=(
                f"Evaluated {scenario_name}: risk "
                f"{baseline.risk.score} -> {result.risk.score}."
            ),
            timestamp=datetime.now(timezone.utc),
        )
    )

    return result


async def run_scenario(
    incident_id: str,
    mutations: ScenarioMutations,
    user_id: str = "scenario-1",
    scenario_name: str = "scenario",
):
    """Compute baseline and scenario results for an incident.

    The baseline is computed against the live store; the scenario result
    is computed against an isolated snapshot with the mutations applied.
    Mutations never leak into the live store. The Simulation agent runs
    through its dedicated ADK workflow so it appears as a genuine agent
    execution.
    """
    baseline = await analyze_incident(
        incident_id,
        user_id=user_id,
        actor="AGENT",
        log_activity=False,
        requested_by="simulation",
        record_trace=False,
    )

    await run_simulation_workflow(incident_id, user_id=user_id)

    result = compute_scenario_result(
        incident_id,
        mutations,
        scenario_name=scenario_name,
    )

    log_scenario_activity(incident_id)

    return baseline, result