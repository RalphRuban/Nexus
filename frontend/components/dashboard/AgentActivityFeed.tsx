"use client";

import { useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { Bot, Radio } from "lucide-react";

import { ActivityLog, AgentStep } from "@/types/nexus";
import { cn } from "@/lib/utils";
import { durations, easings } from "@/components/ui/motion";

interface AgentActivityFeedProps {
  activity: ActivityLog[];
  steps: AgentStep[];
}

const AGENT_COLOR: Record<string, string> = {
  coordinator: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  research: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  geospatial: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  risk: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  resource: "text-purple-300 border-purple-500/30 bg-purple-500/10",
  decision: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  simulation: "text-red-300 border-red-500/30 bg-red-500/10",
};

const ACTOR_COLOR: Record<string, string> = {
  AGENT: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  OPERATOR: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  SCENARIO: "border-purple-500/30 bg-purple-500/10 text-purple-300",
};

interface FeedEntry {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
  muted: boolean;
}

export default function AgentActivityFeed({
  activity,
  steps,
}: AgentActivityFeedProps) {
  const [maxItems, setMaxItems] = useState(5);

  const feed: FeedEntry[] = useMemo(() => {    const agentEntries: FeedEntry[] = steps.map((step, index) => ({
      id: `step-${step.agent}-${index}`,
      agent: step.agent,
      message: step.summary,
      timestamp: step.timestamp,
      muted: step.status === "COMPLETED",
    }));

    const activityEntries: FeedEntry[] = activity
      .filter((entry) => entry.actor === "AGENT")
      .map((entry) => ({
        id: entry.id,
        agent: "agent",
        message: entry.message,
        timestamp: entry.timestamp,
        muted: true,
      }));

    return [...agentEntries, ...activityEntries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activity, steps]);

  const visible = feed.slice(0, maxItems);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-blue-400" />

          <span className="text-[10px] font-semibold tracking-widest text-slate-400">
            AGENT ACTIVITY
          </span>
        </div>

        <span className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-emerald-400">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: durations.status, ease: easings.micro }}
              className={cn(
                "flex items-start gap-2 rounded border border-slate-800/60 bg-slate-900/40 px-2.5 py-2",
                entry.muted && "opacity-60",
                !entry.muted && "border-blue-500/30 bg-blue-500/5"
              )}
            >
              <span className="mt-1.5">
                <motion.span
                  animate={entry.muted ? "idle" : "pulse"}
                  variants={{
                    idle: { scale: 1, opacity: 0.4 },
                    pulse: { scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] },
                  }}
                  transition={
                    entry.muted
                      ? { duration: 0.2 }
                      : { duration: 1.2, repeat: Infinity }
                  }
                  className="block h-1.5 w-1.5 rounded-full bg-blue-400"
                />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      AGENT_COLOR[entry.agent] ??
                        ACTOR_COLOR[entry.agent] ??
                        "border-slate-700 bg-slate-800 text-slate-400"
                    )}
                  >
                    {entry.agent}
                  </span>

                  <span className="shrink-0 font-mono text-[9px] text-slate-600">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {entry.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <p className="py-4 text-center text-[10px] text-slate-600">
            No agent activity yet — run an analysis.
          </p>
        )}
      </div>

      {feed.length > maxItems && (
        <button
          type="button"
          onClick={() => setMaxItems((v) => v + 5)}
          className="border-t border-slate-800 py-2 text-[9px] font-semibold tracking-wider text-slate-500 transition hover:text-blue-400"
        >
          SHOW MORE · {feed.length - maxItems} MORE
        </button>
      )}
    </div>
  );
}