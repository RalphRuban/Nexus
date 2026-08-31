"use client";

import { useSearchParams } from "next/navigation";

import ScenarioWorkspace from "@/components/dashboard/ScenarioWorkspace";
import { useNexus } from "@/lib/nexus-context";

export default function ScenariosPage() {
  const searchParams = useSearchParams();
  const { incidents, selectedIncident, zones } = useNexus();

  const incidentParam = searchParams.get("incident");
  const incident =
    (incidentParam &&
      incidents.find((incident) => incident.id === incidentParam)) ||
    selectedIncident;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <ScenarioWorkspace incident={incident} zones={zones} />
      </div>
    </div>
  );
}