"""Agent fleet registry.

Holds the fleet manifest — agent identity, role, capabilities and
policy — plus runtime state (invocation counters and last-seen
timestamps) persisted in the ``agent_state`` collection so the fleet
view reflects real activity rather than a static hero screen.
"""

from datetime import datetime, timezone
from typing import Any

from app.services.firestore import create_document, get_document, list_documents

AGENT_ROLES: dict[str, dict[str, Any]] = {
    "coordinator": {
        "name": "Coordinator",
        "role": "Decomposes events into tasks and routes them to specialist agents.",
        "capabilities": ["task_decomposition", "autonomous_routing"],
        "policy": "route_specialist · approve_outbound_actions",
    },
    "research": {
        "name": "Research",
        "role": "Gathers field signals, zone facts, weather and ward population.",
        "capabilities": ["research_incident"],
        "policy": "read_incidents · read_weather · read_wards",
    },
    "risk": {
        "name": "Risk",
        "role": "Computes the risk score, level and driving factors.",
        "capabilities": ["analyze_risk"],
        "policy": "read_incidents · read_weather",
    },
    "geospatial": {
        "name": "Geospatial",
        "role": "Identifies road constraints and zone exposure.",
        "capabilities": ["geospatial_roads"],
        "policy": "read_roads · read_zones",
    },
    "resource": {
        "name": "Resource",
        "role": "Assesses shelters, hospitals, teams, vehicles and supplies.",
        "capabilities": ["assess_resources"],
        "policy": "read_resources",
    },
    "decision": {
        "name": "Decision",
        "role": "Generates the recommended response and plan options.",
        "capabilities": ["recommend_response"],
        "policy": "read_analysis · approve_plan",
    },
    "simulation": {
        "name": "Simulation",
        "role": "Evaluates 'what if?' scenarios against isolated state.",
        "capabilities": ["simulate_scenario"],
        "policy": "mutate_isolated_state · read_analysis",
    },
}

_ACTIVE_WINDOW_SECONDS = 300


def _state_id(agent_id: str) -> str:
    return f"AGENT-{agent_id.upper()}"


def touch_agent(agent_id: str) -> None:
    """Mark an agent as invoked now, bumping its invocation count."""
    document_id = _state_id(agent_id)
    existing = get_document("agent_state", document_id)

    now = datetime.now(timezone.utc).isoformat()

    state = {
        "id": document_id,
        "agent_id": agent_id,
        "invoked": (int(existing.get("invoked") or 0) if existing else 0) + 1,
        "last_seen": now,
    }

    create_document("agent_state", document_id, state)


def _status(state: dict[str, Any]) -> str:
    last = state.get("last_seen")

    if not last:
        return "REGISTERED"

    try:
        last_dt = datetime.fromisoformat(last)
    except (TypeError, ValueError):
        return "REGISTERED"

    age_seconds = (datetime.now(timezone.utc) - last_dt).total_seconds()

    if age_seconds <= _ACTIVE_WINDOW_SECONDS:
        return "ACTIVE"

    return "STANDBY"


def get_fleet() -> list[dict[str, Any]]:
    """Merge the static manifest with runtime state for every agent."""
    states = {
        item.get("agent_id"): item
        for item in list_documents("agent_state")
    }

    fleet = []

    for agent_id, meta in AGENT_ROLES.items():
        state = states.get(agent_id, {})

        fleet.append(
            {
                "id": agent_id,
                "name": meta["name"],
                "role": meta["role"],
                "status": _status(state),
                "capabilities": meta["capabilities"],
                "policy": meta["policy"],
                "invoked": int(state.get("invoked") or 0),
                "last_seen": state.get("last_seen"),
            }
        )

    return fleet