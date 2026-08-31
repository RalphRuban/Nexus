"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Radio } from "lucide-react";

import { api } from "@/lib/api";
import { AgentDescriptor, TraceRecord, TraceSpan } from "@/types/nexus";

import { statusDot } from "@/components/ui/motion";

type FleetDotVariant = "pulse" | "breathe" | "idle";

const AGENT_DOT: Record<
  string,
  { variant: FleetDotVariant; className: string }
> = {
  ACTIVE: { variant: "pulse", className: "bg-emerald-400" },
  STANDBY: { variant: "breathe", className: "bg-yellow-400" },
  REGISTERED: { variant: "idle", className: "bg-slate-500" },
};

const SPAN_DOT: Record<string, string> = {
  COMPLETED: "bg-emerald-400",
  RUNNING: "bg-yellow-400",
  ERROR: "bg-red-400",
};

const POLL_MS = 5000;

export default function FleetPanel() {
  const [agents, setAgents] = useState<AgentDescriptor[]>([]);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [fleet, records] = await Promise.all([
          api.getAgents(),
          api.getAgentTraces(20),
        ]);

        if (cancelled) return;

        setAgents(fleet);
        setTraces(records);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError("Gateway unreachable");
      }
    };

    refresh();

    const interval = setInterval(refresh, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeCount = agents.filter(
    (agent) => agent.status === "ACTIVE"
  ).length;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
          </span>

          <p className="text-[10px] font-semibold tracking-widest text-cyan-400">
            AGENT FLEET
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-semibold tracking-wider ${
            error
              ? "bg-red-500/10 text-red-300"
              : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          <motion.span
            animate={error ? "breathe" : "pulse"}
            variants={statusDot}
            className={`h-1.5 w-1.5 rounded-full ${
              error ? "bg-red-400" : "bg-emerald-400"
            }`}
          />

          {error ? "GATEWAY OFFLINE" : "GATEWAY ONLINE"}
        </span>
      </div>

      <div className="max-h-[46vh] space-y-3 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold tracking-widest text-slate-500">
            REGISTRY · {agents.length} AGENTS · {activeCount} ACTIVE
          </p>

          {agents.map((agent) => {
            const dot = AGENT_DOT[agent.status] ?? AGENT_DOT.REGISTERED;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <motion.span
                      initial="idle"
                      animate={dot.variant}
                      variants={statusDot}
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`}
                    />

                    <p className="truncate text-[11px] font-semibold text-slate-200">
                      {agent.name}
                    </p>

                    <span className="shrink-0 font-mono text-[9px] text-slate-500">
                      {agent.id}
                    </span>
                  </div>

                  <span className="shrink-0 font-mono text-[9px] text-slate-400">
                    ×{agent.invoked}
                  </span>
                </div>

                <p className="mt-1 truncate text-[10px] leading-4 text-slate-500">
                  {agent.role}
                </p>

                <p className="mt-1.5 font-mono text-[8px] tracking-tight text-slate-600">
                  {agent.capabilities.join(" · ")}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-widest text-slate-500">
          <Radio className="h-3 w-3" />

          GATEWAY AUDIT · LAST {traces.length} EXECUTION{traces.length === 1 ? "" : "S"}
        </p>

        <div className="mt-2 space-y-2">
          {traces.length === 0 && (
            <p className="text-[10px] leading-4 text-slate-600">
              No executions recorded yet. Run an analysis to populate the
              gateway audit.
            </p>
          )}

          {traces.map((trace) => (
            <div
              key={trace.id}
              className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-bold text-cyan-300">
                  {trace.id}
                </p>

                <span className="font-mono text-[9px] text-slate-500">
                  {trace.total_ms.toFixed(0)}ms
                </span>
              </div>

              <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                {trace.incident_id} · {trace.requested_by} · {trace.mode}
              </p>

              <div className="mt-2 space-y-1">
                {trace.spans.map((span) => (
                  <TraceSpanRow key={span.agent + span.tool} span={span} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TraceSpanRow({ span }: { span: TraceSpan }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1 w-1 shrink-0 rounded-full ${
          SPAN_DOT[span.status] ?? SPAN_DOT.RUNNING
        }`}
      />

      <p className="min-w-0 flex-1 truncate text-[9px] font-medium uppercase tracking-wider text-slate-400">
        {span.agent}
      </p>

      <p className="shrink-0 font-mono text-[8px] text-slate-600">
        {span.tool ?? "route"}
      </p>

      <span className="shrink-0 font-mono text-[8px] text-slate-500">
        {span.duration_ms.toFixed(1)}ms
      </span>
    </div>
  );
}