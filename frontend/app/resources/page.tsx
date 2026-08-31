"use client";

import ResourceOverview from "@/components/dashboard/ResourceOverview";
import { useNexus } from "@/lib/nexus-context";

export default function ResourcesPage() {
  const { teams, vehicles, shelters, hospitals, supplies } = useNexus();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <ResourceOverview
          teams={teams}
          vehicles={vehicles}
          shelters={shelters}
          hospitals={hospitals}
          supplies={supplies}
        />
      </div>
    </div>
  );
}