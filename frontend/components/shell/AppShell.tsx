"use client";

import { usePathname } from "next/navigation";

import { motion } from "framer-motion";

import { Plus, Radio, RefreshCw, ShieldAlert } from "lucide-react";

import IncidentCreateSheet from "@/components/dashboard/IncidentCreateSheet";
import CommandSidebar from "@/components/shell/CommandSidebar";
import IstClock from "@/components/shell/IstClock";
import CinematicBoot from "@/components/shell/CinematicBoot";
import { useNexus } from "@/lib/nexus-context";
import { durations, easings } from "@/components/ui/motion";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-8 w-8 animate-pulse text-blue-400" />

        <p className="mt-4 text-sm text-slate-400">
          Initializing NEXUS Command Center...
        </p>
      </div>
    </main>
  );
}

function ErrorScreen({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />

        <h1 className="mt-4 text-lg font-semibold text-white">
          Backend unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">{error}</p>

        <p className="mt-4 font-mono text-xs text-slate-600">
          Expected: http://localhost:8000
        </p>

        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry connection
        </button>
      </div>
    </main>
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const {
    loading,
    error,
    isPolling,
    retry,
    openCreate,
    handleReset,
    modalOpen,
    editingIncident,
    saving,
    closeModal,
    handleSubmit,
  } = useNexus();

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={retry} />;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <CinematicBoot />

      <div className="flex min-h-0 flex-1">
        <CommandSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Slim top bar */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-800/80 px-6">
            <div className="flex items-center gap-3">
              <IstClock />

              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
                <Radio
                  className={`h-3 w-3 text-emerald-400 ${
                    isPolling ? "animate-pulse" : ""
                  }`}
                />

                <span className="text-[10px] font-semibold tracking-widest text-emerald-400">
                  {isPolling ? "LIVE · SYNCING" : "LIVE"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>

              <button
                onClick={openCreate}
                className="glow-primary flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" />
                New Incident
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: durations.page,
                ease: easings.micro,
              }}
              className="h-full"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>

      <IncidentCreateSheet
        key={modalOpen ? "open" : "closed"}
        open={modalOpen}
        incident={editingIncident}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </main>
  );
}