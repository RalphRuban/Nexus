"""Lightweight in-memory seed data for hosts with a tight memory budget.

Render's free plan allows ~512 MB of RAM. The full ``real_data`` seed
(~3,660 weather records, ~9.9 MB source, several hundred MB in memory)
overflows that budget and OOM-crashes the worker. This module provides a
compact, realistically-shaped dataset that fits comfortably inside 512 MB
so the app can keep serving offline (e.g. when the Firestore free tier
has exhausted its daily quota) without crashing.

The collections mirror the schema used by ``app.data.mock_data`` with a
smaller weather/ward corpus. Everything else (incidents, resources, etc.)
is unchanged from the full seed so the dashboard behaves identically.
"""

from datetime import datetime, timedelta, timezone

_ZONE_IDS = [
    "ZONE-N01",
    "ZONE-N02",
    "ZONE-N03",
    "ZONE-C01",
    "ZONE-S01",
    "ZONE-E01",
    "ZONE-W01",
]

_ZONES = [
    {
        "id": "ZONE-N01",
        "name": "North River District",
        "risk_level": "HIGH",
        "population": 8200,
        "flood_level": 1.8,
        "coordinates": [
            [12.991, 77.590],
            [12.994, 77.601],
            [12.985, 77.605],
            [12.982, 77.592],
        ],
    },
    {
        "id": "ZONE-N02",
        "name": "North Industrial Area",
        "risk_level": "HIGH",
        "population": 6100,
        "flood_level": 1.4,
        "coordinates": [
            [12.985, 77.605],
            [12.994, 77.615],
            [12.984, 77.620],
            [12.975, 77.608],
        ],
    },
    {
        "id": "ZONE-N03",
        "name": "Northern Residential Zone",
        "risk_level": "MEDIUM",
        "population": 4120,
        "flood_level": 0.9,
        "coordinates": [
            [12.982, 77.592],
            [12.985, 77.605],
            [12.975, 77.608],
            [12.970, 77.596],
        ],
    },
    {
        "id": "ZONE-C01",
        "name": "Central River Corridor",
        "risk_level": "MEDIUM",
        "population": 5200,
        "flood_level": 0.7,
        "coordinates": [
            [12.975, 77.608],
            [12.985, 77.620],
            [12.970, 77.625],
            [12.965, 77.610],
        ],
    },
    {
        "id": "ZONE-S01",
        "name": "Southern District",
        "risk_level": "LOW",
        "population": 1800,
        "flood_level": 0.3,
        "coordinates": [
            [12.950, 77.595],
            [12.960, 77.605],
            [12.950, 77.615],
            [12.940, 77.605],
        ],
    },
    {
        "id": "ZONE-E01",
        "name": "Eastern Relief Zone",
        "risk_level": "MEDIUM",
        "population": 3600,
        "flood_level": 0.5,
        "coordinates": [
            [12.985, 77.625],
            [12.995, 77.630],
            [12.988, 77.640],
            [12.975, 77.632],
        ],
    },
    {
        "id": "ZONE-W01",
        "name": "Western Suburb",
        "risk_level": "LOW",
        "population": 2900,
        "flood_level": 0.2,
        "coordinates": [
            [12.960, 77.575],
            [12.970, 77.580],
            [12.962, 77.590],
            [12.952, 77.582],
        ],
    },
]

INCIDENTS = [
    {
        "id": "INC-001",
        "title": "Northern District Flooding",
        "type": "FLOOD",
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": (
            "Heavy rainfall has caused flooding across three northern zones."
        ),
        "location": {"latitude": 12.985, "longitude": 77.595},
        "affected_zones": ["ZONE-N01", "ZONE-N02", "ZONE-N03"],
        "affected_population": 18420,
        "detected_at": "2026-08-15T18:30:00+00:00",
        "updated_at": "2026-08-15T18:45:00+00:00",
    },
    {
        "id": "INC-002",
        "title": "River Water Level Alert",
        "type": "FLOOD",
        "severity": "MEDIUM",
        "status": "MONITORING",
        "description": "River water levels are approaching the warning threshold.",
        "location": {"latitude": 12.975, "longitude": 77.610},
        "affected_zones": ["ZONE-C01"],
        "affected_population": 5200,
        "detected_at": "2026-08-15T17:50:00+00:00",
        "updated_at": "2026-08-15T18:40:00+00:00",
    },
    {
        "id": "INC-003",
        "title": "Southern Drainage Overflow",
        "type": "FLOOD",
        "severity": "LOW",
        "status": "MONITORING",
        "description": "Localized drainage overflow reported in the southern zone.",
        "location": {"latitude": 12.950, "longitude": 77.600},
        "affected_zones": ["ZONE-S01"],
        "affected_population": 1800,
        "detected_at": "2026-08-15T18:05:00+00:00",
        "updated_at": "2026-08-15T18:35:00+00:00",
    },
]

