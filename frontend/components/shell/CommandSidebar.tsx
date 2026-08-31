"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";

import {
  Activity,
  BarChart3,
  BrainCircuit,
  Boxes,
  Building2,
  FlaskConical,
  LayoutDashboard,
  LifeBuoy,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { navItem } from "@/components/ui/motion";

const COMMAND_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/analysis", label: "AI Agents", icon: BrainCircuit },
  { href: "/resources", label: "Resources", icon: Boxes },
  { href: "/scenarios", label: "Simulation", icon: FlaskConical },
];

const OPERATIONS_ITEMS = [
  { href: "/vision", label: "Vision", icon: Building2 },
  { href: "/activity", label: "Activity", icon: LifeBuoy },
  { href: "/weather", label: "Weather", icon: Users },
];

export default function CommandSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex h-full w-[232px] shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
          <ShieldAlert className="h-5 w-5 text-blue-400" />
        </div>

        <div>
          <h1 className="text-sm font-bold tracking-[0.3em] text-white">
            NEXUS
          </h1>

          <p className="text-[9px] tracking-widest text-slate-600">
            COMMAND CENTER
          </p>
        </div>
      </div>

      {/* Command section */}
      <div className="mt-2 px-3">
        <p className="px-2 text-[9px] font-semibold tracking-[0.25em] text-slate-600">
          COMMAND
        </p>

        <nav className="mt-2 space-y-0.5">
          {COMMAND_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial="rest"
                  animate={active ? "active" : "rest"}
                  whileHover="hover"
                  variants={navItem}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium",
                    active
                      ? "bg-blue-500/10 text-blue-300"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nexus-nav-active"
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-400 glow-cyan"
                    />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active
                        ? "text-blue-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />

                  {item.label}

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Operations section */}
      <div className="mt-6 px-3">
        <p className="px-2 text-[9px] font-semibold tracking-[0.25em] text-slate-600">
          OPERATIONS
        </p>

        <nav className="mt-2 space-y-0.5">
          {OPERATIONS_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial="rest"
                  animate={active ? "active" : "rest"}
                  whileHover="hover"
                  variants={navItem}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium",
                    active
                      ? "bg-blue-500/10 text-blue-300"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nexus-nav-active"
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-400 glow-cyan"
                    />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active
                        ? "text-blue-400"
                        : "text-slate-600 group-hover:text-slate-300"
                    )}
                  />

                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick actions */}
      <div className="mt-auto px-3 pb-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />

          <span className="text-[10px] font-semibold tracking-wider text-emerald-400">
            SYSTEM LIVE
          </span>

          <span className="ml-auto">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="block h-1.5 w-1.5 rounded-full bg-emerald-400"
            />
          </span>
        </div>

        <Link
          href="/activity"
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200"
        >
          <Radio className="h-3.5 w-3.5 text-slate-500" />

          Activity Feed
        </Link>
      </div>
    </motion.aside>
  );
}