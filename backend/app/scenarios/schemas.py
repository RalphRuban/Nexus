from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.agents.schemas import AgentAnalysis


class ZoneMutation(BaseModel):
    id: str
    flood_level: float | None = None
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] | None = None
    population: int | None = None


class RoadMutation(BaseModel):
    id: str
    status: Literal["OPEN", "RESTRICTED", "BLOCKED"] | None = None
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] | None = None


class HospitalMutation(BaseModel):
    id: str
    status: Literal["OPERATIONAL", "LIMITED", "CLOSED"] | None = None


class IncidentMutation(BaseModel):
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] | None = None
    status: Literal["ACTIVE", "MONITORING", "RESOLVED"] | None = None
    affected_population: int | None = None
    affected_zones: list[str] | None = None
    description: str | None = None


class ScenarioMutations(BaseModel):
    zones: list[ZoneMutation] = []
    roads: list[RoadMutation] = []
    hospitals: list[HospitalMutation] = []
    incident: IncidentMutation | None = None


class ScenarioCreate(BaseModel):
    name: str
    incident_id: str
    description: str = ""
    template: str | None = None
    mutations: ScenarioMutations


class Scenario(BaseModel):
    id: str
    name: str
    incident_id: str
    description: str = ""
    template: str | None = None
    mutations: ScenarioMutations
    baseline: AgentAnalysis
    result: AgentAnalysis
    created_at: datetime