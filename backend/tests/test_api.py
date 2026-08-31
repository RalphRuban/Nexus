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


@pytest.fixture(autouse=True)
def reset_store():
    clear_mock_store()

    for collection, documents in MOCK_COLLECTIONS.items():
        set_mock_documents(collection, documents)

    yield

    clear_mock_store()


def _incident_payload(**overrides):
    payload = {
        "title": "Test Flood Incident",
        "type": "FLOOD",
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "Created by integration test",
        "location": {
            "latitude": 12.99,
            "longitude": 77.60,
        },
        "affected_zones": ["ZONE-N01"],
        "affected_population": 1234,
    }

    payload.update(overrides)

    return payload


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_incidents():
    response = client.get("/incidents")

    assert response.status_code == 200
    assert len(response.json()) == 3


def test_get_single_incident():
    response = client.get("/incidents/INC-001")

    assert response.status_code == 200
    assert response.json()["id"] == "INC-001"


def test_get_incident_not_found():
    response = client.get("/incidents/INC-999")

    assert response.status_code == 404


def test_filter_by_severity():
    response = client.get("/incidents", params={"severity": "HIGH"})

    assert response.status_code == 200

    incidents = response.json()

    assert len(incidents) == 1
    assert all(i["severity"] == "HIGH" for i in incidents)


def test_filter_by_status():
    response = client.get("/incidents", params={"status": "MONITORING"})

    assert response.status_code == 200

    incidents = response.json()

    assert all(i["status"] == "MONITORING" for i in incidents)
    assert len(incidents) == 2


def test_filter_by_type():
    response = client.get("/incidents", params={"type": "FLOOD"})

    assert response.status_code == 200
    assert all(i["type"] == "FLOOD" for i in response.json())


def test_filter_combined():
    response = client.get(
        "/incidents",
        params={"severity": "MEDIUM", "status": "MONITORING"},
    )

    assert response.status_code == 200

    incidents = response.json()

    assert len(incidents) == 1
    assert incidents[0]["id"] == "INC-002"


def test_create_incident():
    before = client.get("/activity").json()

    response = client.post(
        "/incidents",
        json=_incident_payload(),
    )

    assert response.status_code == 201

    created = response.json()

    assert created["id"] == "INC-004"
    assert created["title"] == "Test Flood Incident"
    assert created["detected_at"] is not None
    assert created["updated_at"] is not None

    fetched = client.get("/incidents/INC-004").json()
    assert fetched["id"] == "INC-004"

    after = client.get("/activity").json()
    assert len(after) == len(before) + 1
    assert any(
        "INC-004 created" in item["message"]
        for item in after
    )


def test_update_incident():
    response = client.patch(
        "/incidents/INC-001",
        json={"status": "RESOLVED"},
    )

    assert response.status_code == 200

    updated = response.json()

    assert updated["status"] == "RESOLVED"

    fetched = client.get("/incidents/INC-001").json()
    assert fetched["status"] == "RESOLVED"


def test_update_incident_not_found():
    response = client.patch(
        "/incidents/INC-999",
        json={"status": "RESOLVED"},
    )

    assert response.status_code == 404


def test_delete_incident():
    response = client.delete("/incidents/INC-003")

    assert response.status_code == 200
    assert response.json()["deleted"] is True

    fetched = client.get("/incidents/INC-003")
    assert fetched.status_code == 404


def test_delete_incident_not_found():
    response = client.delete("/incidents/INC-999")

    assert response.status_code == 404


def test_mutation_logs_activity():
    client.post("/incidents", json=_incident_payload())
    client.patch("/incidents/INC-001", json={"severity": "CRITICAL"})
    client.delete("/incidents/INC-002")

    activity = client.get("/activity").json()

    messages = [item["message"] for item in activity]

    assert any("INC-004 created" in m for m in messages)
    assert any("INC-001 updated" in m for m in messages)
    assert any("INC-002 deleted" in m for m in messages)


