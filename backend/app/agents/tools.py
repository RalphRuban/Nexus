from typing import Any

from app.services.firestore import list_documents

_SEVERITY_SCORE = {
    "LOW": 25,
    "MEDIUM": 50,
    "HIGH": 75,
    "CRITICAL": 95,
}

_RISK_LEVEL = [
    (0, "LOW"),
    (40, "MEDIUM"),
    (70, "HIGH"),
    (90, "CRITICAL"),
]


def _get_incident(incident_id: str) -> dict[str, Any]:
    incidents = [
        item
        for item in list_documents("incidents")
        if item.get("id") == incident_id
    ]

    if not incidents:
        raise LookupError(f"Incident {incident_id} not found")

    return incidents[0]


def _risk_level(score: int) -> str:
    for threshold, level in _RISK_LEVEL:
        if score >= threshold:
            continue

        return level

    return "CRITICAL"


def _zone_facts(affected_zones: list[str]) -> list[dict[str, Any]]:
    zones = list_documents("zones")

    return [
        zone
        for zone in zones
        if zone.get("id") in affected_zones
    ]


def research_incident(incident_id: str) -> dict[str, Any]:
    """Return the incident record plus facts about its affected zones."""
    incident = _get_incident(incident_id)

    zones = _zone_facts(incident.get("affected_zones", []))

    zone_ids = set(incident.get("affected_zones", []))

    weather_events = []

    for zone_id in zone_ids:
        weather_events.extend(
            list_documents("weather_events", {"zone": zone_id})
        )

    incident_reports = []

    for zone_id in zone_ids:
        incident_reports.extend(
            list_documents("incident_reports", {"zone": zone_id})
        )

    wards = []

    for zone_id in zone_ids:
        wards.extend(
            list_documents("wards", {"zone": zone_id})
        )

    ward_population = sum(
        ward.get("population", 0)
        for ward in wards
    )

    rainfall_values = [
        item.get("rainfall_mm", 0)
        for item in weather_events
        if item.get("rainfall_mm") is not None
    ]

    roads = list_documents("roads")

    constrained_roads = [
        road
        for road in roads
        if road.get("status") in {"RESTRICTED", "BLOCKED"}
    ]

    signal_count = (
        len(zones)
        + len(weather_events)
        + len(incident_reports)
        + len(constrained_roads)
        + len(wards)
    )

    recent_events = sorted(
        weather_events,
        key=lambda item: item.get("timestamp", ""),
        reverse=True,
    )[:10]

    return {
        "incident": incident,
        "zones": zones,
        "zone_count": len(zones),
        "total_population": sum(
            zone.get("population", 0)
            for zone in zones
        ),
        "weather_events": recent_events,
        "weather_summary": {
            "count": len(weather_events),
            "peak_rainfall_mm": max(rainfall_values, default=0),
            "avg_rainfall_mm": (
                round(sum(rainfall_values) / len(rainfall_values), 1)
                if rainfall_values
                else 0
            ),
            "warning_counts": {
                level: sum(
                    1
                    for item in weather_events
                    if item.get("warning") == level
                )
                for level in ("NORMAL", "WATCH", "SEVERE", "EXTREME")
            },
        },
        "incident_reports": incident_reports,
        "wards": wards,
        "ward_count": len(wards),
        "ward_population": ward_population,
        "signal_count": signal_count,
    }


def analyze_risk(incident_id: str) -> dict[str, Any]:
    """Compute a risk score and level from severity and zone flood data."""
    incident = _get_incident(incident_id)

    zones = _zone_facts(incident.get("affected_zones", []))

    severity_score = _SEVERITY_SCORE.get(incident.get("severity"), 50)

    max_flood = max(
        (zone.get("flood_level", 0) for zone in zones),
        default=0,
    )

    flood_boost = min(int(max_flood * 10), 30)

    score = min(severity_score + flood_boost, 100)

    drivers = [
        f"Incident severity is {incident.get('severity')}",
    ]

    if zones:
        drivers.append(
            f"{len(zones)} affected zone(s) with max flood level {max_flood}m"
        )

    high_risk_zones = [
        zone.get("id")
        for zone in zones
        if zone.get("risk_level") == "HIGH"
    ]

    if high_risk_zones:
        drivers.append(
            f"High-risk zones: {', '.join(high_risk_zones)}"
        )

    return {
        "score": score,
        "level": _risk_level(score),
        "drivers": drivers,
    }


