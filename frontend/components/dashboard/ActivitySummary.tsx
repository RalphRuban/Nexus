"use client";

import { useMemo } from "react";

import { motion } from "framer-motion";

import { Bot, Cpu, Radio, User, Waves } from "lucide-react";

import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  cinematicStagger,
  cinematicStaggerItem,
} from "@/components/ui/motion";

import { ActivityLog } from "@/types/nexus";

interface ActivitySummaryProps {
  activity: ActivityLog[];
}

const SEVERITY_META: Record<
  string,
  { label: string; chip: string; dot: string; count: string }
> = {
  CRITICAL: { label: "Critical", chip: "text-red-300", dot: "bg-red-500", count: "text-red-300" },
  WARNING: { label: "Warning", chip: "text-yellow-300", dot: "bg-yellow-500", count: "text-yellow-300" },
  INFO: { label: "Info", chip: "text-blue-300", dot: "bg-blue-500", count: "text-blue-300" },
};

export default function ActivitySummary({
  activity,
}: ActivitySummaryProps) {
  const breakdown = useMemo(() => {
    const actors: Record<string, number> = {};
    const severities: Record<string, number> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let latest = activity[0];

    for (const item of activity) {
      actors[item.actor] = (actors[item.actor] ?? 0) + 1;
      severities[item.severity] = (severities[item.severity] ?? 0) + 1;

      if (new Date(item.timestamp).getTime() >= today.getTime()) {
        todayCount += 1;
      }

      if (!latest) {
        latest = item;
      }
    }

    const total = activity.length || 1;
    const actorRows = Object.entries(actors)
      .sort((a, b) => b[1] - a[1])
      .map(([actor, count]) => ({
        actor,
        count,
        pct: Math.round((count / total) * 100),
      }));

    return { actorRows, severities, todayCount, latest };
  }, [activity]);

  const ActorIcon = breakdown.latest
    ? /SYS|ENGINE|PIPELINE|GATEWAY/i.test(breakdown.latest.actor)
      ? Cpu
      : /AGENT/i.test(breakdown.latest.actor)
        ? User
        : Radio
    : Radio;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cinematicStagger}
      className="space-y-4"
    >
      {/* Live card */}
      <motion.div
        variants={cinematicStaggerItem}
        className="overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5"
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
              <Waves className="h-3.5 w-3.5 text-emerald-400" />

              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </span>

            <div>
              <p className="text-[10px] font-semibold tracking-widest text-emerald-300">
                LIVE FEED
              </p>

              <p className="text-[9px] text-slate-500">Operations stream</p>
            </div>
          </div>

          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            <AnimatedNumber value={breakdown.todayCount} /> today
          </span>
        </div>

        {breakdown.latest ? (
          <div className="px-4 py-3">
            <p className="text-xs leading-5 text-slate-300">
              {breakdown.latest.message}
            </p>

            <p className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500">
              <ActorIcon className="h-3 w-3" />

              {breakdown.latest.actor} ·{" "}
              {new Date(breakdown.latest.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="px-4 py-3 text-xs text-slate-500">
            Waiting for the first event.
          </p>
        )}
      </motion.div>

      {/* Severity distribution */}
      <motion.div
        variants={cinematicStaggerItem}
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          SEVERITY MIX
        </p>

        <div className="mt-3 space-y-2">
          {(["CRITICAL", "WARNING", "INFO"] as const).map((severity) => {
            const meta = SEVERITY_META[severity];

            return (
              <div
                key={severity}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />

                  {meta.label}
                </span>

                <span className={`text-sm font-bold ${meta.count}`}>
                  <AnimatedNumber value={breakdown.severities[severity] ?? 0} />
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Actor breakdown */}
      <motion.div
        variants={cinematicStaggerItem}
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest text-slate-500">
            EVENT SOURCES
          </p>

          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            {activity.length}
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {breakdown.actorRows.length === 0 && (
            <p className="text-[11px] text-slate-600">No events yet.</p>
          )}

          {breakdown.actorRows.map((row) => (
            <div key={row.actor}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-400">
                  {row.actor === "AGENT" ? (
                    <Bot className="h-3 w-3 text-purple-400" />
                  ) : /SYS|ENGINE|PIPELINE|GATEWAY/i.test(row.actor) ? (
                    <Cpu className="h-3 w-3 text-blue-400" />
                  ) : (
                    <User className="h-3 w-3 text-emerald-400" />
                  )}

                  {row.actor}
                </span>

                <span className="font-mono text-slate-500">
                  {row.count} · {row.pct}%
                </span>
              </div>

              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${row.pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-slate-500"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Now */}
      <motion.div
        variants={cinematicStaggerItem}
        className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <motion.p
          className={`text-xl font-bold tabular-nums ${
            breakdown.latest?.severity === "CRITICAL"
              ? "text-red-300"
              : "text-slate-200"
          }`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {breakdown.latest
            ? new Date(breakdown.latest.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "--:--:--"}
        </motion.p>

        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
          <span className="font-semibold text-slate-400">LAST EVENT</span>
          <br />
          {breakdown.latest
            ? breakdown.latest.actor
            : "The stream is waiting for the fleet."}
        </p>
      </motion.div>

      <div className="h-px bg-slate-800/60" />
    </motion.div>
  );
}