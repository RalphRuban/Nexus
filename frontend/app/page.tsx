"use client";

import { useEffect, useState } from "react";
import { Radio, ShieldAlert } from "lucide-react";

import IncidentSidebar from "@/components/dashboard/IncidentSidebar";
import IncidentDetails from "@/components/dashboard/IncidentDetails";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import CrisisMap from "@/components/map/MapWrapper";

import { api } from "@/lib/api";

import {
  ActivityLog,
  Hospital,
  Incident,
  Road,
  Shelter,
  Zone,
} from "@/types/nexus";

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const [
          incidentData,
          zoneData,
          roadData,
          shelterData,
          hospitalData,
          activityData,
        ] = await Promise.all([
          api.getIncidents(),
          api.getZones(),
          api.getRoads(),
          api.getShelters(),
          api.getHospitals(),
          api.getActivity(),
        ]);

        setIncidents(incidentData);
        setZones(zoneData);
        setRoads(roadData);
        setShelters(shelterData);
        setHospitals(hospitalData);
        setActivity(activityData);

        if (incidentData.length > 0) {
          setSelectedIncident(incidentData[0]);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to connect to the NEXUS backend."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-8 w-8 animate-pulse text-blue-400" />

          <p className="mt-4 text-sm text-slate-400">
            Initializing NEXUS Command Center...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />

          <h1 className="mt-4 text-lg font-semibold text-white">
            Backend unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <p className="mt-4 font-mono text-xs text-slate-600">
            Expected: http://localhost:8000
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      {/* Header */}

      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
            <ShieldAlert className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-[0.25em]">
              NEXUS
            </h1>

            <p className="text-[10px] tracking-widest text-slate-600">
              CRISIS COMMAND CENTER
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <Radio className="h-3 w-3 text-emerald-400" />

          <span className="text-[10px] font-semibold tracking-widest text-emerald-400">
            SYSTEM ONLINE
          </span>
        </div>
      </header>

      {/* Main */}

      <div className="flex min-h-0 flex-1">
        <IncidentSidebar
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelect={setSelectedIncident}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <CrisisMap
              zones={zones}
              roads={roads}
              shelters={shelters}
              hospitals={hospitals}
            />

            <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-slate-700 bg-slate-950/90 px-4 py-3 shadow-xl backdrop-blur">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                OPERATIONAL MAP
              </p>

              <div className="mt-2 flex gap-4 text-[10px]">
                <span className="flex items-center gap-1.5 text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  HIGH RISK
                </span>

                <span className="flex items-center gap-1.5 text-yellow-300">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  MEDIUM
                </span>

                <span className="flex items-center gap-1.5 text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  OPEN ROAD
                </span>
              </div>
            </div>
          </div>

          <ActivityTimeline activity={activity} />
        </section>

        <IncidentDetails
          incident={selectedIncident}
        />
      </div>
    </main>
  );
}