def geospatial_roads(incident_id: str) -> dict[str, Any]:
    """Report road status affecting access to the incident zones."""
    incident = _get_incident(incident_id)

    roads = list_documents("roads")

    constrained = [
        road
        for road in roads
        if road.get("status") in {"RESTRICTED", "BLOCKED"}
    ]

    return {
        "total_roads": len(roads),
        "constrained_roads": len(constrained),
        "affected": [
            f"{road.get('name')} ({road.get('status')})"
            for road in constrained
        ],
        "incident_zones": incident.get("affected_zones", []),
    }


def assess_resources(incident_id: str) -> dict[str, Any]:
    """Summarize available shelters, hospitals, teams and supplies."""
    _get_incident(incident_id)

    shelters = list_documents("shelters")
    hospitals = list_documents("hospitals")
    teams = list_documents("teams")
    supplies = list_documents("supplies")

    available_shelters = [
        s for s in shelters if s.get("status") == "AVAILABLE"
    ]

    available_hospitals = [
        h for h in hospitals if h.get("status") == "OPERATIONAL"
    ]

    available_teams = [
        t for t in teams if t.get("status") == "AVAILABLE"
    ]

    supply_names = [s.get("name") for s in supplies]

    return {
        "shelters": len(available_shelters),
        "hospitals": len(available_hospitals),
        "teams": len(available_teams),
        "vehicles": len(list_documents("vehicles")),
        "supplies": supply_names,
    }


def recommend_response(incident_id: str) -> dict[str, Any]:
    """Produce three deterministic response plans for the incident."""
    incident = _get_incident(incident_id)

    risk = analyze_risk(incident_id)
    roads = geospatial_roads(incident_id)
    resources = assess_resources(incident_id)

    level = risk["level"]

    if level in {"HIGH", "CRITICAL"}:
        action = "EVACUATE"
        priority = level
        rationale = (
            f"High computed risk ({risk['score']}) from {incident.get('type')} "
            "requires immediate evacuation of affected zones."
        )
        steps = [
            "Issue evacuation order for all affected zones",
            f"Activate {resources['teams']} response team(s)",
            f"Route evacuees to {resources['shelters']} open shelter(s)",
        ]
    elif level == "MEDIUM":
        action = "MONITOR"
        priority = "MEDIUM"
        rationale = (
            "Moderate risk requires active monitoring and prepositioning "
            "of resources."
        )
        steps = [
            "Continue monitoring water levels hourly",
            "Preposition response teams near affected zones",
            "Keep hospitals on standby",
        ]
    else:
        action = "STAND_BY"
        priority = "LOW"
        rationale = (
            "Low risk; routine monitoring and readiness are sufficient."
        )
        steps = [
            "Maintain situational awareness",
            "Review resource readiness",
        ]

    if roads["constrained_roads"]:
        steps.append(
            f"Account for {roads['constrained_roads']} constrained road(s)"
        )

    options = _build_plan_options(
        incident=incident,
        risk=risk,
        roads=roads,
        resources=resources,
    )

    recommended = next(
        option for option in options if option["recommended"]
    )

    return {
        "action": recommended["action"],
        "priority": recommended["priority"],
        "rationale": recommended["rationale"],
        "steps": recommended["steps"],
        "confidence": recommended["confidence"],
        "options": options,
    }


