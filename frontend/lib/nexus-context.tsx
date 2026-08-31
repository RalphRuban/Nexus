"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToast } from "@/components/ui/Toast";

import { api, IncidentFilters, IncidentPayload } from "@/lib/api";

import {
  ActivityLog,
  AgentAnalysis,
  Hospital,
  Incident,
  IncidentReport,
  Road,
  Scenario,
  Shelter,
  Supply,
  Team,
  Vehicle,
  Ward,
  WeatherEvent,
  Zone,
} from "@/types/nexus";

const POLL_INTERVAL_MS = 4000;

interface NexusContextValue {
  incidents: Incident[];
  zones: Zone[];
  roads: Road[];
  shelters: Shelter[];
  hospitals: Hospital[];
  teams: Team[];
  vehicles: Vehicle[];
  supplies: Supply[];
  activity: ActivityLog[];
  weather: WeatherEvent[];
  reports: IncidentReport[];
  wards: Ward[];
  selectedIncident: Incident | null;
  selectedAnalysis: AgentAnalysis | null;
  simulatedZoneIds: string[];
  simulatedRoadIds: string[];
  filters: IncidentFilters;
  loading: boolean;
  error: string | null;
  isPolling: boolean;
  modalOpen: boolean;
  editingIncident: Incident | null;
  saving: boolean;
  selectIncident: (id: string) => void;
  setAnalysis: (analysis: AgentAnalysis | null) => void;
  setSimulatedZones: (zoneIds: string[]) => void;
  setSimulatedRoads: (roadIds: string[]) => void;
  applyScenario: (scenario: Scenario) => void;
  handleFilterChange: (filters: IncidentFilters) => void;
  openCreate: () => void;
  openEdit: (incident: Incident) => void;
  closeModal: () => void;
  handleSubmit: (payload: IncidentPayload) => Promise<void>;
  handleDelete: (incident: Incident) => Promise<void>;
  handleReset: () => Promise<void>;
  retry: () => void;
  refresh: () => Promise<void>;
}

const NexusContext = createContext<NexusContextValue | null>(null);

