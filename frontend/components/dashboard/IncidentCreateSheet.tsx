"use client";

import { useCallback, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { CheckCircle2, Loader2, X } from "lucide-react";

import {
  Incident,
  IncidentStatus,
  Severity,
} from "@/types/nexus";
import { IncidentPayload } from "@/lib/api";

import LiveAgentPipeline from "@/components/dashboard/LiveAgentPipeline";
import { durations, easings } from "@/components/ui/motion";

interface IncidentCreateSheetProps {
  open: boolean;
  incident: Incident | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: IncidentPayload) => Promise<void>;
}

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["ACTIVE", "MONITORING", "RESOLVED"];
const TYPES = ["FLOOD"];

const ORCHESTRATION_STEPS = [
  {
    agent: "coordinator",
    status: "COMPLETED" as const,
    summary: "Incident decomposed into operational tasks",
    timestamp: new Date().toISOString(),
  },
  {
    agent: "research",
    status: "COMPLETED" as const,
    summary: "Signals retrieved from field reports",
    timestamp: new Date().toISOString(),
  },
  {
    agent: "geospatial",
    status: "COMPLETED" as const,
    summary: "Road constraints and zone exposure identified",
    timestamp: new Date().toISOString(),
  },
  {
    agent: "risk",
    status: "COMPLETED" as const,
    summary: "Risk profile computed",
    timestamp: new Date().toISOString(),
  },
  {
    agent: "resource",
    status: "COMPLETED" as const,
    summary: "Resource allocation generated",
    timestamp: new Date().toISOString(),
  },
  {
    agent: "decision",
    status: "COMPLETED" as const,
    summary: "Response strategies generated",
    timestamp: new Date().toISOString(),
  },
];

type Phase = "form" | "submitting" | "created" | "agents";

function fieldClass(): string {
  return "w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-500";
}

export default function IncidentCreateSheet({
  open,
  incident,
  saving,
  onClose,
  onSubmit,
}: IncidentCreateSheetProps) {
  const isEdit = Boolean(incident);

  const [title, setTitle] = useState(incident?.title ?? "");
  const [type, setType] = useState(incident?.type ?? "FLOOD");
  const [severity, setSeverity] = useState(incident?.severity ?? "HIGH");
  const [status, setStatus] = useState(incident?.status ?? "ACTIVE");
  const [description, setDescription] = useState(incident?.description ?? "");
  const [latitude, setLatitude] = useState(
    incident ? String(incident.location.latitude) : "12.975"
  );
  const [longitude, setLongitude] = useState(
    incident ? String(incident.location.longitude) : "77.605"
  );
  const [population, setPopulation] = useState(
    incident ? String(incident.affected_population) : "0"
  );
  const [zones, setZones] = useState(incident?.affected_zones.join(", ") ?? "");

  const [phase, setPhase] = useState<Phase>("form");

  const submitDisabled = saving || !title.trim();

  const handleSubmit = async () => {
    const affected_zones = zones
      .split(",")
      .map((zone) => zone.trim())
      .filter(Boolean);

    const payload: IncidentPayload = {
      title,
      type,
      severity,
      status,
      description,
      location: {
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
      },
      affected_population: parseInt(population, 10) || 0,
      affected_zones,
    };

    setPhase("submitting");

    try {
      await onSubmit(payload);
    } catch {
      setPhase("form");

      return;
    }

    if (isEdit) {
      onClose();

      return;
    }

    setPhase("created");
  };

  const handleAgentsComplete = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0, filter: "blur(8px)" }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
            }}
            exit={{
              scale: 0.94,
              y: 12,
              opacity: 0,
              filter: "blur(6px)",
            }}
            transition={{ duration: durations.cinematic, ease: easings.cinematic }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
          >
            {(phase === "form" || phase === "submitting") && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-blue-400">
                      {isEdit ? "UPDATE INCIDENT" : "NEW INCIDENT"}
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {isEdit ? `Edit ${incident?.id}` : "Register a new incident"}
                    </h2>
                  </div>

                  <button
                    onClick={onClose}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Title
                    </label>

                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Northern District Flooding"
                      className={`${fieldClass()} mt-1`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">
                        Type
                      </label>

                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={`${fieldClass()} mt-1`}
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">
                        Severity
                      </label>

                      <select
                        value={severity}
                        onChange={(e) =>
                          setSeverity(e.target.value as Severity)
                        }
                        className={`${fieldClass()} mt-1`}
                      >
                        {SEVERITIES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Status
                    </label>

                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as IncidentStatus)
                      }
                      className={`${fieldClass()} mt-1`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Description
                    </label>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className={`${fieldClass()} mt-1 resize-none`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">
                        Latitude
                      </label>

                      <input
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        type="number"
                        step="0.0001"
                        className={`${fieldClass()} mt-1`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">
                        Longitude
                      </label>

                      <input
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        type="number"
                        step="0.0001"
                        className={`${fieldClass()} mt-1`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Affected population
                    </label>

                    <input
                      value={population}
                      onChange={(e) => setPopulation(e.target.value)}
                      type="number"
                      min="0"
                      className={`${fieldClass()} mt-1`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Affected zones (comma separated)
                    </label>

                    <input
                      value={zones}
                      onChange={(e) => setZones(e.target.value)}
                      placeholder="ZONE-N01, ZONE-N02"
                      className={`${fieldClass()} mt-1`}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                    className="glow-primary flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "submitting" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}

                    {isEdit
                      ? "Save changes"
                      : phase === "submitting"
                        ? "Creating..."
                        : "Create incident"}
                  </button>
                </div>
              </div>
            )}

            {phase === "created" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center px-6 py-10"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 16,
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="mt-4 text-lg font-bold tracking-wider text-white"
                >
                  INCIDENT CREATED
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="mt-1 text-[11px] text-slate-500"
                >
                  Dispatching NEXUS agents...
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 w-full max-w-sm"
                >
                  <LiveAgentPipeline
                    steps={ORCHESTRATION_STEPS}
                    stepDelay={340}
                    onComplete={handleAgentsComplete}
                  />
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}