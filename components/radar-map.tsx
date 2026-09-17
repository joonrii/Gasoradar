"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { FuelKey, Station } from "@/lib/types";

type Point = { lat: number; lng: number };
type PriceBand = "cheap" | "average" | "high";
type StationCluster = { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] };

function MapMotion({ focus }: { focus: Point | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
      map.setView([focus.lat, focus.lng], 12, { animate: false });
    }
  }, [focus, map]);
  return null;
}

function priceIcon(price: number, selected: boolean, band: PriceBand, featuredRank?: number) {
  const podiumClass = featuredRank ? ` featured podium-${featuredRank}` : "";
  const medal = featuredRank ? `<b>${featuredRank}</b>` : "";
  return L.divIcon({
    className: "price-marker-shell",
    html: `<span class="price-marker ${band}${podiumClass}${selected ? " selected" : ""}">${medal}${price.toFixed(3).replace(".", ",")}€</span>`,
    iconSize: featuredRank ? [84, 40] : [68, 32], iconAnchor: featuredRank ? [42, 20] : [34, 16],
  });
}

function clusterIcon(cluster: StationCluster, thresholds: { low: number; high: number }) {
  const prices = cluster.getAllChildMarkers().map((marker) => Number(marker.options.title)).filter(Number.isFinite);
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const band: PriceBand = cheapest <= thresholds.low ? "cheap" : cheapest <= thresholds.high ? "average" : "high";
  return L.divIcon({
    className: "station-cluster-shell",
    html: `<span class="station-cluster ${band}"><small>${cluster.getChildCount()} estaciones</small><strong>Desde ${cheapest.toFixed(3).replace(".", ",")} €</strong></span>`,
    iconSize: L.point(96, 44), iconAnchor: L.point(48, 22),
  });
}

const userIcon = L.divIcon({
  className: "user-marker-shell", html: '<span class="user-marker"><i></i></span>', iconSize: [30, 30], iconAnchor: [15, 15],
});

export function RadarMap({ stations, featuredIds, fuel, selectedId, userPosition, focus, onSelect }: {
  stations: Station[]; featuredIds: string[]; fuel: FuelKey; selectedId: string | null; userPosition: Point | null; focus: Point | null; onSelect: (station: Station) => void;
}) {
  const safeFocus = focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng) ? focus : null;
  const featuredSet = useMemo(() => new Set(featuredIds), [featuredIds]);
  const thresholds = useMemo(() => {
    const prices = stations.map((station) => station[fuel]).filter((price): price is number => price !== null).sort((a, b) => a - b);
    return prices.length ? { low: prices[Math.floor((prices.length - 1) * 0.33)], high: prices[Math.floor((prices.length - 1) * 0.66)] } : { low: 0, high: 0 };
  }, [fuel, stations]);

  return (
    <MapContainer center={safeFocus ? [safeFocus.lat, safeFocus.lng] : [40.4168, -3.7038]} zoom={safeFocus ? 12 : 6} minZoom={5} className="radar-map" zoomControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={13} iconCreateFunction={(cluster: StationCluster) => clusterIcon(cluster, thresholds)} maxClusterRadius={64} showCoverageOnHover={false}>
        {stations.filter((station) => !featuredSet.has(station.id)).map((station) => {
          const price = station[fuel];
          if (price === null) return null;
          const band: PriceBand = price <= thresholds.low ? "cheap" : price <= thresholds.high ? "average" : "high";
          return <Marker key={station.id} position={[station.lat, station.lng]} icon={priceIcon(price, selectedId === station.id, band)} title={String(price)} eventHandlers={{ click: () => onSelect(station) }} />;
        })}
      </MarkerClusterGroup>
      {stations.filter((station) => featuredSet.has(station.id)).map((station) => {
        const price = station[fuel];
        if (price === null) return null;
        const rank = featuredIds.indexOf(station.id) + 1;
        return <Marker key={`featured-${station.id}`} zIndexOffset={1000 - rank} position={[station.lat, station.lng]} icon={priceIcon(price, selectedId === station.id, "cheap", rank)} title={String(price)} eventHandlers={{ click: () => onSelect(station) }} />;
      })}
      {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />}
      <MapMotion focus={safeFocus} />
    </MapContainer>
  );
}
