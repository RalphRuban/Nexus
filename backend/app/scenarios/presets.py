from typing import Any, Callable, Dict, List

from app.scenarios.schemas import (
    HospitalMutation,
    IncidentMutation,
    RoadMutation,
    ScenarioMutations,
    ZoneMutation,
)
from app.services.firestore import list_documents


def _get_incident(incident_id: str) -> dict[str, Any]:
    incidents = [
        item
        for item in list_documents("incidents")
        if item.get("id") == incident_id
    ]

    if not incidents:
        raise LookupError(f"Incident {incident_id} not found")

    return incidents[0]


def _affected_zone_ids(incident: dict[str, Any]) -> list[str]:
    return incident.get("affected_zones", [])


def _zone_by_id(zone_id: str):
    zones = list_documents("zones", {"id": zone_id})

    return zones[0] if zones else None


def _build_flood_rise(incident_id: str) -> ScenarioMutations:
    incident = _get_incident(incident_id)

    zone_mutations = []

    for zone_id in _affected_zone_ids(incident):
        zone = _zone_by_id(zone_id)

        if zone is None:
            continue

        base = float(zone.get("flood_level", 0))

        zone_mutations.append(
            ZoneMutation(
                id=zone_id,
                flood_level=round(base + 1.0, 2),
            )
        )

    return ScenarioMutations(zones=zone_mutations)


def _build_road_closure(incident_id: str) -> ScenarioMutations:
    _get_incident(incident_id)

    roads = list_documents("roads")

    target = [
        road
        for road in roads
        if road.get("status") in {"RESTRICTED", "BLOCKED"}
        or road.get("risk_level") == "HIGH"
    ]

    road_mutations = [
        RoadMutation(
            id=road["id"],
            status="BLOCKED",
        )
        for road in target
    ]

    return ScenarioMutations(roads=road_mutations)


def _build_hospital_overload(incident_id: str) -> ScenarioMutations:
    _get_incident(incident_id)

    hospitals = list_documents("hospitals")

    target = [
        hospital
        for hospital in hospitals
        if hospital.get("status") in {"OPERATIONAL", "LIMITED"}
    ]

    hospital_mutations = [
        HospitalMutation(
            id=hospital["id"],
            status="LIMITED",
        )
        for hospital in target
    ]

    return ScenarioMutations(hospitals=hospital_mutations)


def _build_population_influx(incident_id: str) -> ScenarioMutations:
    incident = _get_incident(incident_id)

    base_population = int(incident.get("affected_population", 0))

    return ScenarioMutations(
        incident=IncidentMutation(
            affected_population=int(base_population * 1.5),
        )
    )


def _build_combined(incident_id: str) -> ScenarioMutations:
    flood = _build_flood_rise(incident_id)
    roads = _build_road_closure(incident_id)
    hospitals = _build_hospital_overload(incident_id)
    population = _build_population_influx(incident_id)

    return ScenarioMutations(
        zones=flood.zones,
        roads=roads.roads,
        hospitals=hospitals.hospitals,
        incident=population.incident,
    )


class Preset:
    def __init__(
        self,
        preset_id: str,
        label: str,
        description: str,
        params: List[Dict[str, Any]],
        build: Callable[[str], ScenarioMutations],
    ):
        self.id = preset_id
        self.label = label
        self.description = description
        self.params = params
        self._build = build

    def build_mutations(self, incident_id: str) -> ScenarioMutations:
        return self._build(incident_id)

    def to_dict(self, incident_id: str) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "description": self.description,
            "params": self.params,
            "mutations": self.build_mutations(incident_id).model_dump(),
        }


PRESETS: List[Preset] = [
    Preset(
        preset_id="flood_rise",
        label="Flood level rises",
        description=(
            "Raise flood levels across the affected zones by a configurable "
            "amount to model worsening water levels."
        ),
        params=[
            {
                "key": "flood_delta",
                "label": "Flood level increase (m)",
                "type": "range",
                "min": 0.0,
                "max": 3.0,
                "step": 0.1,
                "default": 1.0,
            }
        ],
        build=_build_flood_rise,
    ),
    Preset(
        preset_id="road_closure",
        label="Key roads blocked",
        description=(
            "Simulate critical route closures by blocking restricted or "
            "high-risk roads around the incident."
        ),
        params=[
            {
                "key": "include_high_risk",
                "label": "Include high-risk roads",
                "type": "toggle",
                "default": True,
            }
        ],
        build=_build_road_closure,
    ),
    Preset(
        preset_id="hospital_overload",
        label="Hospitals overloaded",
        description=(
            "Reduce hospital capacity by switching facilities to LIMITED "
            "status, modeling an overloaded medical response."
        ),
        params=[
            {
                "key": "limit_all",
                "label": "Limit all operational hospitals",
                "type": "toggle",
                "default": True,
            }
        ],
        build=_build_hospital_overload,
    ),
    Preset(
        preset_id="population_influx",
        label="Population influx",
        description=(
            "Increase the number of people affected by the incident, "
            "straining evacuation and shelter capacity."
        ),
        params=[
            {
                "key": "population_multiplier",
                "label": "Affected population multiplier",
                "type": "range",
                "min": 1.0,
                "max": 3.0,
                "step": 0.1,
                "default": 1.5,
            }
        ],
        build=_build_population_influx,
    ),
    Preset(
        preset_id="combined_worst_case",
        label="Combined worst case",
        description=(
            "Apply flooding, road closures, hospital overload and a "
            "population surge all at once."
        ),
        params=[
            {
                "key": "flood_delta",
                "label": "Flood level increase (m)",
                "type": "range",
                "min": 0.0,
                "max": 3.0,
                "step": 0.1,
                "default": 1.0,
            },
            {
                "key": "population_multiplier",
                "label": "Affected population multiplier",
                "type": "range",
                "min": 1.0,
                "max": 3.0,
                "step": 0.1,
                "default": 1.5,
            },
        ],
        build=_build_combined,
    ),
]


def get_presets(incident_id: str) -> List[Dict[str, Any]]:
    return [preset.to_dict(incident_id) for preset in PRESETS]