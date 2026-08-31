"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { AlertTriangle, ChevronsLeft, ChevronsRight } from "lucide-react";

import IncidentFiltersComponent from "@/components/dashboard/IncidentFilters";
import { Incident } from "@/types/nexus";
import { cn } from "@/lib/utils";
import { durations, easings } from "@/components/ui/motion";
import { IncidentFilters } from "@/lib/api";

interface IncidentDrawerProps {
  incidents: Incident[];
  filters: IncidentFilters;
  selectedIncident: Incident | null;
  onFiltersChange: (filters: IncidentFilters) => void;
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

export default function IncidentDrawer({
  incidents,
  filters,
  selectedIncident,
  onFiltersChange,
  onSelect,
}: IncidentDrawerProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 top-4 z-[1000] flex items-stretch">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: durations.micro, ease: easings.micro }}
            className="flex w-[300px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 p-4">
              <AlertTriangle className="h-4 w-4 text-orange-400" />

              <div>
                <h2 className="text-xs font-semibold tracking-widest text-slate-200">
                  ACTIVE INCIDENTS
                </h2>

                <p className="text-[10px] text-slate-500">
                  {incidents.length} monitored events
                </p>
              </div>
            </div>

            <IncidentFiltersComponent
              filters={filters}
              onChange={onFiltersChange}
            />

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {incidents.map((incident) => {
                const selected = selectedIncident?.id === incident.id;

                return (
                  <motion.button
                    key={incident.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: durations.micro }}
                    onClick={() => onSelect(incident)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition",
                      selected
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-100">
                          {incident.title}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {incident.id}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded border px-2 py-0.5 text-[9px] font-semibold",
                          severityClass(incident.severity)
                        )}
                      >
                        {incident.severity}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{incident.affected_zones.length} zones</span>

                      <span className="h-0.5 w-0.5 rounded-full bg-slate-700" />

                      <span>{incident.status}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle tab */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "z-[1001] flex h-12 w-6 items-center justify-center self-center rounded-r-lg border border-l-0 border-slate-800 bg-slate-950/90 text-slate-400 shadow-xl backdrop-blur transition hover:text-blue-400",
          !open && "border-l border-slate-800"
        )}
        aria-label={open ? "Collapse incidents" : "Expand incidents"}
      >
        {open ? (
          <ChevronsLeft className="h-4 w-4" />
        ) : (
          <ChevronsRight className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}