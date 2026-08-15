"use client";

import dynamic from "next/dynamic";

const CrisisMap = dynamic(
  () => import("./CrisisMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-500">
        Loading operational map...
      </div>
    ),
  }
);

export default CrisisMap;