def test_analyze_incident():
    response = client.post("/agents/analyze/INC-001")

    assert response.status_code == 200

    analysis = response.json()

    assert analysis["incident_id"] == "INC-001"
    assert analysis["mode"] == "deterministic"
    assert analysis["risk"]["score"] > 0
    assert analysis["risk"]["level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }
    assert analysis["recommendation"]["action"]
    assert len(analysis["steps"]) >= 1


def test_analyze_has_confidence_and_plan_options():
    response = client.post("/agents/analyze/INC-001")

    assert response.status_code == 200

    analysis = response.json()

    assert analysis["confidence"] > 0

    options = analysis["recommendation"]["options"]

    assert len(options) == 3
    assert [option["id"] for option in options] == ["A", "B", "C"]
    assert sum(option["recommended"] for option in options) == 1
    assert all(0 < option["confidence"] <= 100 for option in options)
    assert all(option["tradeoffs"] for option in options)


def test_analyze_surfaces_ward_and_weather_research():
    response = client.post("/agents/analyze/INC-001")

    assert response.status_code == 200

    analysis = response.json()

    research_step = next(
        step
        for step in analysis["steps"]
        if step["agent"] == "research"
    )

    summary = research_step["summary"]

    assert "residents" in summary
    assert "peak rainfall" in summary
    assert "weather record" in summary


def test_weather_and_reports_seeded():
    weather = client.get("/weather").json()
    reports = client.get("/reports").json()

    assert len(weather) >= 1
    assert all(item["zone"] for item in weather)

    assert len(reports) >= 1
    assert all(item["source"] for item in reports)


def test_weather_history_seeded_from_real_data():
    weather = client.get("/weather?limit=5000").json()

    real = [
        item
        for item in weather
        if item.get("source") == "Open-Meteo Archive API"
    ]

    assert len(real) > 3000
    assert all(item["rainfall_mm"] is not None for item in real)
    assert all("hourly_precipitation" in item for item in real)
    assert all(item["warning"] in {"NORMAL", "WATCH", "SEVERE", "EXTREME"} for item in real)


def test_weather_filtered_by_zone_and_limit():
    all_zones = client.get("/weather?limit=5000").json()

    zone = all_zones[0]["zone"]

    filtered = client.get(f"/weather?zone={zone}&limit=5").json()

    assert len(filtered) == 5
    assert all(item["zone"] == zone for item in filtered)


def test_wards_seeded():
    wards = client.get("/wards").json()

    assert len(wards) == 198
    assert all(item["population"] > 0 for item in wards)
    assert all(item["literacy_pct"] is not None for item in wards)
    assert all(item["sex_ratio"] > 0 for item in wards)
    assert all(item["source"] == "Census of India 2011" for item in wards)


def test_wards_filtered_by_zone():
    wards = client.get("/wards?zone=ZONE-N01").json()

    assert len(wards) > 0
    assert all(item["zone"] == "ZONE-N01" for item in wards)


def test_analyze_incident_not_found():
    response = client.post("/agents/analyze/INC-999")

    assert response.status_code == 404


def test_agent_activity_logged():
    client.post("/agents/analyze/INC-001")

    response = client.get("/agents/activity")

    assert response.status_code == 200

    logs = response.json()

    assert any(
        "INC-001" in item["message"]
        for item in logs
    )


def test_scenario_presets():
    response = client.get(
        "/scenarios/presets",
        params={"incident_id": "INC-001"},
    )

    assert response.status_code == 200

    presets = response.json()

    assert len(presets) == 5
    assert any(p["id"] == "flood_rise" for p in presets)
    assert all("mutations" in p for p in presets)


def test_create_and_run_scenario():
    response = client.post(
        "/scenarios",
        json={
            "name": "Flood test",
            "incident_id": "INC-001",
            "description": "Raise flood levels",
            "template": "flood_rise",
            "mutations": {
                "zones": [
                    {"id": "ZONE-N01", "flood_level": 4.0}
                ],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    assert response.status_code == 201

    scenario = response.json()

    assert scenario["id"] == "SCEN-001"
    assert scenario["incident_id"] == "INC-001"
    assert scenario["baseline"]["risk"]["score"] > 0
    assert scenario["result"]["risk"]["score"] > 0
    assert "mode" in scenario["baseline"]

    fetched = client.get(f"/scenarios/{scenario['id']}").json()
    assert fetched["id"] == scenario["id"]

    deleted = client.delete(f"/scenarios/{scenario['id']}").json()
    assert deleted["deleted"] is True


def test_flood_rise_increases_risk():
    before = client.post(
        "/agents/analyze/INC-001"
    ).json()

    response = client.post(
        "/scenarios",
        json={
            "name": "Extreme flood",
            "incident_id": "INC-001",
            "template": "flood_rise",
            "mutations": {
                "zones": [
                    {"id": "ZONE-N01", "flood_level": 6.0},
                    {"id": "ZONE-N02", "flood_level": 6.0},
                    {"id": "ZONE-N03", "flood_level": 6.0},
                ],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    scenario = response.json()

    assert (
        scenario["result"]["risk"]["score"]
        > scenario["baseline"]["risk"]["score"]
    )

    assert (
        scenario["result"]["risk"]["score"]
        >= before["risk"]["score"]
    )


def test_scenario_result_has_simulation_step():
    response = client.post(
        "/scenarios",
        json={
            "name": "Simulation step",
            "incident_id": "INC-001",
            "template": "flood_rise",
            "mutations": {
                "zones": [
                    {"id": "ZONE-N01", "flood_level": 5.0}
                ],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    assert response.status_code == 201

    scenario = response.json()

    agents = [step["agent"] for step in scenario["result"]["steps"]]

    assert "simulation" in agents
    assert "simulation" in [
        step["agent"] for step in scenario["result"]["steps"]
    ]

    simulation_step = next(
        step
        for step in scenario["result"]["steps"]
        if step["agent"] == "simulation"
    )

    assert "risk" in simulation_step["summary"]


def test_scenario_isolation_real_store_unchanged():
    before = client.get("/zones/ZONE-N01").json()

    client.post(
        "/scenarios",
        json={
            "name": "Isolation check",
            "incident_id": "INC-001",
            "template": "flood_rise",
            "mutations": {
                "zones": [
                    {"id": "ZONE-N01", "flood_level": 99.0}
                ],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    after = client.get("/zones/ZONE-N01").json()

    assert after["flood_level"] == before["flood_level"]


def test_scenario_run_not_in_agent_activity():
    client.post(
        "/scenarios",
        json={
            "name": "No agent pollution",
            "incident_id": "INC-001",
            "template": "flood_rise",
            "mutations": {
                "zones": [
                    {"id": "ZONE-N01", "flood_level": 4.0}
                ],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    agent_logs = client.get("/agents/activity").json()

    assert all(item["actor"] != "SCENARIO" for item in agent_logs)

    all_activity = client.get("/activity").json()

    assert any(
        item["actor"] == "SCENARIO"
        and "INC-001" in item["message"]
        for item in all_activity
    )


def test_list_scenarios():
    client.post(
        "/scenarios",
        json={
            "name": "Scenario one",
            "incident_id": "INC-001",
            "mutations": {
                "zones": [],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    client.post(
        "/scenarios",
        json={
            "name": "Scenario two",
            "incident_id": "INC-002",
            "mutations": {
                "zones": [],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    response = client.get("/scenarios")

    assert response.status_code == 200

    scenarios = response.json()

    assert len(scenarios) == 2
    assert any(s["name"] == "Scenario one" for s in scenarios)
    assert any(s["name"] == "Scenario two" for s in scenarios)


def test_scenario_incident_not_found():
    response = client.post(
        "/scenarios",
        json={
            "name": "Missing incident",
            "incident_id": "INC-999",
            "mutations": {
                "zones": [],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    assert response.status_code == 404


def test_get_scenario_not_found():
    response = client.get("/scenarios/SCEN-999")

    assert response.status_code == 404


def test_delete_scenario_not_found():
    response = client.delete("/scenarios/SCEN-999")

    assert response.status_code == 404


def _sample_image_bytes() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def test_vision_extract_image():
    response = client.post(
        "/vision/extract",
        files={
            "file": (
                "field_report.png",
                _sample_image_bytes(),
                "image/png",
            )
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["mode"] in {"deterministic", "llm"}
    assert 0 <= payload["confidence"] <= 1
    assert "notes" in payload

    incident = payload["incident"]

    assert incident["title"]
    assert incident["type"]
    assert incident["severity"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }
    assert incident["status"] in {
        "ACTIVE",
        "MONITORING",
        "RESOLVED",
    }
    assert isinstance(incident["affected_population"], int)
    assert "latitude" in incident["location"]
    assert "longitude" in incident["location"]


def test_vision_extract_unsupported_type():
    response = client.post(
        "/vision/extract",
        files={
            "file": (
                "report.pdf",
                b"%PDF-1.4 fake",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400


def test_vision_extract_missing_file():
    response = client.post("/vision/extract")

    assert response.status_code == 422


def test_vision_extracted_incident_creatable():
    extraction = client.post(
        "/vision/extract",
        files={
            "file": (
                "field_report.png",
                _sample_image_bytes(),
                "image/png",
            )
        },
    ).json()

    incident = extraction["incident"]

    created = client.post(
        "/incidents",
        json=incident,
    )

    assert created.status_code == 201
    assert created.json()["id"].startswith("INC-")


def test_reset_demo_data():
    client.post("/incidents", json=_incident_payload())

    before = client.get("/incidents").json()
    assert len(before) == 4

    response = client.post("/reset")

    assert response.status_code == 200

    payload = response.json()

    assert payload["reset"] is True
    assert payload["documents"] > 0

    after = client.get("/incidents").json()

    assert len(after) == 3
    assert {item["id"] for item in after} == {
        "INC-001",
        "INC-002",
        "INC-003",
    }


def test_reset_restores_seed_scenarios():
    client.post(
        "/scenarios",
        json={
            "name": "Temp scenario",
            "incident_id": "INC-001",
            "mutations": {
                "zones": [],
                "roads": [],
                "hospitals": [],
                "incident": None,
            },
        },
    )

    assert len(client.get("/scenarios").json()) == 1

    client.post("/reset")

    assert len(client.get("/scenarios").json()) == 0


def test_approve_plan():
    before = client.get("/activity").json()

    response = client.post("/incidents/INC-001/plans/C/approve")

    assert response.status_code == 201

    plan = response.json()

    assert plan["incident_id"] == "INC-001"
    assert plan["plan_id"] == "C"
    assert plan["label"] == "Balanced"
    assert plan["status"] == "APPROVED"
    assert plan["approved_at"]

    plans = client.get("/plans", params={"incident_id": "INC-001"}).json()

    assert len(plans) == 1
    assert plans[0]["id"] == plan["id"]

    after = client.get("/activity").json()
    assert len(after) == len(before) + 1
    assert any(
        "INC-001" in item["message"] and item["actor"] == "OPERATOR"
        for item in after
    )


def test_approve_plan_duplicate():
    client.post("/incidents/INC-001/plans/A/approve")

    response = client.post("/incidents/INC-001/plans/A/approve")

    assert response.status_code == 409


def test_approve_plan_invalid_plan_id():
    response = client.post("/incidents/INC-001/plans/Z/approve")

    assert response.status_code == 404


def test_approve_plan_incident_not_found():
    response = client.post("/incidents/INC-999/plans/A/approve")

    assert response.status_code == 404


def test_reset_clears_approved_plans():
    client.post("/incidents/INC-001/plans/B/approve")

    assert len(client.get("/plans").json()) == 1

    client.post("/reset")

    assert len(client.get("/plans").json()) == 0
