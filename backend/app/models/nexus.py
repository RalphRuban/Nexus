from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Location(BaseModel):
    latitude: float
    longitude: float


class Incident(BaseModel):
    id: str
    title: str
    type: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    status: Literal["ACTIVE", "MONITORING", "RESOLVED"]
    description: str
    location: Location
    affected_zones: list[str]
    affected_population: int
    detected_at: datetime
    updated_at: datetime


class Zone(BaseModel):
    id: str
    name: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    population: int
    flood_level: float
    coordinates: list[list[float]]


class Road(BaseModel):
    id: str
    name: str
    status: Literal["OPEN", "RESTRICTED", "BLOCKED"]
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    coordinates: list[list[float]]


class Shelter(BaseModel):
    id: str
    name: str
    capacity: int
    occupied: int
    status: Literal["AVAILABLE", "FULL", "CLOSED"]
    location: Location


class Hospital(BaseModel):
    id: str
    name: str
    capacity: int
    occupied: int
    status: Literal["OPERATIONAL", "LIMITED", "CLOSED"]
    location: Location


class Team(BaseModel):
    id: str
    name: str
    status: Literal["AVAILABLE", "DEPLOYED", "UNAVAILABLE"]
    personnel: int
    vehicles: int
    current_zone: str | None


class Vehicle(BaseModel):
    id: str
    type: str
    status: Literal["AVAILABLE", "DEPLOYED", "MAINTENANCE"]
    team_id: str | None
    location: Location


class Supply(BaseModel):
    id: str
    name: str
    quantity: int
    unit: str
    location: str


class ActivityLog(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    message: str
    severity: Literal["INFO", "WARNING", "CRITICAL"]