"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import {
  BrainCircuit,
  GitBranch,
  Gauge,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AgentAnalysis, Incident } from "@/types/nexus";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  cinematicStagger,
  cinematicStaggerItem,
  durations,
  easings,
} from "@/components/ui/motion";

interface AiDecisionPanelProps {
  incident: Incident | null;
  analysis: AgentAnalysis | null;
  onAnalysisChange: (analysis: AgentAnalysis | null) => void;
  onSimulate: (incident: Incident) => void;
}

const LEVEL_STYLE: Record<
  string,
  { text: string; bar: string; badge: string }
> = {
  LOW: {
    text: "text-emerald-300",
    bar: "bg-emerald-500",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  MEDIUM: {
    text: "text-yellow-300",
    bar: "bg-yellow-500",
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  },
  HIGH: {
    text: "text-orange-300",
    bar: "bg-orange-500",
    badge: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  },
  CRITICAL: {
    text: "text-red-300",
    bar: "bg-red-500",
    badge: "border-red-500/40 bg-red-500/10 text-red-300",
  },
};

const ACTION_STYLE: Record<string, string> = {
  EVACUATE: "border-red-500/40 bg-red-500/10 text-red-300",
  MONITOR: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  STAND_BY: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  PREPARE: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  SECURE: "border-purple-500/40 bg-purple-500/10 text-purple-300",
};

interface WhyRowProps {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad";
}

function WhyRow({ label, value, tone }: WhyRowProps) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-yellow-300"
        : "text-red-300";

  return (
    <motion.div
      variants={cinematicStaggerItem}
      className="flex items-center justify-between gap-3 rounded border border-slate-800/80 bg-slate-900/40 px-3 py-2"
    >
      <span className="text-[10px] text-slate-500">{label}</span>

      <span className={cn("text-[11px] font-semibold", toneClass)}>
        {value}
      </span>
    </motion.div>
  );
}

