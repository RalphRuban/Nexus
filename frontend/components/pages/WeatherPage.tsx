"use client";

import { useMemo } from "react";

import { motion } from "framer-motion";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Cloud,
  CloudRain,
  Droplets,
  ExternalLink,
  FileText,
  MapPin,
  Thermometer,
  Users,
} from "lucide-react";

import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  cinematicReveal,
  cinematicStagger,
  cinematicStaggerItem,
  microHover,
} from "@/components/ui/motion";

import { IncidentReport, Ward, WeatherEvent } from "@/types/nexus";

interface WeatherPageProps {
  weather: WeatherEvent[];
  chartWeather: WeatherEvent[];
  reports: IncidentReport[];
  wards: Ward[];
}

const WARNING_STYLE: Record<string, string> = {
  NORMAL: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  WATCH: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  SEVERE: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  EXTREME: "text-red-300 border-red-500/30 bg-red-500/10",
};

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  MEDIUM: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  HIGH: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  CRITICAL: "text-red-300 border-red-500/30 bg-red-500/10",
};

const WARNING_COLORS: Record<string, string> = {
  NORMAL: "#22c55e",
  WATCH: "#eab308",
  SEVERE: "#f97316",
  EXTREME: "#dc2626",
};

const WARNING_RANK: Record<string, number> = {
  EXTREME: 3,
  SEVERE: 2,
  WATCH: 1,
  NORMAL: 0,
};

function statusClass(level: string, map: Record<string, string>): string {
  return map[level] ?? "text-slate-300 border-slate-500/30 bg-slate-500/10";
}

