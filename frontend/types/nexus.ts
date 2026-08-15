export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus =
  | "ACTIVE"
  | "MONITORING"
  | "RESOLVED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  location: Location;
  affected_zones: string[];
  affected_population: number;
  detected_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  risk_level: RiskLevel;
  population: number;
  flood_level: number;
  coordinates: [number, number][];
}

export interface Road {
  id: string;
  name: string;
  status: "OPEN" | "RESTRICTED" | "BLOCKED";
  risk_level: RiskLevel;
  coordinates: [number, number][];
}

export interface Shelter {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: "AVAILABLE" | "FULL" | "CLOSED";
  location: Location;
}

export interface Hospital {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: "OPERATIONAL" | "LIMITED" | "CLOSED";
  location: Location;
}

export interface Team {
  id: string;
  name: string;
  status: "AVAILABLE" | "DEPLOYED" | "UNAVAILABLE";
  personnel: number;
  vehicles: number;
  current_zone: string | null;
}

export interface Vehicle {
  id: string;
  type: string;
  status: "AVAILABLE" | "DEPLOYED" | "MAINTENANCE";
  team_id: string | null;
  location: Location;
}

export interface Supply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}