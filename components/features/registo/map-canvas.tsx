"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

// Pin custom (divIcon com SVG) — evita depender dos assets de imagem do Leaflet.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#00A651"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

/** Reage a cliques no mapa para mover o marcador. */
function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Recentra o mapa quando a posição muda por pesquisa. */
function Recenter({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), 12));
  }, [position, map]);
  return null;
}

interface Props {
  position: LatLng;
  raioKm: number;
  onChange: (p: LatLng) => void;
}

export default function MapCanvas({ position, raioKm, onChange }: Props) {
  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-card"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[position.lat, position.lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const m = e.target as L.Marker;
            const { lat, lng } = m.getLatLng();
            onChange({ lat, lng });
          },
        }}
      />
      <Circle
        center={[position.lat, position.lng]}
        radius={raioKm * 1000}
        pathOptions={{ color: "#00A651", fillColor: "#00A651", fillOpacity: 0.1 }}
      />
      <ClickHandler onPick={onChange} />
      <Recenter position={position} />
    </MapContainer>
  );
}
