"use client";

import VisionPanel from "@/components/dashboard/VisionPanel";
import { useNexus } from "@/lib/nexus-context";

export default function VisionPage() {
  const { zones, refresh } = useNexus();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <VisionPanel zones={zones} onIncidentCreated={() => refresh()} />
      </div>
    </div>
  );
}