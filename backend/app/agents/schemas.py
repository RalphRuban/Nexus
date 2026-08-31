from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AgentStep(BaseModel):
    agent: str
    status: Literal["RUNNING", "COMPLETED", "ERROR"]
    summary: str
    timestamp: datetime


class RiskAssessment(BaseModel):
    score: int
    level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    drivers: list[str]


class ResourceRecommendation(BaseModel):
    shelters: int
    hospitals: int
    teams: int
    vehicles: int
    supplies: list[str]


class PlanOption(BaseModel):
    id: Literal["A", "B", "C"]
    label: str
    summary: str
    tradeoffs: list[str]
    recommended: bool = False
    confidence: int
    steps: list[str]


class DecisionRecommendation(BaseModel):
    action: str
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    rationale: str
    steps: list[str]
    confidence: int
    options: list[PlanOption]


class AgentAnalysis(BaseModel):
    incident_id: str
    summary: str
    risk: RiskAssessment
    roads_affected: list[str]
    resources: ResourceRecommendation
    recommendation: DecisionRecommendation
    confidence: int
    steps: list[AgentStep]
    mode: Literal["deterministic", "llm"]
    completed_at: datetime


class AgentDescriptor(BaseModel):
    id: str
    name: str
    role: str
    status: Literal["REGISTERED", "ACTIVE", "STANDBY"]
    capabilities: list[str]
    policy: str
    invoked: int
    last_seen: str | None = None


class TraceSpan(BaseModel):
    agent: str
    tool: str | None = None
    status: Literal["RUNNING", "COMPLETED", "ERROR"]
    duration_ms: float


class TraceRecord(BaseModel):
    id: str
    incident_id: str
    mode: str
    status: str
    requested_by: str
    total_ms: float
    spans: list[TraceSpan]
    completed_at: str
