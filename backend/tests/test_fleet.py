import os

os.environ["USE_FIRESTORE"] = "false"
os.environ["VISION_MODE"] = "deterministic"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.firestore import (
    MOCK_COLLECTIONS,
    clear_mock_store,
    set_mock_documents,
)

client = TestClient(app)

PIPELINE_AGENTS = [
    "research",
    "risk",
    "geospatial",
    "resource",
    "coordinator",
    "decision",
]


@pytest.fixture(autouse=True)
def reset_store():
    clear_mock_store()

    for collection, documents in MOCK_COLLECTIONS.items():
        set_mock_documents(collection, documents)

    yield

    clear_mock_store()


def _scenario_payload(**overrides):
    payload = {
        "name": "Fleet isolation",
        "incident_id": "INC-001",
        "description": "Ensures scenario runs do not record traces",
        "template": "flood_rise",
        "mutations": {
            "zones": [{"id": "ZONE-N01", "flood_level": 4.0}],
            "roads": [],
            "hospitals": [],
            "incident": None,
        },
    }

    payload.update(overrides)

    return payload


def test_fleet_returns_all_registered_agents():
    response = client.get("/agents")

    assert response.status_code == 200

    fleet = response.json()

    ids = {agent["id"] for agent in fleet}

    assert ids == {
        "coordinator",
        "research",
        "risk",
        "geospatial",
        "resource",
        "decision",
        "simulation",
    }

    assert all("name" in agent for agent in fleet)
    assert all("role" in agent for agent in fleet)
    assert all("policy" in agent for agent in fleet)
    assert all("capabilities" in agent for agent in fleet)
    assert all(
        agent["status"] in {"REGISTERED", "ACTIVE", "STANDBY"}
        for agent in fleet
    )
    assert all(agent["invoked"] == 0 for agent in fleet)


def test_fleet_tracks_invocations_after_analysis():
    response = client.post("/agents/analyze/INC-001")

    assert response.status_code == 200

    fleet = {agent["id"]: agent for agent in client.get("/agents").json()}

    assert fleet["research"]["invoked"] == 1
    assert fleet["decision"]["invoked"] == 1
    assert fleet["coordinator"]["invoked"] == 1

    assert fleet["research"]["status"] == "ACTIVE"
    assert fleet["coordinator"]["status"] == "ACTIVE"


def test_trace_recorded_after_analysis():
    response = client.post("/agents/analyze/INC-001")

    assert response.status_code == 200

    traces = client.get("/agents/traces").json()

    assert len(traces) == 1

    trace = traces[0]

    assert trace["incident_id"] == "INC-001"
    assert trace["mode"] == "deterministic"
    assert trace["status"] == "COMPLETED"
    assert trace["requested_by"] == "operator-1"
    assert trace["total_ms"] >= 0
    assert trace["completed_at"]

    assert [span["agent"] for span in trace["spans"]] == PIPELINE_AGENTS

    assert all(
        span["status"] == "COMPLETED"
        and span["duration_ms"] >= 0
        for span in trace["spans"]
    )


def test_trace_attributed_to_principal_header():
    response = client.post(
        "/agents/analyze/INC-001",
        headers={"X-Agent-Principal": "cmd-bengaluru"},
    )

    assert response.status_code == 200

    traces = client.get("/agents/traces").json()

    assert traces[0]["requested_by"] == "cmd-bengaluru"


def test_traces_are_newest_first_and_limited():
    for _ in range(3):
        client.post("/agents/analyze/INC-001")

    traces = client.get("/agents/traces").json()

    assert len(traces) == 3
    assert traces[0]["id"] == "TRC-003"
    assert traces[1]["id"] == "TRC-002"
    assert traces[2]["id"] == "TRC-001"

    limited = client.get("/agents/traces", params={"limit": 2}).json()

    assert len(limited) == 2
    assert [t["id"] for t in limited] == ["TRC-003", "TRC-002"]


def test_scenario_run_does_not_record_traces_or_touch_agents():
    response = client.post("/scenarios", json=_scenario_payload())

    assert response.status_code == 201

    assert client.get("/agents/traces").json() == []

    fleet = {agent["id"]: agent for agent in client.get("/agents").json()}

    assert all(agent["invoked"] == 0 for agent in fleet.values())