ZONES = _ZONES

ROADS = [
    {
        "id": "ROAD-R01",
        "name": "Northern Ring Road",
        "status": "OPEN",
        "risk_level": "MEDIUM",
        "coordinates": [[12.998, 77.580], [12.990, 77.610]],
    },
    {
        "id": "ROAD-R02",
        "name": "River Bridge Road",
        "status": "RESTRICTED",
        "risk_level": "HIGH",
        "coordinates": [[12.990, 77.610], [12.975, 77.620]],
    },
    {
        "id": "ROAD-R03",
        "name": "Hospital Corridor",
        "status": "OPEN",
        "risk_level": "MEDIUM",
        "coordinates": [[12.975, 77.620], [12.960, 77.610]],
    },
    {
        "id": "ROAD-R04",
        "name": "Industrial Link",
        "status": "BLOCKED",
        "risk_level": "HIGH",
        "coordinates": [[12.985, 77.605], [12.975, 77.625]],
    },
    {
        "id": "ROAD-R05",
        "name": "Northern Access Road",
        "status": "OPEN",
        "risk_level": "LOW",
        "coordinates": [[12.994, 77.601], [13.005, 77.615]],
    },
    {
        "id": "ROAD-R06",
        "name": "Central Connector",
        "status": "OPEN",
        "risk_level": "LOW",
        "coordinates": [[12.975, 77.608], [12.965, 77.610]],
    },
]

SHELTERS = [
    {
        "id": "SHELTER-01",
        "name": "North Community Center",
        "capacity": 2500,
        "occupied": 740,
        "status": "AVAILABLE",
        "location": {"latitude": 12.997, "longitude": 77.615},
    },
    {
        "id": "SHELTER-02",
        "name": "Central Sports Complex",
        "capacity": 3000,
        "occupied": 1200,
        "status": "AVAILABLE",
        "location": {"latitude": 12.970, "longitude": 77.625},
    },
    {
        "id": "SHELTER-03",
        "name": "South Relief Center",
        "capacity": 1800,
        "occupied": 1650,
        "status": "AVAILABLE",
        "location": {"latitude": 12.945, "longitude": 77.610},
    },
]

HOSPITALS = [
    {
        "id": "HOSPITAL-01",
        "name": "District General Hospital",
        "capacity": 500,
        "occupied": 310,
        "status": "OPERATIONAL",
        "location": {"latitude": 12.978, "longitude": 77.612},
    },
    {
        "id": "HOSPITAL-02",
        "name": "North Emergency Hospital",
        "capacity": 300,
        "occupied": 220,
        "status": "LIMITED",
        "location": {"latitude": 12.998, "longitude": 77.600},
    },
    {
        "id": "HOSPITAL-03",
        "name": "South Medical Center",
        "capacity": 250,
        "occupied": 100,
        "status": "OPERATIONAL",
        "location": {"latitude": 12.950, "longitude": 77.610},
    },
]

TEAMS = [
    {
        "id": "TEAM-A",
        "name": "Response Team Alpha",
        "status": "AVAILABLE",
        "personnel": 12,
        "vehicles": 3,
        "current_zone": None,
    },
    {
        "id": "TEAM-B",
        "name": "Response Team Bravo",
        "status": "AVAILABLE",
        "personnel": 10,
        "vehicles": 3,
        "current_zone": None,
    },
    {
        "id": "TEAM-C",
        "name": "Response Team Charlie",
        "status": "AVAILABLE",
        "personnel": 8,
        "vehicles": 2,
        "current_zone": None,
    },
]

