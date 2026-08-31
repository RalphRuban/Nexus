"use client";

import { motion } from "framer-motion";

import {
  Bed,
  Boxes,
  Building2,
  Car,
  Package,
  Truck,
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
  Hospital,
  Shelter,
  Supply,
  Team,
  Vehicle,
} from "@/types/nexus";

interface ResourceOverviewProps {
  teams: Team[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  hospitals: Hospital[];
  supplies: Supply[];
}

const CATEGORY_ACCENT: Record<
  string,
  { chip: string; icon: string; label: string }
> = {
  teams: {
    chip: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-400",
    label: "text-emerald-300",
  },
  vehicles: {
    chip: "border-blue-500/30 bg-blue-500/10",
    icon: "text-blue-400",
    label: "text-blue-300",
  },
  shelters: {
    chip: "border-amber-500/30 bg-amber-500/10",
    icon: "text-amber-400",
    label: "text-amber-300",
  },
  hospitals: {
    chip: "border-rose-500/30 bg-rose-500/10",
    icon: "text-rose-400",
    label: "text-rose-300",
  },
  supplies: {
    chip: "border-slate-500/30 bg-slate-500/10",
    icon: "text-slate-400",
    label: "text-slate-300",
  },
};

function statusClass(status: string): string {
  const active = ["AVAILABLE", "OPERATIONAL", "DEPLOYED"];
  const warn = ["FULL", "LIMITED", "RESTRICTED"];

  if (active.includes(status)) {
    return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  }

  if (warn.includes(status)) {
    return "text-yellow-300 border-yellow-500/30 bg-yellow-500/10";
  }

  return "text-red-300 border-red-500/30 bg-red-500/10";
}

function occupancyPct(occupied: number, capacity: number): number {
  if (capacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((occupied / capacity) * 100));
}

function CategoryCard({
  id,
  icon,
  label,
  count,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const accent = CATEGORY_ACCENT[id];

  return (
    <motion.div
      variants={cinematicStaggerItem}
      className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${accent.chip}`}
          >
            {icon}
          </span>

          <span
            className={`text-[10px] font-semibold tracking-widest ${accent.label}`}
          >
            {label}
          </span>
        </div>

        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
          {count}
        </span>
      </div>

      <div className="mt-3 space-y-2">{children}</div>
    </motion.div>
  );
}

export default function ResourceOverview({
  teams,
  vehicles,
  shelters,
  hospitals,
  supplies,
}: ResourceOverviewProps) {
  const personnel = teams.reduce((sum, team) => sum + team.personnel, 0);
  const shelterBeds = shelters.reduce((sum, s) => sum + s.capacity, 0);
  const hospitalBeds = hospitals.reduce((sum, h) => sum + h.capacity, 0);

  return (
    <div className="space-y-5">
      <motion.div
        variants={cinematicReveal}
        initial="hidden"
        animate="visible"
      >
        <p className="text-[10px] font-semibold tracking-widest text-emerald-400">
          RESOURCE DEPOT
        </p>

        <h2 className="mt-1 text-lg font-bold text-white">
          City Resource Posture
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Teams, mobility, shelter and clinical capacity across the city.
        </p>
      </motion.div>

      {/* KPI strip */}
      <motion.div
        variants={cinematicStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        {[
          {
            label: "PERSONNEL",
            value: personnel,
            suffix: "",
            chip: "border-emerald-500/30 bg-emerald-500/10",
            icon: <Users className="h-4 w-4 text-emerald-400" />,
          },
          {
            label: "VEHICLES",
            value: vehicles.length,
            suffix: "",
            chip: "border-blue-500/30 bg-blue-500/10",
            icon: <Truck className="h-4 w-4 text-blue-400" />,
          },
          {
            label: "SHELTER BEDS",
            value: shelterBeds,
            suffix: "",
            chip: "border-amber-500/30 bg-amber-500/10",
            icon: <Building2 className="h-4 w-4 text-amber-400" />,
          },
          {
            label: "HOSPITAL BEDS",
            value: hospitalBeds,
            suffix: "",
            chip: "border-rose-500/30 bg-rose-500/10",
            icon: <Bed className="h-4 w-4 text-rose-400" />,
          },
          {
            label: "SUPPLY SKUS",
            value: supplies.length,
            suffix: "",
            chip: "border-slate-500/30 bg-slate-500/10",
            icon: <Boxes className="h-4 w-4 text-slate-400" />,
          },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={cinematicStaggerItem}
            {...microHover}
            className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${kpi.chip}`}
            >
              {kpi.icon}
            </span>

            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold tracking-widest text-slate-500">
                {kpi.label}
              </p>

              <p className="text-lg font-bold leading-tight text-white">
                <AnimatedNumber value={kpi.value} />
                <span className="text-sm font-semibold text-slate-500">
                  {kpi.suffix}
                </span>
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Category grid */}
      <motion.div
        variants={cinematicStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <CategoryCard
          id="teams"
          icon={<Users className="h-4 w-4 text-emerald-400" />}
          label="RESPONSE TEAMS"
          count={teams.length}
        >
          {teams.length === 0 && (
            <p className="text-[11px] text-slate-600">No teams deployed.</p>
          )}

          {teams.map((team) => (
            <div key={team.id} className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-medium text-slate-200">
                  {team.name}
                </p>

                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                    team.status
                  )}`}
                >
                  {team.status}
                </span>
              </div>

              <p className="mt-1 text-[10px] text-slate-500">
                {team.personnel} personnel · {team.vehicles} vehicles
                {team.current_zone ? ` · ${team.current_zone}` : ""}
              </p>
            </div>
          ))}
        </CategoryCard>

        <CategoryCard
          id="vehicles"
          icon={<Car className="h-4 w-4 text-blue-400" />}
          label="VEHICLES"
          count={vehicles.length}
        >
          {vehicles.length === 0 && (
            <p className="text-[11px] text-slate-600">No vehicles.</p>
          )}

          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">
                  {vehicle.type}
                </p>

                <p className="text-[10px] text-slate-500">{vehicle.id}</p>
              </div>

              <span
                className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                  vehicle.status
                )}`}
              >
                {vehicle.status}
              </span>
            </div>
          ))}
        </CategoryCard>

        <CategoryCard
          id="shelters"
          icon={<Building2 className="h-4 w-4 text-amber-400" />}
          label="SHELTERS"
          count={shelters.length}
        >
          {shelters.length === 0 && (
            <p className="text-[11px] text-slate-600">No shelters open.</p>
          )}

          {shelters.map((shelter) => {
            const pct = occupancyPct(shelter.occupied, shelter.capacity);

            return (
              <div key={shelter.id} className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-medium text-slate-200">
                    {shelter.name}
                  </p>

                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                      shelter.status
                    )}`}
                  >
                    {shelter.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {shelter.occupied.toLocaleString()} /{" "}
                    {shelter.capacity.toLocaleString()} occupied
                  </span>

                  <span className="font-mono text-slate-400">{pct}%</span>
                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-amber-500"
                  />
                </div>
              </div>
            );
          })}
        </CategoryCard>

        <CategoryCard
          id="hospitals"
          icon={<Bed className="h-4 w-4 text-rose-400" />}
          label="HOSPITALS"
          count={hospitals.length}
        >
          {hospitals.length === 0 && (
            <p className="text-[11px] text-slate-600">No hospitals on duty.</p>
          )}

          {hospitals.map((hospital) => {
            const pct = occupancyPct(hospital.occupied, hospital.capacity);

            return (
              <div key={hospital.id} className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-medium text-slate-200">
                    {hospital.name}
                  </p>

                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                      hospital.status
                    )}`}
                  >
                    {hospital.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {hospital.occupied} / {hospital.capacity} beds
                  </span>

                  <span className="font-mono text-slate-400">{pct}%</span>
                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-rose-500"
                  />
                </div>
              </div>
            );
          })}
        </CategoryCard>

        <CategoryCard
          id="supplies"
          icon={<Package className="h-4 w-4 text-slate-400" />}
          label="SUPPLIES"
          count={supplies.length}
        >
          {supplies.length === 0 && (
            <p className="text-[11px] text-slate-600">No supplies catalogued.</p>
          )}

          {supplies.map((supply) => (
            <div
              key={supply.id}
              className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">
                  {supply.name}
                </p>

                <p className="text-[10px] text-slate-500">{supply.location}</p>
              </div>

              <span className="shrink-0 text-xs font-semibold text-slate-300">
                {supply.quantity.toLocaleString()} {supply.unit}
              </span>
            </div>
          ))}
        </CategoryCard>

        {supplies.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800/60">
              <Package className="h-4 w-4 text-slate-400" />
            </span>

            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                SUPPLY POSTURE
              </p>

              <p className="text-sm font-semibold text-white">
                {supplies.length} SKUs tracked
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}