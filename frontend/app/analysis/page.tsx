"use client";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

import { BrainCircuit } from "lucide-react";

import AgentAnalysisPanel from "@/components/dashboard/AgentAnalysisPanel";
import FleetPanel from "@/components/dashboard/FleetPanel";
import { useNexus } from "@/lib/nexus-context";
import {
  cinematicReveal,
  cinematicStagger,
  cinematicStaggerItem,
} from "@/components/ui/motion";

export default function AnalysisPage() {
  const router = useRouter();
  const { selectedIncident } = useNexus();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <motion.div
          variants={cinematicReveal}
          initial="hidden"
          animate="visible"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-purple-400">
            <BrainCircuit className="h-3.5 w-3.5" />

            AI AGENT FLEET
          </p>

          <h2 className="mt-1 text-lg font-bold text-white">
            Agent Analysis &amp; Gateway
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Run the NEXUS agent pipeline and watch every authorized call
            across the fleet.
          </p>
        </motion.div>

        <motion.div
          variants={cinematicStagger}
          initial="hidden"
          animate="visible"
          className="flex items-start gap-6"
        >
          <motion.div
            variants={cinematicStaggerItem}
            className="min-w-0 flex-1"
          >
            <AgentAnalysisPanel
              incident={selectedIncident}
              onNavigateToScenarios={() =>
                router.push(
                  selectedIncident
                    ? `/scenarios?incident=${encodeURIComponent(
                        selectedIncident.id
                      )}`
                    : "/scenarios"
                )
              }
            />
          </motion.div>

          <motion.div variants={cinematicStaggerItem}>
            <aside className="hidden w-[320px] shrink-0 lg:block">
              <FleetPanel />
            </aside>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}