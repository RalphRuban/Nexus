"use client";

import { motion } from "framer-motion";

import { Radio } from "lucide-react";

import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import ActivitySummary from "@/components/dashboard/ActivitySummary";
import { useNexus } from "@/lib/nexus-context";
import {
  cinematicReveal,
  cinematicStagger,
  cinematicStaggerItem,
} from "@/components/ui/motion";

export default function ActivityPage() {
  const { activity } = useNexus();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <motion.div
          variants={cinematicReveal}
          initial="hidden"
          animate="visible"
          className="flex items-start justify-between gap-4"
        >
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-blue-400">
              <Radio className="h-3.5 w-3.5" />

              OPERATIONS STREAM
            </p>

            <h2 className="mt-1 text-lg font-bold text-white">
              Live Activity
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Every dispatch, analysis and system event across the command
              center.
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-2 rounded border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            STREAMING
          </span>
        </motion.div>

        <motion.div
          variants={cinematicStagger}
          initial="hidden"
          animate="visible"
          className="flex items-start gap-5"
        >
          <motion.div
            variants={cinematicStaggerItem}
            className="min-w-0 flex-1"
          >
            <ActivityTimeline activity={activity} />
          </motion.div>

          <motion.div
            variants={cinematicStaggerItem}
            className="hidden w-[300px] shrink-0 lg:block"
          >
            <ActivitySummary activity={activity} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}