"use client";

import { useEffect, useState } from "react";

export default function IstClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });

  return (
    <span className="font-mono text-[11px] tracking-widest text-slate-400">
      {time} <span className="text-slate-600">IST</span>
    </span>
  );
}