"use client";

import { motion } from "framer-motion";
import { Activity, AlertTriangle, Droplets, Users } from "lucide-react";

import AnimatedNumber from "@/components/ui/AnimatedNumber";

import {
  Incident,
  Ward,
  WeatherEvent,
} from "@/types/nexus";

interface KpiStripProps {
  incidents: Incident[];
  weather: WeatherEvent[];
  wards: Ward[];
  maxRiskScore: number | null;
  affectedPopulation: number;
}

function warningCounts(weather: WeatherEvent[]) {
  const counts: Record<string, number> = {
    EXTREME: 0,
    SEVERE: 0,
    WATCH: 0,
    NORMAL: 0,
  };

  for (const event of weather) {
    counts[event.warning] = (counts[event.warning] ?? 0) + 1;
  }

  return counts;
}

const WARNING_DOT: Record<string, string> = {
  EXTREME: "bg-red-600",
  SEVERE: "bg-orange-500",
  WATCH: "bg-yellow-500",
  NORMAL: "bg-emerald-500",
};

export default function KpiStrip({
  incidents,
  weather,
  maxRiskScore,
  affectedPopulation,
}: KpiStripProps) {
  const counts = warningCounts(weather);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {/* Active incidents */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
            ACTIVE INCIDENTS
          </p>

          <p className="text-lg font-bold leading-tight text-white">
            <AnimatedNumber value={incidents.length} />
          </p>
        </div>
      </div>

      {/* Highest risk */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10">
          <Activity className="h-4 w-4 text-purple-400" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
            PEAK RISK
          </p>

          <p className="text-lg font-bold leading-tight text-white">
            {maxRiskScore != null ? (
              <>
                <AnimatedNumber value={maxRiskScore} />
                <span className="text-xs font-medium text-slate-500">
                  /100
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-slate-600">—</span>
            )}
          </p>
        </div>
      </div>

      {/* Population at risk */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
          <Users className="h-4 w-4 text-emerald-400" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
            POPULATION AT RISK
          </p>

          <p className="text-lg font-bold leading-tight text-white">
            {affectedPopulation > 0 ? (
              <AnimatedNumber value={affectedPopulation} />
            ) : (
              <span className="text-sm font-medium text-slate-600">—</span>
            )}
          </p>
        </div>
      </div>

      {/* Warning distribution */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-yellow-500/30 bg-yellow-500/10">
          <Droplets className="h-4 w-4 text-yellow-400" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
            RAINFALL WARNINGS
          </p>

          <div className="mt-0.5 flex items-center gap-3">
            {(["EXTREME", "SEVERE", "WATCH"] as const).map((level) => (
              <span
                key={level}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-300"
              >
                <span
                  className={`h-2 w-2 rounded-full ${WARNING_DOT[level]}`}
                />
                {counts[level]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}