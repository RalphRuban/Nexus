"use client";

import { GitBranch, Sparkles } from "lucide-react";

import { AgentAnalysis, Incident } from "@/types/nexus";

interface RecommendationCardProps {
  incident: Incident | null;
  analysis: AgentAnalysis | null;
}

const ACTION_STYLE: Record<string, string> = {
  EVACUATE: "border-red-500/40 bg-red-500/10 text-red-300",
  MONITOR: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  STAND_BY: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-emerald-300",
  MEDIUM: "text-yellow-300",
  HIGH: "text-orange-300",
  CRITICAL: "text-red-300",
};

export default function RecommendationCard({
  incident,
  analysis,
}: RecommendationCardProps) {
  if (!incident) {
    return null;
  }

  const recommendation = analysis?.recommendation;

  if (!recommendation) {
    return null;
  }

  const action = recommendation.action;

  return (
    <div className="border-b border-slate-800 px-5 py-4">
      <div className="flex items-center gap-2 text-slate-500">
        <GitBranch className="h-4 w-4" />

        <span className="text-[10px] font-semibold tracking-widest">
          RECOMMENDED RESPONSE
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded border px-2.5 py-1 text-xs font-bold ${
            ACTION_STYLE[action] ??
            "border-slate-700 bg-slate-800 text-slate-200"
          }`}
        >
          {action}
        </span>

        <span
          className={`text-[10px] font-semibold ${
            PRIORITY_COLOR[recommendation.priority] ?? "text-slate-400"
          }`}
        >
          {recommendation.priority}
        </span>

        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-purple-300">
          <Sparkles className="h-3 w-3" />

          {analysis.confidence}%
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-slate-400">
        {recommendation.rationale}
      </p>

      <ol className="mt-3 space-y-1.5">
        {recommendation.steps.map((step, index) => (
          <li
            key={step}
            className="flex gap-2 text-[11px] leading-4 text-slate-300"
          >
            <span className="font-mono text-slate-500">{index + 1}.</span>

            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
