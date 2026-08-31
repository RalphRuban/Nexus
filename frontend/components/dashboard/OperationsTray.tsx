"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { Activity, GitBranch, ScrollText } from "lucide-react";

import IncidentDetails from "@/components/dashboard/IncidentDetails";
import AgentActivityFeed from "@/components/dashboard/AgentActivityFeed";
import AgentStatusStrip from "@/components/dashboard/AgentStatusStrip";

import { ActivityLog, AgentStep, Incident } from "@/types/nexus";
import { cn } from "@/lib/utils";
import { durations, easings } from "@/components/ui/motion";

type TrayTab = "activity" | "pipeline" | "incident";

interface OperationsTrayProps {
  activity: ActivityLog[];
  steps: AgentStep[];
  simulationRunning: boolean;
  incident: Incident | null;
  onEdit?: (incident: Incident) => void;
  onDelete?: (incident: Incident) => void;
}

const TABS: { key: TrayTab; label: string; icon: typeof Activity }[] = [
  { key: "activity", label: "LIVE ACTIVITY", icon: Activity },
  { key: "pipeline", label: "AGENT PIPELINE", icon: GitBranch },
  { key: "incident", label: "INCIDENT DETAIL", icon: ScrollText },
];

export default function OperationsTray({
  activity,
  steps,
  simulationRunning,
  incident,
  onEdit,
  onDelete,
}: OperationsTrayProps) {
  const [tab, setTab] = useState<TrayTab>("activity");

  return (
    <div className="flex h-44 shrink-0 flex-col border-t border-slate-800/80 bg-slate-950/60">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-800/80 px-4">
        {TABS.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] font-semibold tracking-widest transition-colors",
                active ? "text-blue-300" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />

              {item.label}

              {active && (
                <motion.span
                  layoutId="nexus-tray-active"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-400"
                  transition={{ duration: durations.micro, ease: easings.micro }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="min-h-0 flex-1 p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: durations.micro, ease: easings.micro }}
            className="h-full"
          >
            {tab === "activity" && (
              <AgentActivityFeed activity={activity} steps={steps} />
            )}

            {tab === "pipeline" && (
              <div className="flex h-full flex-col justify-center gap-3">
                <AgentStatusStrip
                  steps={steps}
                  simulationRunning={simulationRunning}
                />
              </div>
            )}

            {tab === "incident" &&
              (incident ? (
                <IncidentDetails
                  compact
                  incident={incident}
                  onEdit={onEdit ? () => onEdit(incident) : undefined}
                  onDelete={onDelete ? () => onDelete(incident) : undefined}
                />
              ) : (
                <div className="flex h-full items-center rounded-xl border border-slate-800 bg-slate-950/90 px-4">
                  <p className="text-xs text-slate-500">
                    Select an incident to view operational details.
                  </p>
                </div>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}