"use client";

import {
  AlertTriangle,
  Clock,
  MapPin,
} from "lucide-react";

import { Incident } from "@/types/nexus";

interface IncidentSidebarProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelect: (incident: Incident) => void;
}

function severityClass(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "text-red-300 border-red-500/40 bg-red-500/10";

    case "HIGH":
      return "text-orange-300 border-orange-500/40 bg-orange-500/10";

    case "MEDIUM":
      return "text-yellow-300 border-yellow-500/40 bg-yellow-500/10";

    default:
      return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";
  }
}

export default function IncidentSidebar({
  incidents,
  selectedIncident,
  onSelect,
}: IncidentSidebarProps) {
  return (
    <aside className="flex h-full w-[320px] flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-400" />

          <h2 className="text-sm font-semibold tracking-widest text-slate-200">
            ACTIVE INCIDENTS
          </h2>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {incidents.length} monitored events
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {incidents.map((incident) => {
          const selected =
            selectedIncident?.id === incident.id;

          return (
            <button
              key={incident.id}
              onClick={() => onSelect(incident)}
              className={`w-full rounded-lg border p-4 text-left transition ${
                selected
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {incident.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {incident.id}
                  </p>
                </div>

                <span
                  className={`rounded border px-2 py-1 text-[10px] font-semibold ${severityClass(
                    incident.severity
                  )}`}
                >
                  {incident.severity}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />

                  {incident.affected_zones.length} zones
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />

                  {incident.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}