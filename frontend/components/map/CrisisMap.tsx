"use client";

import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  Hospital,
  Road,
  Shelter,
  Zone,
} from "@/types/nexus";

interface CrisisMapProps {
  zones: Zone[];
  roads: Road[];
  shelters: Shelter[];
  hospitals: Hospital[];
}

const shelterIcon = new L.Icon({
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function zoneColor(risk: string) {
  if (risk === "HIGH") return "#ef4444";

  if (risk === "MEDIUM") return "#f59e0b";

  return "#22c55e";
}

function roadColor(status: string) {
  if (status === "BLOCKED") return "#ef4444";

  if (status === "RESTRICTED") return "#f59e0b";

  return "#38bdf8";
}

export default function CrisisMap({
  zones,
  roads,
  shelters,
  hospitals,
}: CrisisMapProps) {
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

        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.coordinates}
            pathOptions={{
              color: zoneColor(zone.risk_level),
              fillColor: zoneColor(zone.risk_level),
              fillOpacity: 0.25,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{zone.name}</strong>
              <br />
              Risk: {zone.risk_level}
              <br />
              Population: {zone.population.toLocaleString()}
              <br />
              Flood level: {zone.flood_level}m
            </Popup>
          </Polygon>
        ))}

        {roads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            pathOptions={{
              color: roadColor(road.status),
              weight: road.status === "BLOCKED" ? 6 : 4,
              opacity: 0.9,
            }}
          >
            <Popup>
              <strong>{road.name}</strong>
              <br />
              Status: {road.status}
            </Popup>
          </Polyline>
        ))}

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
            icon={shelterIcon}
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