import type {
  ActivityLog,
  AgentAnalysis,
  AgentDescriptor,
  ApprovedPlan,
  Hospital,
  Incident,
  IncidentReport,
  Road,
  Scenario,
  ScenarioMutations,
  ScenarioPreset,
  Shelter,
  Supply,
  Team,
  TraceRecord,
  Vehicle,
  VisionExtraction,
  Ward,
  WeatherEvent,
  Zone,
} from "@/types/nexus";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface IncidentFilters {
  severity?: string;
  status?: string;
  type?: string;
}

export interface IncidentPayload {
  title: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  location: { latitude: number; longitude: number };
  affected_zones: string[];
  affected_population: number;
}

export interface IncidentUpdate {
  title?: string;
  type?: string;
  severity?: string;
  status?: string;
  description?: string;
  location?: { latitude: number; longitude: number };
  affected_zones?: string[];
  affected_population?: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function toQueryString(filters: IncidentFilters): string {
  const params = new URLSearchParams();

  if (filters.severity) params.set("severity", filters.severity);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);

  const query = params.toString();

  return query ? `?${query}` : "";
}

export const api = {
  getIncidents: (filters: IncidentFilters = {}) =>
    request<Incident[]>(`/incidents${toQueryString(filters)}`),

  getIncident: (id: string) =>
    request<Incident>(`/incidents/${id}`),

  createIncident: (payload: IncidentPayload) =>
    request<Incident>("/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateIncident: (id: string, payload: IncidentUpdate) =>
    request<Incident>(`/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteIncident: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/incidents/${id}`, {
      method: "DELETE",
    }),

  getZones: () =>
    request<Zone[]>("/zones"),

  getRoads: () =>
    request<Road[]>("/roads"),

  getShelters: () =>
    request<Shelter[]>("/shelters"),

  getHospitals: () =>
    request<Hospital[]>("/hospitals"),

  getTeams: () =>
    request<Team[]>("/teams"),

  getVehicles: () =>
    request<Vehicle[]>("/vehicles"),

  getSupplies: () =>
    request<Supply[]>("/supplies"),

  getWeather: (params?: {
    zone?: string;
    limit?: number;
    date?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.zone) search.set("zone", params.zone);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.date) search.set("date", params.date);
    const qs = search.toString();
    return request<WeatherEvent[]>(qs ? `/weather?${qs}` : "/weather");
  },

  getWards: (params?: { zone?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.zone) search.set("zone", params.zone);
    if (params?.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<Ward[]>(qs ? `/wards?${qs}` : "/wards");
  },

  getReports: () =>
    request<IncidentReport[]>("/reports"),

  getActivity: () =>
    request<ActivityLog[]>("/activity"),

  getPlans: (incidentId?: string) =>
    request<ApprovedPlan[]>(
      incidentId
        ? `/plans?incident_id=${encodeURIComponent(incidentId)}`
        : "/plans"
    ),

  approvePlan: (incidentId: string, planId: string) =>
    request<ApprovedPlan>(
      `/incidents/${incidentId}/plans/${planId}/approve`,
      {
        method: "POST",
      }
    ),

  resetData: () =>
    request<{ reset: boolean; documents: number }>("/reset", {
      method: "POST",
    }),

  analyzeIncident: (id: string) =>
    request<AgentAnalysis>(`/agents/analyze/${id}`, {
      method: "POST",
    }),

  getAgentActivity: () =>
    request<ActivityLog[]>("/agents/activity"),

  getAgents: () =>
    request<AgentDescriptor[]>("/agents"),

  getAgentTraces: (limit = 20) =>
    request<TraceRecord[]>(`/agents/traces?limit=${limit}`),

  getScenarioPresets: (incidentId: string) =>
    request<ScenarioPreset[]>(
      `/scenarios/presets?incident_id=${encodeURIComponent(incidentId)}`
    ),

  createScenario: (payload: {
    name: string;
    incident_id: string;
    description: string;
    template: string | null;
    mutations: ScenarioMutations;
  }) =>
    request<Scenario>("/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getScenarios: () =>
    request<Scenario[]>("/scenarios"),

  getScenario: (id: string) =>
    request<Scenario>(`/scenarios/${id}`),

  deleteScenario: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/scenarios/${id}`, {
      method: "DELETE",
    }),

  extractImage: (file: File) => {
    const formData = new FormData();

    formData.append("file", file);

    return fetch(`${API_URL}/vision/extract`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as VisionExtraction;
    });
  },
};