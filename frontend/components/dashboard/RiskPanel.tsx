"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Gauge, Loader2 } from "lucide-react";

import { api } from "@/lib/api";

import { AgentAnalysis, Incident } from "@/types/nexus";

import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";

interface RiskPanelProps {
  incident: Incident | null;
  analysis: AgentAnalysis | null;
  onAnalysisChange: (analysis: AgentAnalysis | null) => void;
}

const LEVEL_STYLE: Record<string, { text: string; bar: string }> = {
  LOW: { text: "text-emerald-300", bar: "bg-emerald-500" },
  MEDIUM: { text: "text-yellow-300", bar: "bg-yellow-500" },
  HIGH: { text: "text-orange-300", bar: "bg-orange-500" },
  CRITICAL: { text: "text-red-300", bar: "bg-red-500" },
};

export default function RiskPanel({
  incident,
  analysis,
  onAnalysisChange,
}: RiskPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!incident) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const result = await api.analyzeIncident(incident.id);

        if (!cancelled) {
          onAnalysisChange(result);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [incident, onAnalysisChange]);

  if (!incident) {
    return (
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="text-[10px] font-semibold tracking-widest text-slate-600">
          NO INCIDENT SELECTED
        </p>
      </div>
    );
  }

  const level = analysis?.risk.level;
  const score = analysis?.risk.score ?? 0;
  const style = LEVEL_STYLE[level ?? "LOW"] ?? LEVEL_STYLE.LOW;

  return (
    <div className="border-b border-slate-800 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <BrainCircuit className="h-4 w-4" />

          <span className="text-[10px] font-semibold tracking-widest">
            RISK PANEL
          </span>
        </div>

        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
        )}
      </div>

      {analysis && !loading ? (
        <>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className={`text-2xl font-bold ${style.text}`}>
                <AnimatedNumber value={score} />
                <span className="text-sm font-medium text-slate-500">
                  /100
                </span>
              </p>

              <p
                className={`mt-0.5 text-[10px] font-semibold tracking-wider ${style.text}`}
              >
                {level} RISK
              </p>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <Gauge className="h-3.5 w-3.5" />

              <span className="text-[10px]">{incident.id}</span>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
              style={{ width: `${score}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1">
            {analysis.risk.drivers.slice(0, 3).map((driver) => (
              <li
                key={driver}
                className="truncate text-[10px] leading-4 text-slate-500"
                title={driver}
              >
                • {driver}
              </li>
            ))}
          </ul>
        </>
      ) : error ? (
        <p className="mt-3 text-[10px] text-red-400">
          Risk analysis unavailable.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between">
            <Skeleton className="h-8 w-20" />

            <Skeleton className="h-3 w-16" />
          </div>

          <Skeleton className="h-1.5 w-full" />

          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      )}
    </div>
  );
}