function SectionTitle({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
      <div className="flex items-center gap-2">
        {icon}

        <span className="text-[10px] font-semibold tracking-widest text-slate-400">
          {label}
        </span>
      </div>

      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
        {count}
      </span>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#e2e8f0",
};

export default function WeatherPage({
  weather,
  chartWeather,
  reports,
  wards,
}: WeatherPageProps) {
  const recentWeather = useMemo(
    () =>
      [...weather]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 30),
    [weather]
  );

  const latestEvent = recentWeather[0] ?? null;

  const totalPopulation = useMemo(
    () => wards.reduce((sum, w) => sum + w.population, 0),
    [wards]
  );

  const peakRainfall = useMemo(
    () =>
      recentWeather.reduce((max, e) => {
        const rain = e.rainfall_mm ?? e.value ?? 0;
        return rain > max ? rain : max;
      }, 0),
    [recentWeather]
  );

  const warningCounts = useMemo(() => {
    const counts: Record<string, number> = {
      NORMAL: 0,
      WATCH: 0,
      SEVERE: 0,
      EXTREME: 0,
    };

    for (const event of recentWeather) {
      counts[event.warning] = (counts[event.warning] ?? 0) + 1;
    }

    return counts;
  }, [recentWeather]);

  const zoneWarnings = useMemo(() => {
    const zones = new Map<string, { event: WeatherEvent; rank: number }>();

    for (const event of recentWeather) {
      const rank = WARNING_RANK[event.warning] ?? 0;
      const existing = zones.get(event.zone);

      if (!existing || rank > existing.rank) {
        zones.set(event.zone, { event, rank });
      }
    }

    return Array.from(zones.values())
      .map(({ event }) => ({
        zone: event.zone,
        warning: event.warning,
        rainfall_mm: event.rainfall_mm ?? event.value ?? 0,
      }))
      .sort(
        (a, b) =>
          (WARNING_RANK[b.warning] ?? 0) - (WARNING_RANK[a.warning] ?? 0)
      );
  }, [recentWeather]);

  const topWards = useMemo(
    () =>
      [...wards]
        .sort((a, b) => b.population - a.population)
        .slice(0, 15),
    [wards]
  );

  const rainfallByZone = useMemo(() => {
    const zones: WeatherEvent[] = [];

    for (const event of chartWeather) {
      const existing = zones.find((z) => z.zone === event.zone);

      if (!existing) {
        zones.push({ ...event, rainfall_mm: 0 });
      }
    }

    for (const event of chartWeather) {
      const existing = zones.find((z) => z.zone === event.zone);

      if (existing) {
        existing.rainfall_mm = (existing.rainfall_mm ?? 0) + (event.rainfall_mm ?? 0);
      }
    }

    return zones
      .map((zone) => ({
        name: zone.zone,
        rainfall: Math.round(((zone.rainfall_mm ?? 0) / chartWeather.length) * 10) / 10,
      }))
      .sort((a, b) => b.rainfall - a.rainfall);
  }, [chartWeather]);

  const warningPie = useMemo(() => {
    const counts: Record<string, number> = {
      NORMAL: 0,
      WATCH: 0,
      SEVERE: 0,
      EXTREME: 0,
    };

    for (const event of chartWeather) {
      counts[event.warning] = (counts[event.warning] ?? 0) + 1;
    }

    return (Object.keys(counts) as Array<keyof typeof counts>).map((key) => ({
      name: key,
      value: counts[key],
    }));
  }, [chartWeather]);

  const wardByZone = useMemo(() => {
    const totals = new Map<string, number>();

    for (const ward of wards) {
      totals.set(ward.zone, (totals.get(ward.zone) ?? 0) + ward.population);
    }

    return Array.from(totals.entries()).map(([zone, population]) => ({
      name: zone,
      population,
    }));
  }, [wards]);

  return (
    <div className="space-y-6 p-6">
      <motion.div
        variants={cinematicReveal}
        initial="hidden"
        animate="visible"
      >
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          WEATHER INTELLIGENCE
        </p>

        <h2 className="mt-1 text-lg font-bold text-white">
          Bengaluru Monsoon Analysis
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Historic daily rainfall records with live warning levels and ward
          census data.
        </p>
      </motion.div>

      {/* Current conditions hero */}
      <motion.div
        variants={cinematicStagger}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"
      >
        {latestEvent ? (
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10">
                <Cloud className="h-7 w-7 text-blue-400" />
              </span>

              <div>
                <p className="text-[9px] font-semibold tracking-widest text-slate-500">
                  CURRENT CONDITIONS
                </p>

                <p className="mt-0.5 text-sm font-semibold text-white">
                  {latestEvent.zone}
                </p>

                <p className="text-[10px] text-slate-500">
                  {new Date(latestEvent.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="flex items-center gap-1 text-[9px] tracking-widest text-slate-500">
                  <Droplets className="h-3 w-3" />

                  RAINFALL
                </p>

                <p className="mt-0.5 text-2xl font-bold text-white">
                  {latestEvent.rainfall_mm?.toFixed(1) ?? latestEvent.value ?? 0}
                  <span className="text-sm font-medium text-slate-500">
                    {" "}
                    mm
                  </span>
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1 text-[9px] tracking-widest text-slate-500">
                  <Thermometer className="h-3 w-3" />

                  TEMPERATURE
                </p>

                <p className="mt-0.5 text-2xl font-bold text-white">
                  {latestEvent.temp_min != null && latestEvent.temp_max != null
                    ? `${latestEvent.temp_min}°/${latestEvent.temp_max}°C`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-[9px] tracking-widest text-slate-500">
                  HUMIDITY
                </p>

                <p className="mt-0.5 text-2xl font-bold text-white">
                  {latestEvent.humidity_mean != null
                    ? `${latestEvent.humidity_mean}%`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-[9px] tracking-widest text-slate-500">
                  WARNING LEVEL
                </p>

                <span
                  className={`mt-1 inline-block rounded border px-2 py-1 text-[11px] font-semibold ${statusClass(
                    latestEvent.warning,
                    WARNING_STYLE
                  )}`}
                >
                  {latestEvent.warning}
                </span>
              </div>
            </div>

            {latestEvent.source && (
              <p className="shrink-0 text-end text-[9px] text-slate-600">
                {latestEvent.source}
              </p>
            )}
          </div>
        ) : (
          <p className="px-5 py-6 text-xs text-slate-500">
            Waiting for weather observations.
          </p>
        )}
      </motion.div>

      {/* Zone warning pills */}
      {zoneWarnings.length > 0 && (
        <motion.div
          variants={cinematicStagger}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2"
        >
          {zoneWarnings.map((entry) => (
            <motion.span
              key={entry.zone}
              variants={cinematicStaggerItem}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold ${statusClass(
                entry.warning,
                WARNING_STYLE
              )}`}
            >
              <MapPin className="h-3 w-3" />

              {entry.zone}

              <span className="font-mono opacity-70">
                {entry.rainfall_mm.toFixed(1)}mm
              </span>
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* KPI strip */}
      <motion.div
        variants={cinematicStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/10">
            <CloudRain className="h-4 w-4 text-blue-400" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
              RECORDS LOADED
            </p>

            <p className="mt-0.5 text-xl font-bold text-white">
              <AnimatedNumber value={weather.length} />
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
            <Droplets className="h-4 w-4 text-cyan-400" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
              PEAK RAINFALL
            </p>

            <p className="mt-0.5 text-xl font-bold text-white">
              <AnimatedNumber value={peakRainfall} decimals={1} />
              <span className="text-xs font-semibold text-slate-500"> mm</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
            <Users className="h-4 w-4 text-emerald-400" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
              RESIDENTS COVERED
            </p>

            <p className="mt-0.5 text-xl font-bold text-white">
              <AnimatedNumber value={totalPopulation} />
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10">
            <FileText className="h-4 w-4 text-purple-400" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
              FIELD REPORTS
            </p>

            <p className="mt-0.5 text-xl font-bold text-white">
              <AnimatedNumber value={reports.length} />
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400">
              TOTAL RAINFALL BY ZONE
            </p>

            <span className="text-[10px] text-slate-600">
              {chartWeather.length.toLocaleString()} records
            </span>
          </div>

          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainfallByZone} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: "#1e293b55" }}
                />
                <Bar dataKey="rainfall" radius={[4, 4, 0, 0]}>
                  {rainfallByZone.map((entry) => (
                    <Cell key={entry.name} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-[10px] font-semibold tracking-widest text-slate-400">
            WARNING DISTRIBUTION
          </p>

          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={warningPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="#0f172a"
                >
                  {warningPie.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={WARNING_COLORS[entry.name] ?? "#64748b"}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px]">
            {warningPie.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: WARNING_COLORS[entry.name] }}
                />
                {entry.name} {entry.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle
            icon={<CloudRain className="h-4 w-4 text-blue-400" />}
            label="RAINFALL HISTORY"
            count={recentWeather.length}
          />

          <div className="mt-2 space-y-2">
            {recentWeather.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/50 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    {event.rainfall_mm?.toFixed(1) ?? event.value ?? 0}{" "}
                    {event.unit}
                    <span className="text-[10px] font-normal text-slate-500">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {event.zone}
                    {event.humidity_mean != null
                      ? ` · ${event.humidity_mean}% RH`
                      : ""}
                    {event.temp_min != null && event.temp_max != null
                      ? ` · ${event.temp_min}°/${event.temp_max}°C`
                      : ""}
                    {event.source ? ` · ${event.source}` : ""}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                    event.warning,
                    WARNING_STYLE
                  )}`}
                >
                  {event.warning}
                </span>
              </div>
            ))}

            {recentWeather.length === 0 && (
              <p className="text-[11px] text-slate-500">No weather data.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle
              icon={<FileText className="h-4 w-4 text-blue-400" />}
              label="FIELD REPORTS"
              count={reports.length}
            />

            <div className="mt-2 space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-400">
                      {report.zone} · {report.source}
                    </p>

                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                        report.severity,
                        SEVERITY_STYLE
                      )}`}
                    >
                      {report.severity}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] leading-4 text-slate-300">
                    {report.summary}
                  </p>
                </div>
              ))}

              {reports.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  No field reports.
                </p>
              )}
            </div>
          </div>

          <div>
            <SectionTitle
              icon={<Users className="h-4 w-4 text-blue-400" />}
              label="WARD CENSUS"
              count={wards.length}
            />

            <div className="mt-2 rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-200">
                {totalPopulation.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">
                residents across {wards.length} wards
              </p>
            </div>

            <div className="mt-3 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={wardByZone}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    cursor={{ fill: "#1e293b55" }}
                  />
                  <Bar dataKey="population" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 space-y-2">
              {topWards.map((ward) => (
                <div
                  key={ward.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">
                      {ward.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {ward.zone} · literacy {ward.literacy_pct}%
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-semibold text-slate-300">
                    {ward.population.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Warning distribution: NORMAL {warningCounts.NORMAL} · WATCH{" "}
          {warningCounts.WATCH} · SEVERE {warningCounts.SEVERE} · EXTREME{" "}
          {warningCounts.EXTREME}
        </span>

        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 transition hover:text-blue-400"
        >
          Weather data: Open-Meteo (CC BY 4.0)
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}