"use client";

import { useMemo } from "react";

import { motion } from "framer-motion";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  LifeBuoy,
  Radar,
  Users,
} from "lucide-react";

import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  cinematicReveal,
  cinematicStagger,
  cinematicStaggerItem,
  microHover,
} from "@/components/ui/motion";

import {
  Incident,
  Shelter,
  Team,
  Ward,
  WeatherEvent,
  Zone,
} from "@/types/nexus";

interface AnalyticsPageProps {
  incidents: Incident[];
  zones: Zone[];
  teams: Team[];
  shelters: Shelter[];
  weather: WeatherEvent[];
  wards: Ward[];
}

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

const WARNING_WEIGHT: Record<string, number> = {
  NORMAL: 10,
  WATCH: 35,
  SEVERE: 65,
  EXTREME: 90,
};

const SEVERITY_WEIGHT: Record<string, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 100,
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#e2e8f0",
};

function eventRisk(event: WeatherEvent): number {
  const warning = WARNING_WEIGHT[event.warning] ?? 10;
  const rain = Math.min((event.rainfall_mm ?? event.value ?? 0) * 2, 50);
  return Math.min(100, warning + rain);
}

export default function AnalyticsPage({
  incidents,
  zones,
  teams,
  shelters,
  weather,
  wards,
}: AnalyticsPageProps) {
  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === "ACTIVE"),
    [incidents]
  );

  const peopleExposed = useMemo(
    () =>
      activeIncidents.reduce((sum, i) => sum + i.affected_population, 0),
    [activeIncidents]
  );

  const personnel = useMemo(
    () => teams.reduce((sum, t) => sum + t.personnel, 0),
    [teams]
  );

  const totalShelterCapacity = useMemo(
    () => shelters.reduce((sum, s) => sum + s.capacity, 0),
    [shelters]
  );

  const totalWardPopulation = useMemo(
    () => wards.reduce((sum, w) => sum + w.population, 0),
    [wards]
  );

  const coveragePct =
    peopleExposed > 0
      ? Math.min(100, Math.round((totalShelterCapacity / peopleExposed) * 100))
      : 0;

  const riskSeries = useMemo(() => {
    const byYear = new Map<string, { sum: number; count: number; incidents: number }>();

    for (const event of weather) {
      const year = event.timestamp.slice(0, 4);
      const entry = byYear.get(year) ?? { sum: 0, count: 0, incidents: 0 };
      entry.sum += eventRisk(event);
      entry.count += 1;
      byYear.set(year, entry);
    }

    for (const incident of incidents) {
      const year = incident.detected_at.slice(0, 4);
      const entry = byYear.get(year) ?? { sum: 0, count: 0, incidents: 0 };
      entry.incidents += 1;
      entry.sum += SEVERITY_WEIGHT[incident.severity] ?? 50;
      entry.count += 1;
      byYear.set(year, entry);
    }

    return Array.from(byYear.entries())
      .map(([year, entry]) => ({
        year,
        risk: Math.round(entry.sum / entry.count),
        incidents: entry.incidents,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [weather, incidents]);

  const severityPie = useMemo(() => {
    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const incident of incidents) {
      counts[incident.severity] = (counts[incident.severity] ?? 0) + 1;
    }

    return (Object.keys(counts) as Array<keyof typeof counts>)
      .filter((key) => counts[key] > 0)
      .map((key) => ({ name: key, value: counts[key] }));
  }, [incidents]);

  const zoneRiskBars = useMemo(() => {
    const counts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const zone of zones) {
      counts[zone.risk_level] = (counts[zone.risk_level] ?? 0) + 1;
    }

    return [
      { level: "HIGH", count: counts.HIGH },
      { level: "MEDIUM", count: counts.MEDIUM },
      { level: "LOW", count: counts.LOW },
    ];
  }, [zones]);

  return (
    <div className="space-y-6 p-6">
      <motion.div
        variants={cinematicReveal}
        initial="hidden"
        animate="visible"
      >
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          COMMAND ANALYTICS
        </p>

        <h2 className="mt-1 text-lg font-bold text-white">
          Bengaluru Response Dashboard
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Live exposure, resource readiness, and risk trends across the city.
        </p>
      </motion.div>

      {/* KPI cards */}
      <motion.div
        variants={cinematicStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Active incidents
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            <AnimatedNumber value={activeIncidents.length} />
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            {incidents.length - activeIncidents.length} monitoring / resolved
          </p>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              People exposed
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            <AnimatedNumber value={peopleExposed} />
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            of {totalWardPopulation.toLocaleString()} city residents
          </p>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/10">
              <LifeBuoy className="h-3.5 w-3.5 text-blue-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Response teams
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            <AnimatedNumber value={teams.length} />
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            {personnel} personnel on readiness
          </p>
        </motion.div>

        <motion.div
          variants={cinematicStaggerItem}
          {...microHover}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10">
              <Radar className="h-3.5 w-3.5 text-purple-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Shelter coverage
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            <AnimatedNumber value={coveragePct} />
            <span className="text-sm font-semibold text-slate-500">%</span>
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            {totalShelterCapacity.toLocaleString()} beds vs exposed
          </p>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk over time */}
        <motion.div
          variants={cinematicReveal}
          initial="hidden"
          animate="visible"
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400">
              RISK OVER TIME
            </p>

            <span className="text-[10px] text-slate-600">
              weather + incident derived · {riskSeries.length} years
            </span>
          </div>

          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={riskSeries}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="risk"
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="incidents"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fill: "#475569", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area
                  yAxisId="risk"
                  type="monotone"
                  dataKey="risk"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#riskFill)"
                  name="Risk index"
                />
                <Bar
                  yAxisId="incidents"
                  dataKey="incidents"
                  fill="#3b82f6"
                  radius={[3, 3, 0, 0]}
                  name="Incidents"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[10px] text-slate-600">
            Risk index composites rainfall, warnings, and incident severity per
            year.
          </p>
        </motion.div>

        {/* Severity + zone risk */}
        <motion.div
          variants={cinematicReveal}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400">
              INCIDENT SEVERITY
            </p>

            <div className="mt-3 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={36}
                    outerRadius={58}
                    paddingAngle={2}
                    stroke="#0f172a"
                  >
                    {severityPie.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SEVERITY_STYLE[entry.name] ?? "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px]">
              {severityPie.map((entry) => (
                <span
                  key={entry.name}
                  className="flex items-center gap-1.5 text-slate-400"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SEVERITY_STYLE[entry.name] }}
                  />
                  {entry.name} {entry.value}
                </span>
              ))}

              {severityPie.length === 0 && (
                <span className="text-slate-500">No incidents</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400">
              ZONE RISK LEVELS
            </p>

            <div className="mt-3 space-y-2">
              {zoneRiskBars.map((row) => (
                <div key={row.level}>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{row.level}</span>
                    <span>{row.count} zones</span>
                  </div>

                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.count / Math.max(zones.length, 1)) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          row.level === "HIGH"
                            ? "#f97316"
                            : row.level === "MEDIUM"
                              ? "#eab308"
                              : "#22c55e",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800/60">
              <Building2 className="h-4 w-4 text-slate-400" />
            </span>

            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                SHELTER CAPACITY
              </p>

              <p className="text-sm font-semibold text-white">
                <AnimatedNumber value={totalShelterCapacity} /> beds
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}