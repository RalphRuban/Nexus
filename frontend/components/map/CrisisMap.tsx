"use client";

import { useMemo } from "react";

import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  Hospital,
  Incident,
  Road,
  Shelter,
  Ward,
  WeatherEvent,
  Zone,
} from "@/types/nexus";

interface CrisisMapProps {
  incidents: Incident[];
  zones: Zone[];
  roads: Road[];
  shelters: Shelter[];
  hospitals: Hospital[];
  weather: WeatherEvent[];
  wards: Ward[];
  selectedIncidentId: string | null;
  highlightZoneIds?: string[];
  highlightRoadIds?: string[];
  onSelectIncident: (incidentId: string) => void;
}

const shelterIcon = new L.Icon({
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const hospitalIcon = new L.Icon({
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function warningColor(warning: string) {
  switch (warning) {
    case "EXTREME":
      return "#dc2626";

    case "SEVERE":
      return "#f97316";

    case "WATCH":
      return "#eab308";

    default:
      return "#22c55e";
  }
}

function roadColor(status: string) {
  if (status === "BLOCKED") return "#ef4444";

  if (status === "RESTRICTED") return "#f59e0b";

  return "#38bdf8";
}

function incidentColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "#dc2626";

    case "HIGH":
      return "#f97316";

    case "MEDIUM":
      return "#eab308";

    default:
      return "#22c55e";
  }
}

export default function CrisisMap({
  incidents,
  zones,
  roads,
  shelters,
  hospitals,
  weather,
  wards,
  selectedIncidentId,
  highlightZoneIds = [],
  highlightRoadIds = [],
  onSelectIncident,
}: CrisisMapProps) {
  const latestWeatherByZone = useMemo(() => {
    const latest = new Map<string, WeatherEvent>();

    for (const event of weather) {
      const existing = latest.get(event.zone);
      if (
        !existing ||
        new Date(event.timestamp).getTime() > new Date(existing.timestamp).getTime()
      ) {
        latest.set(event.zone, event);
      }
    }

    return latest;
  }, [weather]);

  const wardPopulationByZone = useMemo(() => {
    const totals = new Map<string, number>();

    for (const ward of wards) {
      totals.set(ward.zone, (totals.get(ward.zone) ?? 0) + ward.population);
    }

    return totals;
  }, [wards]);

  const wardCountByZone = useMemo(() => {
    const counts = new Map<string, number>();

    for (const ward of wards) {
      counts.set(ward.zone, (counts.get(ward.zone) ?? 0) + 1);
    }

    return counts;
  }, [wards]);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[12.975, 77.605]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.map((zone) => {
          const selected = incidents.some(
            (incident) =>
              incident.id === selectedIncidentId &&
              incident.affected_zones.includes(zone.id)
          );

          const highlighted = highlightZoneIds.includes(zone.id);

          const weatherEvent = latestWeatherByZone.get(zone.id);
          const wardPopulation = wardPopulationByZone.get(zone.id);
          const wardCount = wardCountByZone.get(zone.id);
          const fillColor = weatherEvent
            ? warningColor(weatherEvent.warning)
            : "#334155";

          const rainfall = weatherEvent
            ? (weatherEvent.rainfall_mm ?? weatherEvent.value ?? 0).toFixed(1)
            : null;

          return (
            <Polygon
              key={zone.id}
              positions={zone.coordinates}
              pathOptions={{
                color: highlighted ? "#a855f7" : fillColor,
                fillColor: highlighted ? "#a855f7" : fillColor,
                fillOpacity: highlighted ? 0.55 : selected ? 0.5 : 0.3,
                weight: highlighted ? 4 : selected ? 3 : 2,
                className: highlighted
                  ? "animate-glow"
                  : selected
                  ? "animate-glow"
                  : "",
              }}
            >
              <Popup>
                <strong>{zone.name}</strong>
                <br />
                {weatherEvent ? (
                  <>
                    Latest record: {rainfall} {weatherEvent.unit}
                    <br />
                    Warning: {weatherEvent.warning}
                    <br />
                    Date:{" "}
                    {new Date(weatherEvent.timestamp).toLocaleDateString()}
                    <br />
                  </>
                ) : (
                  <>No real weather record.</>
                )}
                Population:{" "}
                {(wardPopulation ?? 0).toLocaleString()}
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  {" "}
                  (Census 2011, {wardCount ?? 0} wards)
                </span>
              </Popup>
            </Polygon>
          );
        })}

        {roads.map((road) => {
          const simulated = highlightRoadIds.includes(road.id);

          return (
            <Polyline
              key={road.id}
              positions={road.coordinates}
              pathOptions={{
                color: simulated ? "#a855f7" : roadColor(road.status),
                weight: simulated ? 7 : road.status === "BLOCKED" ? 6 : 4,
                opacity: simulated ? 0.85 : road.status === "BLOCKED" ? 0.7 : 0.9,
                className: simulated
                  ? "nexus-road animate-glow"
                  : road.status === "BLOCKED"
                    ? "nexus-road nexus-road-blocked"
                    : "nexus-road",
              }}
            >
              <Popup>
                <strong>{road.name}</strong>
                <br />
                Status: {road.status}
                {simulated && (
                  <>
                    <br />
                    <span style={{ color: "#a855f7" }}>Simulated impact</span>
                  </>
                )}
              </Popup>
            </Polyline>
          );
        })}

        {incidents.map((incident) => {
          const selected = incident.id === selectedIncidentId;
          const color = incidentColor(incident.severity);
          const critical = incident.severity === "CRITICAL";

          return (
            <CircleMarker
              key={incident.id}
              center={[
                incident.location.latitude,
                incident.location.longitude,
              ]}
              radius={selected ? 12 : 9}
              pathOptions={{
                color: "#ffffff",
                weight: selected ? 2 : 1,
                fillColor: color,
                fillOpacity: 0.9,
                className: critical ? "animate-blink" : "",
              }}
              eventHandlers={{
                click: () => onSelectIncident(incident.id),
              }}
            >
              <Popup>
                <strong>{incident.title}</strong>
                <br />
                {incident.id} · {incident.severity}
                <br />
                Status: {incident.status}
                <br />
                Population: {incident.affected_population.toLocaleString()}
              </Popup>
            </CircleMarker>
          );
        })}

        {shelters.map((shelter) => (
          <Marker
            key={shelter.id}
            position={[
              shelter.location.latitude,
              shelter.location.longitude,
            ]}
            icon={shelterIcon}
          >
            <Popup>
              <strong>{shelter.name}</strong>
              <br />
              Capacity: {shelter.capacity}
              <br />
              Occupied: {shelter.occupied}
            </Popup>
          </Marker>
        ))}

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[
              hospital.location.latitude,
              hospital.location.longitude,
            ]}
            icon={hospitalIcon}
          >
            <Popup>
              <strong>{hospital.name}</strong>
              <br />
              Status: {hospital.status}
              <br />
              Capacity: {hospital.capacity}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
