import {
  Activity,
  MapPin,
  Pencil,
  Trash2,
  Users,
  Waves,
} from "lucide-react";

import { Incident } from "@/types/nexus";

interface IncidentDetailsProps {
  incident: Incident | null;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 text-lg font-semibold text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function IncidentDetails({
  incident,
  onEdit,
  onDelete,
  compact = false,
}: IncidentDetailsProps) {
  if (!incident) {
    return (
      <section className="w-[320px] border-l border-slate-800 bg-slate-950 p-6">
        <p className="text-sm text-slate-500">
          Select an incident to view operational details.
        </p>
      </section>
    );
  }

  if (compact) {
    return (
      <section className="flex h-full items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/90 px-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold tracking-widest text-blue-400">
            SELECTED INCIDENT
          </p>

          <h2 className="mt-1 truncate text-sm font-semibold text-white">
            {incident.title}
          </h2>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-semibold text-red-300">
            {incident.severity}
          </span>

          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
            {incident.status}
          </span>

          {(onEdit || onDelete) && (
            <div className="ml-2 flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-800"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}

              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-300 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="w-[320px] overflow-y-auto border-l border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-5">
        <p className="text-[10px] font-semibold tracking-widest text-blue-400">
          INCIDENT DETAILS
        </p>

        <h2 className="mt-3 text-lg font-semibold text-white">
          {incident.title}
        </h2>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          {incident.description}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300">
            {incident.severity}
          </span>

          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            {incident.status}
          </span>
        </div>

        {(onEdit || onDelete) && (
          <div className="mt-4 flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-800"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded border border-red-500/30 px-3 py-1.5 text-[11px] text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Affected population"
          value={incident.affected_population.toLocaleString()}
        />

        <Stat
          icon={<Waves className="h-4 w-4" />}
          label="Incident type"
          value={incident.type}
        />

        <Stat
          icon={<MapPin className="h-4 w-4" />}
          label="Affected zones"
          value={incident.affected_zones.length.toString()}
        />

        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="Incident ID"
          value={incident.id}
        />
      </div>

      <div className="border-t border-slate-800 p-5">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          AFFECTED ZONES
        </p>

        <div className="mt-3 space-y-2">
          {incident.affected_zones.map((zone) => (
            <div
              key={zone}
              className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300"
            >
              {zone}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}