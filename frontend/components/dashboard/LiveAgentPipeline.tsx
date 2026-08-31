"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, CircleAlert, Loader2 } from "lucide-react";

import { AgentStep } from "@/types/nexus";

interface LiveAgentPipelineProps {
  steps: AgentStep[];
  compact?: boolean;
  stepDelay?: number;
  animated?: boolean;
  onComplete?: () => void;
}

const STATUS_STYLE: Record<
  string,
  { dot: string; label: string }
> = {
  COMPLETED: { dot: "bg-emerald-400", label: "text-emerald-400" },
  RUNNING: { dot: "bg-yellow-400", label: "text-yellow-400" },
  ERROR: { dot: "bg-red-400", label: "text-red-400" },
};

export default function LiveAgentPipeline({
  steps,
  compact = false,
  stepDelay = 380,
  animated = true,
  onComplete,
}: LiveAgentPipelineProps) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!animated || steps.length === 0) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const sequence = () => {
      if (cancelled) return;

      setVisible((current) => {
        const next = current + 1;

        if (next < steps.length) {
          timeout = setTimeout(sequence, stepDelay);
        } else if (onComplete) {
          timeout = setTimeout(onComplete, 120);
        }

        return next;
      });
    };

    timeout = setTimeout(() => {
      setVisible(0);
      timeout = setTimeout(sequence, 250);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [steps, stepDelay, animated, onComplete]);

  if (steps.length === 0) {
    return (
      <p className="text-[11px] text-slate-500">No agent steps recorded.</p>
    );
  }

  const visibleSteps = animated ? steps.slice(0, visible) : steps;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {visibleSteps.map((step, index) => {
        const style = STATUS_STYLE[step.status] ?? STATUS_STYLE.RUNNING;
        const isRunning = animated
          ? index === visible - 1 && index < steps.length - 1
          : step.status === "RUNNING";

        return (
          <motion.div
            key={step.agent}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
              delay: animated || compact ? 0 : index * 0.06,
            }}
            className="flex items-start gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
          >
            <span className="mt-1 shrink-0">
              {step.status === "ERROR" ? (
                <CircleAlert className="h-3 w-3 text-red-400" />
              ) : isRunning ? (
                <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
              ) : (
                <Bot className="h-3 w-3 text-emerald-400" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {step.agent}
                </p>

                <span className="shrink-0 font-mono text-[9px] text-slate-600">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                {step.summary}
              </p>

              <p
                className={`mt-0.5 text-[9px] font-semibold tracking-wider ${
                  isRunning ? "text-yellow-400" : style.label
                }`}
              >
                {isRunning ? "RUNNING" : step.status}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}