"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  GitBranch,
  Loader2,
  MapPin,
  Package,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";

import { AgentAnalysis, Incident, PlanOption } from "@/types/nexus";

import LiveAgentPipeline from "@/components/dashboard/LiveAgentPipeline";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

interface AgentAnalysisPanelProps {
  incident: Incident | null;
  onNavigateToScenarios?: () => void;
}

const LEVEL_COLOR: Record<string, string> = {
  LOW: "text-emerald-300 bg-emerald-500/10",
  MEDIUM: "text-yellow-300 bg-yellow-500/10",
  HIGH: "text-orange-300 bg-orange-500/10",
  CRITICAL: "text-red-300 bg-red-500/10",
};

export default function AgentAnalysisPanel({
  incident,
  onNavigateToScenarios,
}: AgentAnalysisPanelProps) {
  const { toast } = useToast();

  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [approvedPlanId, setApprovedPlanId] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!incident) return;

    setLoading(true);
    setError(null);
    setRevealed(false);
    setSelectedPlanId(null);
    setApprovedPlanId(null);

    try {
      const result = await api.analyzeIncident(incident.id);
      setAnalysis(result);
      setSelectedPlanId(
        result.recommendation.options.find((plan) => plan.recommended)?.id ??
          result.recommendation.options[0]?.id ??
          null
      );
    } catch (err) {
      console.error(err);
      setError("Agent analysis failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleRevealed = useCallback(() => {
    setRevealed(true);
  }, []);

  const approvePlan = async (plan: PlanOption) => {
    if (!incident) return;

    setApproving(plan.id);

    try {
      await api.approvePlan(incident.id, plan.id);
      setApprovedPlanId(plan.id);
      toast("success", `Plan ${plan.id} (${plan.label}) approved.`);
    } catch (err) {
      console.error(err);
      toast("error", `Failed to approve plan ${plan.id}.`);
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10">
            <Bot className="h-3.5 w-3.5 text-purple-400" />
          </span>

          <p className="text-[10px] font-semibold tracking-widest text-purple-400">
            AGENT ANALYSIS
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!incident || loading}
          className="flex items-center gap-1.5 rounded border border-purple-500/40 px-3 py-1.5 text-[11px] font-semibold text-purple-300 transition hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}

          {analysis ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-5 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {!incident && (
        <p className="px-5 py-6 text-xs text-slate-500">
          Select an incident to run the agent pipeline.
        </p>
      )}

      {incident && !analysis && !error && !loading && (
        <p className="px-5 py-6 text-xs text-slate-500">
          Run the NEXUS agent pipeline to get a risk assessment,
          resource summary and recommended response for{" "}
          {incident.id}.
        </p>
      )}

      {loading && !analysis && (
        <div className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />

          <Skeleton className="h-20 w-full" />

          <Skeleton className="h-24 w-full" />

          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {analysis && !revealed && (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Loader2 className="h-4 w-4 animate-spin" />

            <span className="text-[10px] font-semibold tracking-widest">
              NEXUS AGENTS ARE ASSESSING THE SITUATION
            </span>
          </div>

          <LiveAgentPipeline
            steps={analysis.steps}
            onComplete={handleRevealed}
          />
        </div>
      )}

      {analysis && revealed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-4 p-4"
        >
          <p className="text-xs leading-5 text-slate-400">
            {analysis.summary}
          </p>

          {/* Risk */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <BrainCircuit className="h-4 w-4" />

              <span className="text-[10px] font-medium uppercase tracking-wider">
                Risk assessment
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  LEVEL_COLOR[analysis.risk.level] ??
                  "text-slate-300 bg-slate-500/10"
                }`}
              >
                {analysis.risk.level} · {analysis.risk.score}/100
              </span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {analysis.risk.drivers.map((driver) => (
                <li
                  key={driver}
                  className="text-[11px] leading-4 text-slate-500"
                >
                  • {driver}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-purple-400">
                <GitBranch className="h-4 w-4" />

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Response plans
                </span>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-300">
                <Sparkles className="h-3 w-3" />

                confidence {analysis.confidence}%
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {analysis.recommendation.options.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  incidentId={incident?.id ?? null}
                  approving={approving === plan.id}
                  selected={selectedPlanId === plan.id}
                  approved={approvedPlanId === plan.id}
                  onSelect={() => setSelectedPlanId(plan.id)}
                  onApprove={approvePlan}
                  onSimulate={onNavigateToScenarios}
                />
              ))}
            </div>

            {selectedPlanId && (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                <GitBranch className="h-3 w-3" />

                {analysis.recommendation.options.find(
                  (plan) => plan.id === selectedPlanId
                )?.label ??
                  "Plan selected"}{" "}
                highlighted for approval
              </p>
            )}
          </div>

          {/* Resources + roads */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-3.5 w-3.5" />

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Resources
                </span>
              </div>

              <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                <p>{analysis.resources.shelters} shelters open</p>
                <p>{analysis.resources.hospitals} hospitals ready</p>
                <p>{analysis.resources.teams} teams available</p>
                <p>{analysis.resources.vehicles} vehicles</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-3.5 w-3.5" />

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Roads affected
                </span>
              </div>

              <div className="mt-2 space-y-1">
                {analysis.roads_affected.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No constraints
                  </p>
                )}

                {analysis.roads_affected.map((road) => (
                  <p
                    key={road}
                    className="text-[11px] leading-4 text-slate-300"
                  >
                    {road}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Supplies */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Package className="h-3.5 w-3.5" />

              <span className="text-[10px] font-medium uppercase tracking-wider">
                Supplies available
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {analysis.resources.supplies.map((supply) => (
                <span
                  key={supply}
                  className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  {supply}
                </span>
              ))}
            </div>
          </div>

          {/* Agent pipeline steps */}
          <div className="border-t border-slate-800 pt-3">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500">
              AGENT PIPELINE
            </p>

            <div className="mt-2">
              <LiveAgentPipeline steps={analysis.steps} animated={false} />
            </div>

            <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-600">
              <RefreshCw className="h-3 w-3" />
              mode: {analysis.mode}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  incidentId,
  approving,
  selected,
  approved,
  onSelect,
  onApprove,
  onSimulate,
}: {
  plan: PlanOption;
  incidentId: string | null;
  approving: boolean;
  selected: boolean;
  approved: boolean;
  onSelect: () => void;
  onApprove: (plan: PlanOption) => void;
  onSimulate?: () => void;
}) {
  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`relative cursor-pointer rounded-lg border p-3 transition ${
        selected
          ? "border-purple-500/70 bg-purple-500/10 shadow-[0_0_24px_-6px_rgba(168,85,247,0.5)]"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
      }`}
    >
      {selected && (
        <motion.span
          layoutId="nexus-plan-highlight"
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-purple-400"
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-purple-300">
            Plan {plan.id}
          </span>

          <span className="text-xs font-semibold text-slate-200">
            {plan.label}
          </span>
        </div>

        {plan.recommended && (
          <span className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
            <Sparkles className="h-3 w-3" />
            Best
          </span>
        )}

        {approved && (
          <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3 w-3" />
            Approved
          </span>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-slate-400">
        {plan.summary}
      </p>

      <ul className="mt-2 space-y-1">
        {plan.tradeoffs.map((tradeoff) => (
          <li
            key={tradeoff}
            className="flex gap-1.5 text-[10px] leading-4 text-slate-500"
          >
            <span className="text-slate-600">•</span>

            {tradeoff}
          </li>
        ))}
      </ul>

      {/* Confidence bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Confidence</span>

          <span className="font-mono text-slate-300">
            {plan.confidence}%
          </span>
        </div>

        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
          <motion.div
            className={`h-1.5 rounded-full ${
              selected ? "bg-purple-400" : "bg-slate-600"
            }`}
            animate={{ width: `${plan.confidence}%` }}
            initial={{ width: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove(plan);
          }}
          disabled={!incidentId || approving || approved}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            approved
              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
              : selected
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
          }`}
        >
          {approving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}

          {approved ? "Approved" : "Approve"}
        </button>

        {onSimulate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSimulate();
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-purple-500/40 px-2 py-1.5 text-[11px] font-semibold text-purple-300 transition hover:bg-purple-500/10"
          >
            <Play className="h-3 w-3" />

            Simulate
          </button>
        )}
      </div>
    </motion.div>
  );
}
