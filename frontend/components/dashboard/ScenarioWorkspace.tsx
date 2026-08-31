"use client";

import { useCallback, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  CheckCircle2,
  FlaskConical,
  Gauge,
  Loader2,
  RefreshCw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import { useNexus } from "@/lib/nexus-context";

import LiveAgentPipeline from "@/components/dashboard/LiveAgentPipeline";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useToast } from "@/components/ui/Toast";
import { durations, easings } from "@/components/ui/motion";

import {
  Incident,
  Scenario,
  ScenarioMutations,
  ScenarioParamSpec,
  ScenarioPreset,
  Zone,
} from "@/types/nexus";

interface ScenarioWorkspaceProps {
  incident: Incident | null;
  zones: Zone[];
}

const LEVEL_COLOR: Record<string, string> = {
  LOW: "text-emerald-300 bg-emerald-500/10",
  MEDIUM: "text-yellow-300 bg-yellow-500/10",
  HIGH: "text-orange-300 bg-orange-500/10",
  CRITICAL: "text-red-300 bg-red-500/10",
};

const LEVEL_GAUGE: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const AGENT_STEPS = [
  "SENSING",
  "RESEARCH",
  "RISK",
  "GEOSPATIAL",
  "COORDINATOR",
  "DECISION",
];

function scoreDelta(baseline: number, result: number): string {
  const delta = result - baseline;

  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

export default function ScenarioWorkspace({
  incident,
  zones,
}: ScenarioWorkspaceProps) {
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [saved, setSaved] = useState<Scenario[]>([]);

  const [selectedPreset, setSelectedPreset] =
    useState<ScenarioPreset | null>(null);
  const [paramValues, setParamValues] = useState<
    Record<string, number | boolean>
  >({});
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
        const savedList = await api.getScenarios();

        if (!cancelled) {
          setSaved(savedList);
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
    setResult(null);
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.cinematic, ease: easings.micro }}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-purple-400">
          <Gauge className="h-3.5 w-3.5" />

          SCENARIO ENGINE
        </p>

        <h2 className="mt-1 text-lg font-bold text-white">
          What-if Workspace
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Model response choices and preview the fleet&apos;s predicted impact
          before you commit.
        </p>
      </motion.div>

      {!incident && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs text-slate-500">
            Select an incident in Overview (or pass an{" "}
            <span className="font-mono text-slate-400">incident</span> query
            param) to run &ldquo;what if?&rdquo; scenarios.
          </p>
        </div>
      )}

      {incident && (
        <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
          {/* LEFT: configuration */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                  TARGET INCIDENT
                </p>

                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    LEVEL_COLOR[incident.severity] ??
                    "text-slate-300 bg-slate-500/10"
                  }`}
                >
                  {incident.severity}
                </span>
              </div>

              <p className="mt-1 truncate text-sm font-semibold text-white">
                {incident.title}
              </p>

              <p className="text-[10px] text-slate-500">
                {incident.id} · {incident.type}
              </p>
            </div>

            {error && (
              <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2.5 text-[11px] text-red-300">
                {error}
              </div>
            )}

            {/* Presets */}
            <div className="space-y-2 border-b border-slate-800 p-4">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                WHAT IF...?
              </p>

              <div className="space-y-1.5">
                {presets.length === 0 && (
                  <p className="text-[11px] text-slate-600">
                    No presets available for this incident.
                  </p>
                )}

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

          {/* RIGHT: result workspace */}
          <div className="flex min-h-[480px] flex-col rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                MODELED IMPACT
              </p>

              {result && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    LEVEL_COLOR[result.result.risk.level] ??
                    "text-slate-300 bg-slate-500/10"
                  }`}
                >
                  {result.result.risk.level}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {running ? (
                <motion.div
                  key="running"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: durations.micro, ease: easings.micro }}
                  className="flex h-full flex-1 flex-col items-center justify-center gap-6 p-8"
                >
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />

                    <p className="mt-3 text-[10px] font-semibold tracking-widest text-purple-400">
                      SIMULATING
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Fleet is modeling {selectedPreset?.label ?? "scenario"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {AGENT_STEPS.map((step, index) => (
                      <motion.span
                        key={step}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.18,
                        }}
                        className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[9px] font-semibold tracking-widest text-purple-300"
                      >
                        {step}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex-1 space-y-4 overflow-y-auto p-4"
                >
                  <ResultBody result={result} />

                  <button
                    onClick={handleApply}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
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

                    {applied
                      ? "Applied to command center"
                      : "Apply scenario"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: durations.micro, ease: easings.micro }}
                  className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
                    <FlaskConical className="h-5 w-5 text-slate-600" />
                  </span>

                  <p className="text-xs text-slate-500">
                    Pick a preset, tune the levers, then run the scenario.
                  </p>

                  <p className="text-[10px] tracking-widest text-slate-600">
                    MODELED IMPACT APPEARS HERE
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
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

function ResultBody({ result }: { result: Scenario }) {
  const { baseline, result: modeled } = result;
  const delta = modeled.risk.score - baseline.risk.score;
  const gaugeColor =
    LEVEL_GAUGE[modeled.risk.level] ?? "#a855f7";

  // 180° arc gauge
  const radius = 80;
  const circumference = Math.PI * radius;
  const progress = Math.min(100, Math.max(0, modeled.risk.score));
  const gaugeOffset = circumference * (1 - progress / 100);

  return (
    <div className="space-y-4">
      {/* Gauge */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-purple-400" />

            <span className="text-[10px] font-semibold tracking-widest text-slate-400">
              PROJECTED RISK
            </span>
          </div>

          <div className="flex items-center gap-2">
            {delta >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-400" />
            )}

            <span
              className={`text-sm font-bold ${
                delta >= 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {scoreDelta(baseline.risk.score, modeled.risk.score)}
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-2 w-[200px]">
          <svg viewBox="0 0 200 105" className="w-full">
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#1e293b"
              strokeWidth="14"
              strokeLinecap="round"
            />

            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="14"
              strokeLinecap="round"
              initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: gaugeOffset }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}55)` }}
            />

            {/* Ticks */}
            {[25, 50, 75].map((tick) => {
              const angle = Math.PI * (1 - tick / 100);

              const x = 100 + 92 * Math.cos(angle);
              const y = 100 - 92 * Math.sin(angle);

              return <circle key={tick} cx={x} cy={y} r="1.5" fill="#475569" />;
            })}
          </svg>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
            <p className="text-3xl font-bold text-white">
              <AnimatedNumber value={modeled.risk.score} />
            </p>

            <p className="text-[10px] tracking-widest text-slate-500">
              /100 · {modeled.risk.level}
            </p>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-600">
          <span>
            baseline <span className="font-mono">{baseline.risk.score}</span>
          </span>

          <span>
            scenario <span className="font-mono">{modeled.risk.score}</span>
          </span>
        </div>
      </div>

      {/* Drivers */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Risk drivers
        </p>

        <div className="mt-2 space-y-1">
          {modeled.risk.drivers.map((driver) => (
            <p
              key={driver}
              className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-400"
            >
              <Target className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />

              {driver}
            </p>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Recommended action
          </span>

          <span className="text-xs font-bold text-white">
            {modeled.recommendation.action}
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          {modeled.recommendation.rationale}
        </p>

        {baseline.recommendation.action !==
          modeled.recommendation.action && (
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
          <LiveAgentPipeline
            steps={result.result.steps}
            compact
            animated={false}
          />
        </div>
      </div>

      {/* Roads affected */}
      {result.result.roads_affected.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Roads affected
          </p>

          <div className="mt-2 space-y-1">
            {result.result.roads_affected.map((road) => (
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
    </div>
  );
}