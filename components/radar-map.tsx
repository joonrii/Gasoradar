"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Feature, GeoJsonObject } from "geojson";
import { getCommunityByCode, type Community } from "@/lib/communities";
import type { FuelKey, Station } from "@/lib/types";

type Point = { lat: number; lng: number };

function MapMotion({ focus, community }: { focus: Point | null; community: Community | null }) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], 12, { duration: 0.8 });
      return;
    }
    if (community) {
      map.flyTo(community.center, community.zoom, { duration: 0.8 });
      return;
    }
    map.fitBounds([[27.3, -18.8], [44.2, 4.6]], { padding: [18, 18] });
  }, [community, focus, map]);

  return null;
}

type PriceBand = "cheap" | "average" | "high";
type StationCluster = {
  getChildCount: () => number;
  getAllChildMarkers: () => L.Marker[];
};

function priceIcon(price: number, selected: boolean, band: PriceBand) {
  return L.divIcon({
    className: "price-marker-shell",
    html: `<span class="price-marker ${band}${selected ? " selected" : ""}">${price.toFixed(3).replace(".", ",")}€</span>`,
    iconSize: [68, 32],
    iconAnchor: [34, 16],
  });
}

function clusterIcon(cluster: StationCluster, thresholds: { low: number; high: number }) {
  const count = cluster.getChildCount();
  const prices = cluster
    .getAllChildMarkers()
    .map((marker) => Number(marker.options.title))
    .filter((price) => Number.isFinite(price));
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;
  const band: PriceBand = cheapest === null || cheapest <= thresholds.low
    ? "cheap"
    : cheapest <= thresholds.high
      ? "average"
      : "high";
  const priceLabel = cheapest === null
    ? "Ver precios"
    : `${cheapest.toFixed(3).replace(".", ",")} €`;

  return L.divIcon({
    className: "station-cluster-shell",
    html: `<span class="station-cluster ${band}"><small>Desde · ${count} est.</small><strong>${priceLabel}</strong></span>`,
    iconSize: L.point(82, 44),
    iconAnchor: L.point(41, 22),
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
  community,
  onCommunitySelect,
  onSelect,
}: {
  stations: Station[];
  fuel: FuelKey;
  selectedId: string | null;
  userPosition: Point | null;
  focus: Point | null;
  community: Community | null;
  onCommunitySelect: (community: Community) => void;
  onSelect: (station: Station) => void;
}) {
  const [communityMap, setCommunityMap] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/data/spain-communities.geojson")
      .then((response) => response.json() as Promise<GeoJsonObject>)
      .then((payload) => {
        if (active) setCommunityMap(payload);
      })
      .catch(() => {
        if (active) setCommunityMap(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const communityStyle = useCallback((feature?: Feature) => {
    const code = String(feature?.properties?.CodINE ?? "").padStart(2, "0");
    const active = community?.code === code;
    return {
      color: active ? "#d5f35a" : "#c5c6be",
      fillColor: active ? "#d5f35a" : "#292b27",
      fillOpacity: community ? 0 : 0.28,
      opacity: active ? 0.82 : community ? 0.1 : 0.68,
      weight: active ? 2 : 1,
      dashArray: active ? "6 5" : undefined,
    };
  }, [community]);

  const bindCommunity = useCallback((feature: Feature, layer: L.Layer) => {
    const code = String(feature.properties?.CodINE ?? "").padStart(2, "0");
    const region = getCommunityByCode(code);
    if (!region) return;
    layer.bindTooltip(region.shortName, { className: "community-tooltip", sticky: true });
    layer.on({
      click: () => onCommunitySelect(region),
      mouseover: (event) => event.target.setStyle({
        fillOpacity: community?.code === code ? 0.025 : community ? 0.08 : 0.42,
        opacity: 1,
        weight: community?.code === code ? 2 : 2,
      }),
      mouseout: (event) => event.target.setStyle(communityStyle(feature)),
    });
  }, [community, communityStyle, onCommunitySelect]);

  const priceThresholds = useMemo(() => {
    const prices = stations
      .map((station) => station[fuel])
      .filter((price): price is number => price !== null)
      .sort((a, b) => a - b);

    if (prices.length === 0) return { low: 0, high: 0 };
    return {
      low: prices[Math.floor((prices.length - 1) * 0.33)],
      high: prices[Math.floor((prices.length - 1) * 0.66)],
    };
  }, [fuel, stations]);

  const markers = useMemo(
    () =>
      stations.map((station) => {
        const price = station[fuel];
        if (price === null) return null;
        const band: PriceBand = price <= priceThresholds.low
          ? "cheap"
          : price <= priceThresholds.high
            ? "average"
            : "high";
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={priceIcon(price, selectedId === station.id, band)}
            title={String(price)}
            eventHandlers={{ click: () => onSelect(station) }}
          />
        );
      }),
    [fuel, onSelect, priceThresholds, selectedId, stations],
  );

  return (
    <MapContainer center={[39.2, -5.2]} zoom={5} minZoom={4} className="radar-map" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="dark-map-tiles"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {communityMap && (
        <GeoJSON
          key={community?.code ?? "spain"}
          data={communityMap}
          style={communityStyle}
          onEachFeature={bindCommunity}
        />
      )}
      <MarkerClusterGroup
        chunkedLoading
        disableClusteringAtZoom={12}
        iconCreateFunction={(cluster: StationCluster) => clusterIcon(cluster, priceThresholds)}
        maxClusterRadius={76}
        showCoverageOnHover={false}
      >
        {markers}
      </MarkerClusterGroup>
      {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />}
      <MapMotion focus={focus} community={community} />
    </MapContainer>
  );
}