VEHICLES = [
    {
        "id": "VEH-001",
        "type": "Rescue Truck",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.980, "longitude": 77.590},
    },
    {
        "id": "VEH-002",
        "type": "Rescue Truck",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.985, "longitude": 77.600},
    },
    {
        "id": "VEH-003",
        "type": "Medical Vehicle",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.975, "longitude": 77.610},
    },
    {
        "id": "VEH-004",
        "type": "Supply Truck",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.960, "longitude": 77.610},
    },
    {
        "id": "VEH-005",
        "type": "Rescue Truck",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.950, "longitude": 77.605},
    },
    {
        "id": "VEH-006",
        "type": "Ambulance",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.978, "longitude": 77.612},
    },
    {
        "id": "VEH-007",
        "type": "Utility Vehicle",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.990, "longitude": 77.590},
    },
    {
        "id": "VEH-008",
        "type": "Supply Truck",
        "status": "AVAILABLE",
        "team_id": None,
        "location": {"latitude": 12.965, "longitude": 77.610},
    },
]

SUPPLIES = [
    {
        "id": "SUP-001",
        "name": "Emergency Kits",
        "quantity": 450,
        "unit": "kits",
        "location": "Central Warehouse",
    },
    {
        "id": "SUP-002",
        "name": "Drinking Water",
        "quantity": 3200,
        "unit": "liters",
        "location": "Central Warehouse",
    },
    {
        "id": "SUP-003",
        "name": "Emergency Blankets",
        "quantity": 900,
        "unit": "units",
        "location": "North Warehouse",
    },
]


# ---------------------------------------------------------------------------
# Compact weather + ward corpus (generated, kept small for low memory).
# ---------------------------------------------------------------------------

_NOW = datetime(2026, 8, 15, 19, 0, 0, tzinfo=timezone.utc)


def _build_weather(count: int = 240) -> list:
    base = _NOW
    events = []
    for i in range(count):
        ts = base - timedelta(hours=i % 72, minutes=(i * 17) % 60)
        events.append(
            {
                "id": f"WEATHER-W{i + 1:04d}",
                "zone": _ZONE_IDS[i % len(_ZONE_IDS)],
                "type": "RAINFALL" if i % 3 == 0 else "TEMPERATURE",
                "value": round((10 + (i % 5) * 3.5) + (i % 4) * 0.7, 1),
                "unit": "mm" if i % 3 == 0 else "C",
                "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            }
        )
    return events


def _build_wards(count: int = 60) -> list:
    stations = _ZONES
    wards = []
    for i in range(count):
        zone = stations[i % len(stations)]
        wards.append(
            {
                "id": f"WARD-{i + 1:03d}",
                "name": f"Ward {i + 1} - {zone['name']}",
                "zone": zone["id"],
                "population": 1800 + (i * 137) % 5200,
                "literacy": round(72 + (i * 7) % 26, 1),
                "sex_ratio": round(930 + (i * 11) % 90, 1),
                "coordinates": zone["coordinates"],
            }
        )
    return wards


WEATHER_EVENTS = _build_weather()
WARDS = _build_wards()

INCIDENT_REPORTS = [
    {
        "id": "RPT-001",
        "zone": "ZONE-N01",
        "source": "Field Unit 4",
        "summary": "Water rising rapidly on North River District residential streets.",
        "severity": "HIGH",
        "timestamp": "2026-08-15T18:32:00+00:00",
    },
    {
        "id": "RPT-002",
        "zone": "ZONE-N02",
        "source": "Automated Sensor",
        "summary": "Industrial Link reported impassable after drainage failure.",
        "severity": "MEDIUM",
        "timestamp": "2026-08-15T18:38:00+00:00",
    },
    {
        "id": "RPT-003",
        "zone": "ZONE-N03",
        "source": "Citizen Report",
        "summary": "Downed power lines reported near Northern Residential Zone.",
        "severity": "MEDIUM",
        "timestamp": "2026-08-15T18:40:00+00:00",
    },
]

ACTIVITY = [
    {
        "id": "LOG-001",
        "timestamp": "2026-08-15T18:41:02+00:00",
        "actor": "SYSTEM",
        "message": "Incident INC-001 created",
        "severity": "INFO",
    },
    {
        "id": "LOG-002",
        "timestamp": "2026-08-15T18:41:04+00:00",
        "actor": "SYSTEM",
        "message": "Three affected zones identified",
        "severity": "WARNING",
    },
    {
        "id": "LOG-003",
        "timestamp": "2026-08-15T18:41:06+00:00",
        "actor": "SYSTEM",
        "message": "Road constraints loaded",
        "severity": "WARNING",
    },
    {
        "id": "LOG-004",
        "timestamp": "2026-08-15T18:41:08+00:00",
        "actor": "SYSTEM",
        "message": "Response resources available for allocation",
        "severity": "INFO",
    },
]

SCENARIOS = []
