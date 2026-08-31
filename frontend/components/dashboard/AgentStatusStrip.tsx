"use client";

import { motion } from "framer-motion";

import { Check, CircleAlert, Loader2 } from "lucide-react";

import { AgentStep } from "@/types/nexus";
import { cn } from "@/lib/utils";

type AgentState = "queued" | "active" | "done" | "failed";

interface AgentStatusStripProps {
  steps: AgentStep[];
  runningAgents?: string[];
  simulationRunning?: boolean;
}

const AGENTS = [
  { key: "coordinator", label: "COORDINATOR" },
  { key: "research", label: "RESEARCH" },
  { key: "geospatial", label: "GEO" },
  { key: "risk", label: "RISK" },
  { key: "resource", label: "RESOURCE" },
  { key: "simulation", label: "SIM" },
  { key: "decision", label: "DECISION" },
];

function AgentStateDot({ state }: { state: AgentState }) {
  if (state === "active") {
    return (
      <motion.span
        animate={{ scale: [1, 1.45, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        className="block h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
      />
    );
  }

  if (state === "done") {
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex h-2 w-2 items-center justify-center"
      >
        <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
      </motion.span>
    );
  }

  if (state === "failed") {
    return (
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.1, repeat: Infinity }}
        className="flex h-2 w-2 items-center justify-center"
      >
        <CircleAlert className="h-2.5 w-2.5 text-red-400" />
      </motion.span>
    );
  }

  return (
    <motion.span
      animate={{ scale: [1, 1.1, 1], opacity: [0.25, 0.5, 0.25] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className="block h-1.5 w-1.5 rounded-full bg-slate-500"
    />
  );
}

export default function AgentStatusStrip({
  steps,
  runningAgents = [],
  simulationRunning = false,
}: AgentStatusStripProps) {
  const completed = new Set(
    steps.filter((s) => s.status === "COMPLETED").map((s) => s.agent)
  );

  const failed = new Set(
    steps.filter((s) => s.status === "ERROR").map((s) => s.agent)
  );

  const hasSteps = steps.length > 0;

  const stateFor = (key: string): AgentState => {
    if (failed.has(key)) return "failed";

    if (completed.has(key)) return "done";

    if (runningAgents.includes(key) || (simulationRunning && key === "simulation")) {
      return "active";
    }

    if (hasSteps) return "queued";

    return "queued";
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 backdrop-blur">
      {AGENTS.map((agent, index) => {
        const state = stateFor(agent.key);

        return (
          <motion.div
            key={agent.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors",
              state === "active"
                ? "border-yellow-500/30 bg-yellow-500/10"
                : state === "done"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : state === "failed"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-slate-800 bg-slate-900/30"
            )}
          >
            <div className="flex items-center gap-1.5">
              {state === "active" && (
                <Loader2 className="h-2.5 w-2.5 animate-spin text-yellow-400" />
              )}

              <AgentStateDot state={state} />
            </div>

            <span
              className={cn(
                "text-[8px] font-bold tracking-wider",
                state === "active"
                  ? "text-yellow-300"
                  : state === "done"
                    ? "text-emerald-400"
                    : state === "failed"
                      ? "text-red-400"
                      : "text-slate-500"
              )}
            >
              {agent.label}
            </span>

            <span
              className={cn(
                "text-[7px] font-semibold uppercase tracking-wider",
                state === "active"
                  ? "text-yellow-400"
                  : state === "done"
                    ? "text-emerald-500"
                    : state === "failed"
                      ? "text-red-400"
                      : "text-slate-600"
              )}
            >
              {state === "active"
                ? "ACTIVE"
                : state === "done"
                  ? "DONE"
                  : state === "failed"
                    ? "FAILED"
                    : "QUEUED"}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}