export function NexusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [weather, setWeather] = useState<WeatherEvent[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AgentAnalysis | null>(null);

  const [simulatedZoneIds, setSimulatedZoneIds] = useState<string[]>([]);
  const [simulatedRoadIds, setSimulatedRoadIds] = useState<string[]>([]);

  const [filters, setFilters] = useState<IncidentFilters>({});

  const [selectedIncidentId, setSelectedIncidentId] = useState<
    string | null
  >(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] =
    useState<Incident | null>(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const loadAll = useCallback(async () => {
    try {
      const [
        incidentData,
        zoneData,
        roadData,
        shelterData,
        hospitalData,
        teamData,
        vehicleData,
        supplyData,
        activityData,
        weatherData,
        reportData,
        wardData,
      ] = await Promise.all([
        api.getIncidents(filtersRef.current),
        api.getZones(),
        api.getRoads(),
        api.getShelters(),
        api.getHospitals(),
        api.getTeams(),
        api.getVehicles(),
        api.getSupplies(),
        api.getActivity(),
        api.getWeather({ limit: 200 }),
        api.getReports(),
        api.getWards(),
      ]);

      setIncidents(incidentData);
      setZones(zoneData);
      setRoads(roadData);
      setShelters(shelterData);
      setHospitals(hospitalData);
      setTeams(teamData);
      setVehicles(vehicleData);
      setSupplies(supplyData);
      setActivity(activityData);
      setWeather(weatherData);
      setReports(reportData);
      setWards(wardData);

      setSelectedIncidentId((current) => {
        if (current && incidentData.some((i) => i.id === current)) {
          return current;
        }

        return incidentData.length > 0 ? incidentData[0].id : null;
      });

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to reach the backend.");
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPolling(true);
      loadAll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadAll]);

  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) ?? null;

  const handleFilterChange = useCallback(
    (newFilters: IncidentFilters) => {
      setFilters(newFilters);
      filtersRef.current = newFilters;
      loadAll();
    },
    [loadAll]
  );

  const openCreate = useCallback(() => {
    setEditingIncident(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((incident: Incident) => {
    setEditingIncident(incident);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingIncident(null);
  }, []);

  const handleSubmit = useCallback(
    async (payload: IncidentPayload) => {
      setSaving(true);

      try {
        if (editingIncident) {
          await api.updateIncident(editingIncident.id, payload);

          toast("success", `Incident ${editingIncident.id} updated.`);
        } else {
          await api.createIncident(payload);

          toast("success", "Incident created.");
        }

        await loadAll();
      } catch (err) {
        console.error(err);
        toast("error", "Failed to save incident.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [editingIncident, loadAll, toast]
  );

  const handleDelete = useCallback(
    async (incident: Incident) => {
      const confirmed = window.confirm(
        `Delete incident ${incident.id} (${incident.title})?`
      );

      if (!confirmed) return;

      try {
        await api.deleteIncident(incident.id);

        if (selectedIncidentId === incident.id) {
          setSelectedIncidentId(null);
        }

        await loadAll();

        toast("success", `Incident ${incident.id} deleted.`);
      } catch (err) {
        console.error(err);
        toast("error", `Failed to delete incident ${incident.id}.`);
      }
    },
    [selectedIncidentId, loadAll, toast]
  );

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    loadAll();
  }, [loadAll]);

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      "Reset all demo data to the initial seed? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      const result = await api.resetData();

      await loadAll();

      toast(
        "success",
        `Demo data reset (${result.documents} documents reseeded).`
      );
    } catch (err) {
      console.error(err);
      toast("error", "Failed to reset demo data.");
    }
  }, [loadAll, toast]);

  const selectIncident = useCallback((id: string) => {
    setSelectedIncidentId(id);
  }, []);

  const setSimulatedZones = useCallback((zoneIds: string[]) => {
    setSimulatedZoneIds(zoneIds);
  }, []);

  const setSimulatedRoads = useCallback((roadIds: string[]) => {
    setSimulatedRoadIds(roadIds);
  }, []);

  const applyScenario = useCallback(
    (scenario: Scenario) => {
      const zoneIds = scenario.mutations.zones.map((zone) => zone.id);
      const roadIds = scenario.mutations.roads.map((road) => road.id);

      setSimulatedZoneIds(zoneIds);
      setSimulatedRoadIds(roadIds);
      setSelectedAnalysis(scenario.result);

      if (scenario.incident_id) {
        setSelectedIncidentId(scenario.incident_id);
      }
    },
    []
  );

  const value = useMemo<NexusContextValue>(
    () => ({
      incidents,
      zones,
      roads,
      shelters,
      hospitals,
      teams,
      vehicles,
      supplies,
      activity,
      weather,
      reports,
      wards,
      selectedIncident,
      selectedAnalysis,
      simulatedZoneIds,
      simulatedRoadIds,
      filters,
      loading,
      error,
      isPolling,
      modalOpen,
      editingIncident,
      saving,
      selectIncident,
      setAnalysis: setSelectedAnalysis,
      setSimulatedZones,
      setSimulatedRoads,
      applyScenario,
      handleFilterChange,
      openCreate,
      openEdit,
      closeModal,
      handleSubmit,
      handleDelete,
      handleReset,
      retry,
      refresh,
    }),
    [
      incidents,
      zones,
      roads,
      shelters,
      hospitals,
      teams,
      vehicles,
      supplies,
      activity,
      weather,
      reports,
      wards,
selectedIncident,
      selectedAnalysis,
      simulatedZoneIds,
      simulatedRoadIds,
      filters,
      loading,
      error,
      isPolling,
      modalOpen,
      editingIncident,
      saving,
      selectIncident,
      setSimulatedZones,
      setSimulatedRoads,
      applyScenario,
      handleFilterChange,
      openCreate,
      openEdit,
      closeModal,
      handleSubmit,
      handleDelete,
      handleReset,
      retry,
      refresh,
    ]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
}

export function useNexus() {
  const context = useContext(NexusContext);

  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }

  return context;
}