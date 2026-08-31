"use client";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";

import { Bot, Cpu, User, Waves } from "lucide-react";

import {
  cinematicStagger,
  cinematicStaggerItem,
} from "@/components/ui/motion";

import { ActivityLog } from "@/types/nexus";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  activity: ActivityLog[];
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "text-red-300 border-red-500/30 bg-red-500/10",
  WARNING: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  INFO: "text-blue-300 border-blue-500/30 bg-blue-500/10",
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  WARNING: "bg-yellow-500",
  INFO: "bg-blue-500",
};

const ACTOR_META: Record<
  string,
  { icon: typeof User; chip: string; iconClass: string }
> = {
  OPERATOR: {
    icon: User,
    chip: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    iconClass: "h-3.5 w-3.5",
  },
  SYSTEM: {
    icon: Cpu,
    chip: "text-blue-300 border-blue-500/30 bg-blue-500/10",
    iconClass: "h-3.5 w-3.5",
  },
  AGENT: {
    icon: Bot,
    chip: "text-purple-300 border-purple-500/30 bg-purple-500/10",
    iconClass: "h-3.5 w-3.5",
  },
};

type ActorFilter = "ALL" | "OPERATOR" | "SYSTEM" | "AGENT";

const FILTERS: ActorFilter[] = ["ALL", "OPERATOR", "SYSTEM", "AGENT"];

function actorForItem(item: ActivityLog): keyof typeof ACTOR_META {
  const isAgent =
    item.actor === "AGENT" || item.id.startsWith("AG") || /AGENT/i.test(item.actor);

  if (isAgent) {
    return "AGENT";
  }

  if (/SYS|ENGINE|PIPELINE|GATEWAY/i.test(item.actor)) {
    return "SYSTEM";
  }

  return "OPERATOR";
}

function dayLabel(timestamp: string, now: Date): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 1);

  if (date.getTime() >= today.getTime()) {
    return "Today";
  }

  if (date.getTime() >= start.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function ActivityTimeline({
  activity,
}: ActivityTimelineProps) {
  const [filter, setFilter] = useState<ActorFilter>("ALL");

  const sorted = useMemo(
    () =>
      [...activity].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [activity]
  );

  const grouped = useMemo(() => {
    const now = new Date();
    const groups = new Map<string, ActivityLog[]>();

    for (const item of sorted) {
      if (filter !== "ALL" && actorForItem(item) !== filter) {
        continue;
      }

      const label = dayLabel(item.timestamp, now);
      const list = groups.get(label) ?? [];

      list.push(item);
      groups.set(label, list);
    }

    return Array.from(groups.entries());
  }, [sorted, filter]);

  const newestId = sorted[0]?.id;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cinematicStagger}
      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/10">
            <Waves className="h-3.5 w-3.5 text-blue-400" />
          </span>

          <p className="text-[10px] font-semibold tracking-widest text-blue-400">
            SYSTEM ACTIVITY
          </p>
        </div>

        <div className="flex items-center gap-1">
          {FILTERS.map((actor) => (
            <button
              key={actor}
              type="button"
              onClick={() => setFilter(actor)}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-semibold tracking-wider transition",
                filter === actor
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {actor}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        {grouped.length === 0 && (
          <p className="px-5 py-6 text-xs text-slate-500">
            No activity recorded yet.
          </p>
        )}

        {grouped.map(([label, items]) => (
          <div key={label}>
            <p className="sticky top-0 border-y border-slate-800/60 bg-slate-950/90 px-4 py-1.5 text-[9px] font-semibold tracking-widest text-slate-500 backdrop-blur">
              {label.toUpperCase()}
            </p>

            {items.map((item) => {
              const actorKey = actorForItem(item);
              const meta = ACTOR_META[actorKey];
              const ActorIcon = meta.icon;
              const active = item.id === newestId;

              return (
                <motion.div
                  key={item.id}
                  variants={cinematicStaggerItem}
                  className="relative flex gap-3 border-b border-slate-900 px-4 py-3 transition-colors hover:bg-slate-900/40"
                >
                  {/* rail */}
                  <div className="mt-1 flex flex-col items-center">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.INFO
                      )}
                    />

                    {active && (
                      <motion.span
                        className="mt-1 text-[8px]"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                      >
                        ●
                      </motion.span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-600">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>

                      <span
                        className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold ${meta.chip}`}
                      >
                        <ActorIcon className="h-3 w-3" />

                        {item.actor}
                      </span>

                      <span
                        className={`ml-auto shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                          SEVERITY_BADGE[item.severity] ?? SEVERITY_BADGE.INFO
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.message}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}