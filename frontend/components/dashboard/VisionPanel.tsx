"use client";

import { useRef, useState } from "react";

import { motion } from "framer-motion";

import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  ScanEye,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { api } from "@/lib/api";

import {
  ExtractedIncident,
  Location,
  VisionExtraction,
  Zone,
} from "@/types/nexus";

import { durations, easings } from "@/components/ui/motion";
import { useToast } from "@/components/ui/Toast";

interface VisionPanelProps {
  zones: Zone[];
  onIncidentCreated: () => void;
}

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const STAGGER = {
  hidden: { opacity: 0, y: 12 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: easings.cinematic,
      delay: index * 0.12,
    },
  }),
};

export default function VisionPanel({
  zones,
  onIncidentCreated,
}: VisionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [phase, setPhase] = useState<
    "idle" | "analyzing" | "result" | "creating" | "created"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [extraction, setExtraction] =
    useState<VisionExtraction | null>(null);
  const [editing, setEditing] = useState<ExtractedIncident | null>(null);

  const reset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setFile(null);
    setExtraction(null);
    setEditing(null);
    setError(null);
    setPhase("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = (selected: File | null) => {
    setError(null);

    if (!selected) {
      return;
    }

    if (!ACCEPTED.includes(selected.type)) {
      setError("Unsupported file. Upload a JPEG, PNG or WEBP image.");

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setExtraction(null);
    setEditing(null);
    setPhase("idle");
  };

  const analyze = async () => {
    if (!file) {
      return;
    }

    setPhase("analyzing");
    setError(null);

    try {
      const result = await api.extractImage(file);

      setExtraction(result);
      setEditing(result.incident);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setError("Image analysis failed. Please try again.");
      setPhase("idle");
    }
  };

  const updateField = (
    key: keyof ExtractedIncident,
    value: string | number | string[] | Location
  ) => {
    if (!editing) {
      return;
    }

    setEditing({ ...editing, [key]: value });
  };

  const createIncident = async () => {
    if (!editing) {
      return;
    }

    setPhase("creating");
    setError(null);

    try {
      await api.createIncident(editing);
      setPhase("created");
      onIncidentCreated();
      toast("success", `Incident ${editing.title} created from field report.`);
    } catch (err) {
      console.error(err);
      setError("Failed to create incident. Please check the fields.");
      toast("error", "Failed to create incident from field report.");
      setPhase("result");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easings.micro }}
        className="flex items-center gap-2 text-slate-500"
      >
        <ScanEye className="h-4 w-4" />

        <span className="text-[10px] font-semibold tracking-widest">
          MULTIMODAL INTAKE · GEMINI VISION
        </span>
      </motion.div>

      {phase === "created" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: durations.cinematic, ease: easings.cinematic }}
          className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-10 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg font-bold tracking-wider text-white"
          >
            INCIDENT CREATED
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-1 text-[11px] text-slate-400"
          >
            Vision analysis registered on the map. Agents dispatched for
            geospatial verification.
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={reset}
            className="glow-primary mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            <MapPin className="h-3.5 w-3.5" />
            New field report
          </motion.button>
        </motion.div>
      ) : (
        <>
          {!previewUrl ? (
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files?.[0] ?? null);
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed px-4 py-12 text-center transition ${
                dragging
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-slate-700 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-900"
              }`}
            >
              <motion.div
                animate={dragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <UploadCloud className="h-9 w-9 text-slate-500" />
              </motion.div>

              <p className="text-xs font-medium text-slate-300">
                Upload a field image
              </p>

              <p className="text-[10px] text-slate-600">
                Drag and drop or click to browse · JPEG / PNG / WEBP
              </p>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: easings.micro }}
              className="overflow-hidden rounded-xl border border-slate-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Field report preview"
                className="h-40 w-full object-cover"
              />
            </motion.div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
              {error}
            </p>
          )}

          {previewUrl && phase !== "result" && phase !== "creating" && (
            <div className="flex gap-2">
              <button
                onClick={analyze}
                disabled={phase === "analyzing"}
                className="glow-primary flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === "analyzing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {phase === "analyzing"
                  ? "Gemini is reading the image..."
                  : "Analyze with Gemini"}
              </button>

              <button
                onClick={reset}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          )}

          {phase === "analyzing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex items-center gap-2 text-blue-400">
                <Camera className="h-4 w-4 animate-pulse" />

                <span className="text-[10px] font-semibold tracking-widest">
                  GEMINI VISION PIPELINE
                </span>
              </div>

              {[
                "Reading field imagery",
                "Extracting incident signals",
                "Geolocating coordinates",
              ].map((label, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.3 + index * 0.5,
                    duration: 0.4,
                    ease: easings.micro,
                  }}
                  className="flex items-center gap-2 text-[11px] text-slate-400"
                >
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" />

                  {label}
                </motion.div>
              ))}
            </motion.div>
          )}

          {(phase === "result" || phase === "creating") &&
            extraction &&
            editing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <motion.p
                  variants={STAGGER}
                  custom={0}
                  initial="hidden"
                  animate="show"
                  className="text-[10px] font-semibold tracking-widest text-slate-400"
                >
                  EXTRACTED INCIDENT
                </motion.p>

                <motion.span
                  variants={STAGGER}
                  custom={0}
                  initial="hidden"
                  animate="show"
                  className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                >
                  <Sparkles className="h-3 w-3" />
                  {Math.round(extraction.confidence * 100)}% confidence
                </motion.span>
              </div>

              {extraction.mode === "deterministic" && (
                <p className="text-[10px] text-slate-600">
                  Offline mode — no GOOGLE_API_KEY set on the backend.
                </p>
              )}

              <motion.div
                variants={STAGGER}
                custom={1}
                initial="hidden"
                animate="show"
              >
                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    TITLE
                  </span>

                  <input
                    value={editing.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>
              </motion.div>

              <motion.div
                variants={STAGGER}
                custom={2}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-2"
              >
                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    TYPE
                  </span>

                  <input
                    value={editing.type}
                    onChange={(event) =>
                      updateField("type", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    SEVERITY
                  </span>

                  <select
                    value={editing.severity}
                    onChange={(event) =>
                      updateField("severity", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  >
                    {SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
              </motion.div>

              <motion.div
                variants={STAGGER}
                custom={3}
                initial="hidden"
                animate="show"
              >
                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    DESCRIPTION
                  </span>

                  <textarea
                    value={editing.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>
              </motion.div>

              <motion.div
                variants={STAGGER}
                custom={4}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 gap-2"
              >
                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    LATITUDE
                  </span>

                  <input
                    type="number"
                    step="any"
                    value={editing.location.latitude}
                    onChange={(event) =>
                      updateField("location", {
                        ...editing.location,
                        latitude: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    LONGITUDE
                  </span>

                  <input
                    type="number"
                    step="any"
                    value={editing.location.longitude}
                    onChange={(event) =>
                      updateField("location", {
                        ...editing.location,
                        longitude: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    POPULATION
                  </span>

                  <input
                    type="number"
                    min={0}
                    value={editing.affected_population}
                    onChange={(event) =>
                      updateField(
                        "affected_population",
                        Number(event.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </label>
              </motion.div>

              <motion.div
                variants={STAGGER}
                custom={5}
                initial="hidden"
                animate="show"
              >
                <label className="block">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500">
                    AFFECTED ZONES
                  </span>

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {zones.map((zone) => {
                      const selected = editing.affected_zones.includes(
                        zone.id
                      );

                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() =>
                            updateField(
                              "affected_zones",
                              selected
                                ? editing.affected_zones.filter(
                                    (id) => id !== zone.id
                                  )
                                : [...editing.affected_zones, zone.id]
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                            selected
                              ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                              : "border-slate-700 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {zone.id}
                        </button>
                      );
                    })}
                  </div>
                </label>
              </motion.div>

              <motion.div
                variants={STAGGER}
                custom={6}
                initial="hidden"
                animate="show"
              >
                <button
                  onClick={createIncident}
                  disabled={phase === "creating"}
                  className="glow-primary flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phase === "creating" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}

                  {phase === "creating"
                    ? "Registering incident..."
                    : "Create incident"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}