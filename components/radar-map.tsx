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
      color: active ? "#ffcc65" : "#d8d3c7",
      fillColor: active ? "#ff5a36" : "#292b27",
      fillOpacity: active ? 0.7 : 0.48,
      opacity: active ? 1 : 0.72,
      weight: active ? 2 : 1,
    };
  }, [community?.code]);

  const bindCommunity = useCallback((feature: Feature, layer: L.Layer) => {
    const code = String(feature.properties?.CodINE ?? "").padStart(2, "0");
    const region = getCommunityByCode(code);
    if (!region) return;
    layer.bindTooltip(region.shortName, { className: "community-tooltip", sticky: true });
    layer.on({
      click: () => onCommunitySelect(region),
      mouseover: (event) => event.target.setStyle({ fillOpacity: 0.82, weight: 2 }),
      mouseout: (event) => event.target.setStyle(communityStyle(feature)),
    });
  }, [communityStyle, onCommunitySelect]);

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
      <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false}>
        {markers}
      </MarkerClusterGroup>
      {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />}
      <MapMotion focus={focus} community={community} />
    </MapContainer>
  );
}
