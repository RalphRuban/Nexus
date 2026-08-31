"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import { useNexus } from "@/lib/nexus-context";

import LiveAgentPipeline from "@/components/dashboard/LiveAgentPipeline";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useToast } from "@/components/ui/Toast";

import {
  Incident,
  Scenario,
  ScenarioMutations,
  ScenarioParamSpec,
  ScenarioPreset,
  Zone,
} from "@/types/nexus";

interface ScenarioPanelProps {
  incident: Incident | null;
  zones: Zone[];
}

const LEVEL_COLOR: Record<string, string> = {
  LOW: "text-emerald-300 bg-emerald-500/10",
  MEDIUM: "text-yellow-300 bg-yellow-500/10",
  HIGH: "text-orange-300 bg-orange-500/10",
  CRITICAL: "text-red-300 bg-red-500/10",
};

function scoreDelta(baseline: number, result: number): string {
  const delta = result - baseline;

  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

export default function ScenarioPanel({
  incident,
  zones,
}: ScenarioPanelProps) {
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [saved, setSaved] = useState<Scenario[]>([]);

  const [selectedPreset, setSelectedPreset] =
    useState<ScenarioPreset | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number | boolean>>({});
  const [name, setName] = useState("");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<Scenario | null>(null);

  const incidentId = incident?.id ?? null;

  const { applyScenario, simulatedZoneIds } = useNexus();
  const { toast } = useToast();

  const applied =
    result !== null &&
    simulatedZoneIds.length > 0 &&
    result.mutations.zones.every((zone) =>
      simulatedZoneIds.includes(zone.id)
    );

  const loadSaved = useCallback(async () => {
    try {
      setSaved(await api.getScenarios());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (incidentId && !cancelled) {
        try {
          const data = await api.getScenarioPresets(incidentId);

          if (cancelled) return;

          setPresets(data);

          setSelectedPreset((current) => {
            const preset = current ?? data[0] ?? null;

            if (preset && preset !== current) {
              const defaults: Record<string, number | boolean> = {};

              for (const param of preset.params) {
                defaults[param.key] = param.default;
              }

              setParamValues(defaults);
            }

            return preset;
          });
        } catch (err) {
          console.error(err);
        }
      }

      try {
        const saved = await api.getScenarios();

        if (!cancelled) {
          setSaved(saved);
        }
      } catch (err) {
        console.error(err);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  const selectPreset = (preset: ScenarioPreset) => {
    setSelectedPreset(preset);

    const defaults: Record<string, number | boolean> = {};

    for (const param of preset.params) {
      defaults[param.key] = param.default;
    }

    setParamValues(defaults);
  };

  const buildMutations = useCallback((): ScenarioMutations => {
    if (!selectedPreset) {
      return { zones: [], roads: [], hospitals: [], incident: null };
    }

    const base = selectedPreset.mutations;

    const floodDelta = paramValues.flood_delta as number | undefined;
    const populationMultiplier =
      paramValues.population_multiplier as number | undefined;

    const zonesUpdated = base.zones.map((mutation) => {
      if (floodDelta === undefined) {
        return mutation;
      }

      const zone = zones.find((z) => z.id === mutation.id);

      const baseLevel = zone?.flood_level ?? 0;

      return {
        ...mutation,
        flood_level: Math.round((baseLevel + floodDelta) * 10) / 10,
      };
    });

    let incidentMutation = base.incident;

    if (populationMultiplier !== undefined && incident) {
      incidentMutation = {
        ...(incidentMutation ?? {}),
        affected_population: Math.round(
          incident.affected_population * populationMultiplier
        ),
      };
    }

    return {
      zones: zonesUpdated,
      roads: base.roads,
      hospitals: base.hospitals,
      incident: incidentMutation,
    };
  }, [selectedPreset, paramValues, zones, incident]);

  const runScenario = async () => {
    if (!incident || !selectedPreset) return;

    setRunning(true);
    setError(null);

    try {
      const created = await api.createScenario({
        name: name.trim() || selectedPreset.label,
        incident_id: incident.id,
        description: selectedPreset.description,
        template: selectedPreset.id,
        mutations: buildMutations(),
      });

      setResult(created);
      await loadSaved();
    } catch (err) {
      console.error(err);
      setError("Scenario run failed. Is the backend running?");
    } finally {
      setRunning(false);
    }
  };

  const handleApply = () => {
    if (!result) {
      return;
    }

    applyScenario(result);
  };

  const handleDelete = async (scenario: Scenario) => {
    try {
      await api.deleteScenario(scenario.id);
      setSaved((current) =>
        current.filter((item) => item.id !== scenario.id)
      );

      if (result?.id === scenario.id) {
        setResult(null);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Failed to delete scenario.");
    }
  };

  if (!incident) {
    return (
      <div>
        <div className="border-b border-slate-800 px-5 py-3">
          <p className="text-[10px] font-semibold tracking-widest text-purple-400">
            SCENARIO ENGINE
          </p>
        </div>

        <p className="px-5 py-6 text-xs text-slate-500">
          Select an incident to run &ldquo;what if?&rdquo; scenarios.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-slate-800 px-5 py-3">
        <p className="text-[10px] font-semibold tracking-widest text-purple-400">
          SCENARIO ENGINE
        </p>
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-5 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Preset selection */}
      <div className="space-y-2 border-b border-slate-800 p-4">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          WHAT IF...?
        </p>

        <div className="space-y-1.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                selectedPreset?.id === preset.id
                  ? "border-purple-500/50 bg-purple-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <p className="text-xs font-medium text-slate-200">
                {preset.label}
              </p>

              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Params */}
      {selectedPreset && (
        <div className="space-y-3 border-b border-slate-800 p-4">
          <p className="text-[10px] font-semibold tracking-widest text-slate-500">
            PARAMETERS
          </p>

          {selectedPreset.params.map((param) => (
            <ParamControl
              key={param.key}
              param={param}
              value={paramValues[param.key]}
              onChange={(value) =>
                setParamValues((current) => ({
                  ...current,
                  [param.key]: value,
                }))
              }
            />
          ))}

          <div>
            <label className="block text-[10px] font-medium text-slate-500">
              Scenario name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedPreset.label}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <button
            onClick={runScenario}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}

            Run scenario
          </button>
        </div>
      )}

      {/* Comparison */}
      {result && (
        <div className="border-b border-slate-800 p-4">
          <Comparison
            baseline={result.baseline}
            result={result.result}
          />

          <button
            onClick={handleApply}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
              applied
                ? "glow-primary bg-emerald-600 hover:bg-emerald-500"
                : "glow-primary bg-purple-600 hover:bg-purple-500"
            }`}
          >
            {applied ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}

            {applied ? "Applied to command center" : "Apply scenario"}
          </button>
        </div>
      )}

      {/* Saved scenarios */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest text-slate-500">
            SAVED SCENARIOS
          </p>

          <button
            onClick={loadSaved}
            className="text-slate-500 transition hover:text-slate-300"
            aria-label="Reload scenarios"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {saved.length === 0 && (
            <p className="text-[11px] text-slate-600">
              No scenarios saved yet.
            </p>
          )}

          {saved.map((scenario) => (
            <div
              key={scenario.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setResult(scenario)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-medium text-slate-200">
                    {scenario.name}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {scenario.id} · {scenario.incident_id}
                  </p>
                </button>

                <button
                  onClick={() => handleDelete(scenario)}
                  className="text-red-400/70 transition hover:text-red-300"
                  aria-label="Delete scenario"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: ScenarioParamSpec;
  value: number | boolean | undefined;
  onChange: (value: number | boolean) => void;
}) {
  if (param.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{param.label}</span>

        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-purple-500"
        />
      </label>
    );
  }

  const current = typeof value === "number" ? value : Number(param.default);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{param.label}</span>

        <span className="font-mono text-[10px] text-slate-500">
          {current}
        </span>
      </div>

      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-purple-500"
      />
    </div>
  );
}

function Comparison({
  baseline,
  result,
}: {
  baseline: Scenario["baseline"];
  result: Scenario["result"];
}) {
  const delta = result.risk.score - baseline.risk.score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-purple-400" />

        <span className="text-[10px] font-semibold tracking-widest text-slate-400">
          RESULT vs BASELINE
        </span>
      </div>

      {/* Risk comparison */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Baseline
            </p>

            <p className="mt-1 text-lg font-bold text-slate-200">
              <AnimatedNumber value={baseline.risk.score} />
              <span className="text-xs font-medium text-slate-500">
                /100
              </span>
            </p>

            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                LEVEL_COLOR[baseline.risk.level] ?? "text-slate-300 bg-slate-500/10"
              }`}
            >
              {baseline.risk.level}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {delta >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-400" />
            )}

            <span
              className={`mt-1 text-sm font-bold ${
                delta >= 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {scoreDelta(baseline.risk.score, result.risk.score)}
            </span>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Scenario
            </p>

            <p className="mt-1 text-lg font-bold text-purple-300">
              <AnimatedNumber value={result.risk.score} />
              <span className="text-xs font-medium text-slate-500">
                /100
              </span>
            </p>

            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                LEVEL_COLOR[result.risk.level] ?? "text-slate-300 bg-slate-500/10"
              }`}
            >
              {result.risk.level}
            </span>
          </div>
        </div>

        {/* Morphing risk bar */}
        <div className="mt-3">
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
              initial={{ width: `${baseline.risk.score}%` }}
              animate={{ width: `${result.risk.score}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </div>

          <div className="mt-1 flex justify-between text-[9px] text-slate-600">
            <span>baseline {baseline.risk.score}</span>
            <span>scenario {result.risk.score}</span>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          {result.risk.drivers.map((driver) => (
            <p
              key={driver}
              className="text-[10px] leading-4 text-slate-500"
            >
              • {driver}
            </p>
          ))}
        </div>
      </div>

      {/* Recommendation change */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Recommended action
          </span>

          <span className="text-xs font-bold text-white">
            {result.recommendation.action}
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          {result.recommendation.rationale}
        </p>

        {baseline.recommendation.action !==
          result.recommendation.action && (
          <p className="mt-2 text-[10px] text-yellow-400">
            Action changed from {baseline.recommendation.action}.
          </p>
        )}
      </div>

      {/* Agent trace */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Agent trace
        </p>

        <div className="mt-2">
          <LiveAgentPipeline steps={result.steps} compact animated={false} />
        </div>
      </div>

      {/* Roads affected */}
      {result.roads_affected.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Roads affected
          </p>

          <div className="mt-2 space-y-1">
            {result.roads_affected.map((road) => (
              <p
                key={road}
                className="text-[11px] leading-4 text-slate-300"
              >
                {road}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}