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

export interface AgentStep {
  agent: string;
  status: "RUNNING" | "COMPLETED" | "ERROR";
  summary: string;
  timestamp: string;
}

export interface RiskAssessment {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  drivers: string[];
}

export interface ResourceRecommendation {
  shelters: number;
  hospitals: number;
  teams: number;
  vehicles: number;
  supplies: string[];
}

export interface PlanOption {
  id: "A" | "B" | "C";
  label: string;
  summary: string;
  tradeoffs: string[];
  recommended: boolean;
  confidence: number;
  steps: string[];
}

export interface DecisionRecommendation {
  action: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  rationale: string;
  steps: string[];
  confidence: number;
  options: PlanOption[];
}

export interface AgentAnalysis {
  incident_id: string;
  summary: string;
  risk: RiskAssessment;
  roads_affected: string[];
  resources: ResourceRecommendation;
  recommendation: DecisionRecommendation;
  confidence: number;
  steps: AgentStep[];
  mode: "deterministic" | "llm";
  completed_at: string;
}

export interface ApprovedPlan {
  id: string;
  incident_id: string;
  plan_id: "A" | "B" | "C";
  label: string;
  approved_at: string;
  status: "APPROVED";
}

export interface WeatherEvent {
  id: string;
  zone: string;
  type: string;
  value?: number;
  rainfall_mm?: number;
  unit: string;
  temp_min?: number;
  temp_max?: number;
  wind_max?: number;
  humidity_mean?: number;
  warning: string;
  hourly_precipitation?: number[];
  hourly_temperature?: number[];
  hourly_humidity?: number[];
  hourly_wind?: number[];
  hourly_pressure?: number[];
  source?: string;
  timestamp: string;
}

export interface Ward {
  id: string;
  ward_number: number;
  name: string;
  zone: string;
  population: number;
  literacy_pct: number;
  sex_ratio: number;
  source: string;
}

export interface IncidentReport {
  id: string;
  zone: string;
  source: string;
  summary: string;
  severity: Severity;
  timestamp: string;
}

export interface ZoneMutation {
  id: string;
  flood_level?: number;
  risk_level?: RiskLevel;
  population?: number;
}

export interface RoadMutation {
  id: string;
  status?: "OPEN" | "RESTRICTED" | "BLOCKED";
  risk_level?: RiskLevel;
}

export interface HospitalMutation {
  id: string;
  status?: "OPERATIONAL" | "LIMITED" | "CLOSED";
}

export interface IncidentMutation {
  severity?: Severity;
  status?: IncidentStatus;
  affected_population?: number;
  affected_zones?: string[];
  description?: string;
}

export interface ScenarioMutations {
  zones: ZoneMutation[];
  roads: RoadMutation[];
  hospitals: HospitalMutation[];
  incident?: IncidentMutation | null;
}

export interface ScenarioParamSpec {
  key: string;
  label: string;
  type: "range" | "toggle";
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean;
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  params: ScenarioParamSpec[];
  mutations: ScenarioMutations;
}

export interface Scenario {
  id: string;
  name: string;
  incident_id: string;
  description: string;
  template: string | null;
  mutations: ScenarioMutations;
  baseline: AgentAnalysis;
  result: AgentAnalysis;
  created_at: string;
}

export interface ExtractedIncident {
  title: string;
  type: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  location: Location;
  affected_zones: string[];
  affected_population: number;
}

export interface VisionExtraction {
  mode: "deterministic" | "llm";
  confidence: number;
  notes: string[];
  incident: ExtractedIncident;
}

export interface AgentDescriptor {
  id: string;
  name: string;
  role: string;
  status: "REGISTERED" | "ACTIVE" | "STANDBY";
  capabilities: string[];
  policy: string;
  invoked: number;
  last_seen: string | null;
}

export interface TraceSpan {
  agent: string;
  tool: string | null;
  status: "RUNNING" | "COMPLETED" | "ERROR";
  duration_ms: number;
}

export interface TraceRecord {
  id: string;
  incident_id: string;
  mode: "deterministic" | "llm";
  status: string;
  requested_by: string;
  total_ms: number;
  spans: TraceSpan[];
  completed_at: string;
}