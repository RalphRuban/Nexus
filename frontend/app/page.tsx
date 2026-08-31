"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { FlaskConical, X } from "lucide-react";

import AiDecisionPanel from "@/components/dashboard/AiDecisionPanel";
import IncidentDrawer from "@/components/dashboard/IncidentDrawer";
import KpiStrip from "@/components/dashboard/KpiStrip";
import ScenarioPanel from "@/components/dashboard/ScenarioPanel";
import CrisisMap from "@/components/map/MapWrapper";
import { useNexus } from "@/lib/nexus-context";
import { cinematicReveal, durations, easings } from "@/components/ui/motion";

export default function Home() {
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const {
    incidents,
    zones,
    roads,
    shelters,
    hospitals,
    weather,
    wards,
    selectedIncident,
    selectedAnalysis,
    simulatedZoneIds,
    simulatedRoadIds,
    filters,
    selectIncident,
    setAnalysis,
    handleFilterChange,
  } = useNexus();

  const analysisForIncident =
    selectedAnalysis?.incident_id === selectedIncident?.id
      ? selectedAnalysis
      : null;

  const handleSimulate = () => {
    setScenarioOpen(true);
  };

  return (
    <motion.div
      variants={cinematicReveal}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative flex h-full flex-col"
    >
      {/* KPI strip (off the map) */}
      <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
        <KpiStrip
          incidents={incidents}
          weather={weather}
          wards={wards}
          maxRiskScore={analysisForIncident?.risk.score ?? null}
          affectedPopulation={selectedIncident?.affected_population ?? 0}
        />
      </div>

      {/* Hero row: map + AI decision panel */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <CrisisMap
            incidents={incidents}
            zones={zones}
            roads={roads}
            shelters={shelters}
            hospitals={hospitals}
            weather={weather}
            wards={wards}
            selectedIncidentId={selectedIncident?.id ?? null}
            highlightZoneIds={simulatedZoneIds}
            highlightRoadIds={simulatedRoadIds}
            onSelectIncident={selectIncident}
          />

          <div className="nexus-grid-overlay" />

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 shadow-xl backdrop-blur">
            <p className="text-[9px] font-semibold tracking-widest text-slate-500">
              RAINFALL WARNING
            </p>

            <div className="flex gap-3 text-[9px]">
              <span className="flex items-center gap-1.5 text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                EXTREME
              </span>

              <span className="flex items-center gap-1.5 text-orange-300">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                SEVERE
              </span>

              <span className="flex items-center gap-1.5 text-yellow-300">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                WATCH
              </span>
            </div>
          </div>

          <IncidentDrawer
            incidents={incidents}
            filters={filters}
            selectedIncident={selectedIncident}
            onFiltersChange={handleFilterChange}
            onSelect={(incident) => selectIncident(incident.id)}
          />
        </div>

        {/* Right AI decision panel */}
        <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-slate-800/80 bg-slate-950/60">
          <motion.div
            key={selectedIncident?.id ?? "none"}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <AiDecisionPanel
              incident={selectedIncident}
              analysis={analysisForIncident}
              onAnalysisChange={setAnalysis}
              onSimulate={handleSimulate}
            />
          </motion.div>
        </aside>
      </div>

      {/* Sliding scenario engine panel */}
      <AnimatePresence>
        {scenarioOpen && selectedIncident && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setScenarioOpen(false)}
              className="absolute inset-0 z-[1500] bg-black/40 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ duration: durations.cinematic, ease: easings.cinematic }}
              className="absolute bottom-0 right-0 top-0 z-[1501] flex w-[420px] flex-col border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-purple-400" />

                  <span className="text-[10px] font-semibold tracking-widest text-purple-300">
                    SCENARIO ENGINE
                  </span>
                </div>

                <button
                  onClick={() => setScenarioOpen(false)}
                  className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close scenario engine"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <ScenarioPanel incident={selectedIncident} zones={zones} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}