"use client";

import AnalyticsPage from "@/components/pages/AnalyticsPage";
import { useNexus } from "@/lib/nexus-context";

export default function AnalyticsRoute() {
  const { incidents, zones, teams, shelters, weather, wards } =
    useNexus();

  return (
    <div className="h-full overflow-y-auto">
      <AnalyticsPage
        incidents={incidents}
        zones={zones}
        teams={teams}
        shelters={shelters}
        weather={weather}
        wards={wards}
      />
    </div>
  );
}