"use client";

import { useEffect, useState } from "react";

import WeatherPage from "@/components/pages/WeatherPage";
import { api } from "@/lib/api";
import { useNexus } from "@/lib/nexus-context";

import { WeatherEvent } from "@/types/nexus";

export default function WeatherRoute() {
  const { weather, reports, wards } = useNexus();

  const [chartWeather, setChartWeather] = useState<WeatherEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    api
      .getWeather({ limit: 1000 })
      .then((data) => {
        if (!cancelled) {
          setChartWeather(data);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <WeatherPage
        weather={weather}
        chartWeather={chartWeather.length > 0 ? chartWeather : weather}
        reports={reports}
        wards={wards}
      />
    </div>
  );
}