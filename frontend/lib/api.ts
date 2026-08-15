import type {
  ActivityLog,
  Hospital,
  Incident,
  Road,
  Shelter,
  Supply,
  Team,
  Vehicle,
  Zone,
} from "@/types/nexus";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export const api = {
  getIncidents: () =>
    request<Incident[]>("/incidents"),

  getIncident: (id: string) =>
    request<Incident>(`/incidents/${id}`),

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

  getActivity: () =>
    request<ActivityLog[]>("/activity"),
};