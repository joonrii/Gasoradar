"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { FuelKey, Station } from "@/lib/types";

type Point = { lat: number; lng: number };

function MapMotion({ focus }: { focus: Point | null }) {
  const map = useMap();

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 12, { duration: 0.8 });
  }, [focus, map]);

  return null;
}

function priceIcon(price: number, selected: boolean) {
  return L.divIcon({
    className: "price-marker-shell",
    html: `<span class="price-marker${selected ? " selected" : ""}">${price.toFixed(3).replace(".", ",")}€</span>`,
    iconSize: [70, 34],
    iconAnchor: [35, 17],
  });
}

const userIcon = L.divIcon({
  className: "user-marker-shell",
  html: '<span class="user-marker"><i></i></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function RadarMap({
  stations,
  fuel,
  selectedId,
  userPosition,
  focus,
  onSelect,
}: {
  stations: Station[];
  fuel: FuelKey;
  selectedId: string | null;
  userPosition: Point | null;
  focus: Point | null;
  onSelect: (station: Station) => void;
}) {
  const markers = useMemo(
    () =>
      stations.map((station) => {
        const price = station[fuel];
        if (price === null) return null;
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={priceIcon(price, selectedId === station.id)}
            eventHandlers={{ click: () => onSelect(station) }}
          />
        );
      }),
    [fuel, onSelect, selectedId, stations],
  );

  return (
    <MapContainer center={[40.25, -3.7]} zoom={6} minZoom={5} className="radar-map" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false}>
        {markers}
      </MarkerClusterGroup>
      {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />}
      <MapMotion focus={focus} />
    </MapContainer>
  );
}