def _build_plan_options(
    incident: dict[str, Any],
    risk: dict[str, Any],
    roads: dict[str, Any],
    resources: dict[str, Any],
) -> list[dict[str, Any]]:
    """Deterministically construct Plan A (Evacuation), Plan B
    (Infrastructure) and Plan C (Balanced, recommended)."""
    level = risk["level"]
    score = risk["score"]

    evacuate_confidence = min(78 + score // 8, 96)
    infrastructure_confidence = max(62, 96 - score // 5)
    balanced_confidence = max(evacuate_confidence - 4, infrastructure_confidence + 8, 87)

    zone_labels = ", ".join(
        incident.get("affected_zones", [])
    ) or "affected zones"

    plan_a = {
        "id": "A",
        "label": "Evacuation First",
        "action": "EVACUATE" if level in {"HIGH", "CRITICAL"} else "PREPARE",
        "priority": "HIGH" if level in {"HIGH", "CRITICAL"} else level,
        "confidence": evacuate_confidence,
        "recommended": False,
        "summary": (
            "Prioritize moving civilians out of affected zones "
            "before infrastructure work begins."
        ),
        "tradeoffs": [
            "Lowest civilian risk",
            "Highest resource consumption",
            f"Displaces population of {zone_labels}",
        ],
        "rationale": (
            f"Human safety first: evacuate {resources['shelters']} "
            f"open shelter(s) before conditions worsen."
        ),
        "steps": [
            "Open all available shelters",
            f"Dispatch {resources['teams']} team(s) to guide evacuation",
            "Hold infrastructure work until movement is complete",
        ],
    }

    plan_b = {
        "id": "B",
        "label": "Infrastructure First",
        "action": "SECURE" if level in {"HIGH", "CRITICAL"} else "MONITOR",
        "priority": "MEDIUM" if level in {"HIGH", "CRITICAL"} else level,
        "confidence": infrastructure_confidence,
        "recommended": False,
        "summary": (
            "Protect critical facilities and restore access "
            "before large-scale movement."
        ),
        "tradeoffs": [
            "Protects hospitals and critical facilities",
            "Higher civilian exposure",
            "Faster recovery of key roads",
        ],
        "rationale": (
            "Defend critical infrastructure so rescue capacity "
            "stays available longer."
        ),
        "steps": [
            "Secure hospital corridors first",
            f"Clear {roads['constrained_roads']} constrained road(s)",
            "Defer evacuation until corridors are safe",
        ],
    }

    plan_c = {
        "id": "C",
        "label": "Balanced",
        "action": action_for_level(level),
        "priority": "HIGH" if level in {"HIGH", "CRITICAL"} else level,
        "confidence": balanced_confidence,
        "recommended": True,
        "summary": (
            "Pair evacuation of the highest-risk zones with "
            "infrastructure protection elsewhere."
        ),
        "tradeoffs": [
            "Balances civilian risk and resource use",
            "Keeps critical facilities operational",
            "Requires tighter coordination",
        ],
        "rationale": (
            "Recommended: sequence evacuation and infrastructure "
            f"work to manage risk {score}/100 efficiently."
        ),
        "steps": [
            "Evacuate highest-risk zones first",
            "Simultaneously protect critical facilities",
            f"Use {resources['teams']} team(s) across both tracks",
        ],
    }

    return [plan_a, plan_b, plan_c]


def action_for_level(level: str) -> str:
    if level in {"HIGH", "CRITICAL"}:
        return "EVACUATE"

    if level == "MEDIUM":
        return "MONITOR"

    return "STAND_BY"


def simulate_scenario(
    incident_id: str,
    scenario_name: str,
    mutations_json: str,
) -> dict[str, Any]:
    """Evaluate a what-if scenario against an isolated snapshot.

    Applies the given mutations to a copy of the store and recomputes
    the analysis. Never mutates real data. Deterministic.
    """
    from app.scenarios.engine import compute_scenario_result
    from app.scenarios.schemas import ScenarioMutations

    mutations = ScenarioMutations.model_validate_json(mutations_json)

    result = compute_scenario_result(
        incident_id,
        mutations,
        scenario_name=scenario_name,
    )

    return result.model_dump(mode="json")