export default function AiDecisionPanel({
  incident,
  analysis,
  onAnalysisChange,
  onSimulate,
}: AiDecisionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [approving, setApproving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!incident) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        // Import dynamically to avoid circular deps at module load
        const { api } = await import("@/lib/api");
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

  const handleApprove = async () => {
    if (!incident || !analysis) {
      return;
    }

    const plan =
      analysis.recommendation.options.find((p) => p.recommended) ??
      analysis.recommendation.options[0];

    if (!plan) {
      return;
    }

    setApproving(true);

    try {
      const { api } = await import("@/lib/api");
      await api.approvePlan(incident.id, plan.id);
      toast("success", `Plan ${plan.id} (${plan.label}) approved.`);
    } catch (err) {
      console.error(err);
      toast("error", `Failed to approve plan ${plan.id}.`);
    } finally {
      setApproving(false);
    }
  };

  if (!incident) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <BrainCircuit className="h-8 w-8 text-slate-700" />

        <p className="text-xs text-slate-600">
          Select an incident to run AI analysis
        </p>
      </motion.div>
    );
  }

  const level = analysis?.risk.level;
  const score = analysis?.risk.score ?? 0;
  const style = LEVEL_STYLE[level ?? "LOW"] ?? LEVEL_STYLE.LOW;

  const recommendation = analysis?.recommendation;

  return (
    <motion.div
      variants={cinematicStagger}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2 text-slate-500">
          <BrainCircuit className="h-4 w-4 text-blue-400" />

          <span className="text-[10px] font-semibold tracking-widest">
            NEXUS RECOMMENDATION
          </span>
        </div>

        <span className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          LIVE
        </span>
      </div>

      {/* Incident context */}
      <motion.div
        variants={cinematicStaggerItem}
        className="border-b border-slate-800 px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded border px-2 py-0.5 text-[10px] font-bold",
              ACTION_STYLE[recommendation?.action ?? ""] ??
                "border-slate-700 bg-slate-800 text-slate-200"
            )}
          >
            {recommendation?.action ?? "ASSESSING"}
          </span>

          <p className="truncate text-xs font-medium text-slate-200">
            {incident.title}
          </p>

          <span className="ml-auto font-mono text-[9px] text-slate-600">
            {incident.id}
          </span>
        </div>
      </motion.div>

      {analysis && !loading ? (
        <>
          {/* Risk score */}
          <motion.div
            variants={cinematicStaggerItem}
            className="border-b border-slate-800 px-5 py-4"
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-end gap-1">
                  <span className={cn("text-4xl font-black tracking-tight", style.text)}>
                    <AnimatedNumber value={score} duration={0.8} />
                  </span>

                  <span className="mb-1 text-sm font-medium text-slate-500">
                    /100
                  </span>
                </div>

                <span
                  className={cn(
                    "mt-1 inline-block rounded border px-2 py-0.5 text-[9px] font-semibold tracking-wider",
                    style.badge
                  )}
                >
                  {level} RISK
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <Gauge className="h-3.5 w-3.5" />

                <span className="text-[10px]">{incident.id}</span>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: durations.continuous, ease: easings.micro }}
                className={cn("h-full rounded-full", style.bar)}
              />
            </div>
          </motion.div>

          {/* Why breakdown */}
          <motion.div
            variants={cinematicStaggerItem}
            className="border-b border-slate-800 px-5 py-4"
          >
            <div className="flex items-center gap-2 text-slate-500">
              <GitBranch className="h-3.5 w-3.5" />

              <span className="text-[10px] font-semibold tracking-widest">
                WHY
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              <WhyRow
                label="Population exposure"
                value={String(incident.affected_population)}
                tone={incident.affected_population > 20000 ? "bad" : "warn"}
              />

              <WhyRow
                label="Road accessibility"
                value={`${Math.max(0, 100 - analysis.roads_affected.length * 7)}%`}
                tone={
                  analysis.roads_affected.length > 2
                    ? "bad"
                    : analysis.roads_affected.length > 0
                      ? "warn"
                      : "good"
                }
              />

              <WhyRow
                label="Shelter proximity"
                value={`${analysis.resources.shelters} facilities`}
                tone={analysis.resources.shelters >= 3 ? "good" : "warn"}
              />

              <WhyRow
                label="Resource availability"
                value={
                  analysis.resources.teams >= 3 ? "GOOD" : "LIMITED"
                }
                tone={analysis.resources.teams >= 3 ? "good" : "warn"}
              />
            </div>
          </motion.div>

          {/* Confidence */}
          <motion.div
            variants={cinematicStaggerItem}
            className="border-b border-slate-800 px-5 py-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                CONFIDENCE
              </span>

              <span className="text-xs font-bold text-purple-300">
                <AnimatedNumber value={analysis.confidence} />
                %
              </span>
            </div>

            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.confidence}%` }}
                transition={{ duration: durations.continuous, ease: easings.micro }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
              />
            </div>

            <p className="mt-3 text-[11px] leading-4 text-slate-400">
              {recommendation?.rationale ?? analysis.summary}
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            variants={cinematicStaggerItem}
            className="flex gap-2 px-5 py-4"
          >
            <button
              type="button"
              onClick={() => onSimulate(incident)}
              className="glow-cyan flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              SIMULATE
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={!analysis || approving}
              className="glow-primary flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {approving ? "APPROVING" : "APPROVE"}
            </button>
          </motion.div>
        </>
      ) : error ? (
        <p className="px-5 py-4 text-[10px] text-red-400">
          Risk analysis unavailable.
        </p>
      ) : (
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-end justify-between">
            <Skeleton className="h-9 w-24" />

            <Skeleton className="h-3 w-16" />
          </div>

          <Skeleton className="h-1.5 w-full" />

          <div className="space-y-1.5">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>

          <Skeleton className="h-1 w-full" />
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 px-5 pb-4 text-[10px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Agents assessing incident...
        </div>
      )}
    </motion.div>
  );
}