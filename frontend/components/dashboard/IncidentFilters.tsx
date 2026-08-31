"use client";

import { Filter, X } from "lucide-react";

import { IncidentFilters } from "@/lib/api";

interface IncidentFiltersProps {
  filters: IncidentFilters;
  onChange: (filters: IncidentFilters) => void;
}

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["ACTIVE", "MONITORING", "RESOLVED"];
const TYPES = ["FLOOD"];

function isActive(filters: IncidentFilters): boolean {
  return Boolean(
    filters.severity || filters.status || filters.type
  );
}

export default function IncidentFiltersComponent({
  filters,
  onChange,
}: IncidentFiltersProps) {
  const setField = (key: keyof IncidentFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const clearAll = () => {
    onChange({});
  };

  return (
    <div className="space-y-3 border-b border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />

          <span className="text-[10px] font-semibold tracking-widest text-slate-500">
            FILTER INCIDENTS
          </span>
        </div>

        {isActive(filters) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-600">
            Severity
          </label>

          <select
            value={filters.severity ?? ""}
            onChange={(e) => setField("severity", e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-600">
            Status
          </label>

          <select
            value={filters.status ?? ""}
            onChange={(e) => setField("status", e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-600">
            Type
          </label>

          <select
            value={filters.type ?? ""}
            onChange={(e) => setField("type", e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
