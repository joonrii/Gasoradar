"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { fmtPrice } from "@/components/charts/chart-utils";
import { track } from "@/lib/analytics";
import { displayAddress, displayBrand, formatSchedule, isOpen24h } from "@/lib/format";
import type { FuelKey, Station } from "@/lib/types";

const RadarMap = dynamic(() => import("@/components/radar-map").then((module) => module.RadarMap), {
  ssr: false,
  loading: () => <div className="map-loading">Cargando el mapa…</div>,
});

const FUELS: Array<{ key: FuelKey; label: string }> = [
  { key: "g95", label: "Gasolina 95" },
  { key: "g98", label: "Gasolina 98" },
  { key: "diesel", label: "Diésel A" },
  { key: "dieselPlus", label: "Diésel premium" },
];

const INITIAL_ON_MAP = 20;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Lo primero de cada página de ciudad: dónde están las gasolineras y cuánto cuestan.
export function CityMap({ city, stations }: { city: string; stations: Station[] }) {
  const available = FUELS.filter((fuel) => stations.some((station) => station[fuel.key] !== null));
  const [fuel, setFuel] = useState<FuelKey>(available[0]?.key ?? "g95");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(
    // A igual precio, primero las abiertas 24 horas
    () => stations.filter((station) => station[fuel] !== null).sort((a, b) => (a[fuel] as number) - (b[fuel] as number) || Number(isOpen24h(b.schedule)) - Number(isOpen24h(a.schedule))),
    [fuel, stations],
  );
  const center = useMemo(
    () => (stations.length ? { lat: median(stations.map((s) => s.lat)), lng: median(stations.map((s) => s.lng)) } : null),
    [stations],
  );
  const average = ranked.length ? ranked.reduce((sum, station) => sum + (station[fuel] as number), 0) / ranked.length : 0;
  const selected = ranked.find((station) => station.id === selectedId) ?? null;

  function select(station: Station) {
    setSelectedId(station.id);
    track("station_view", { station_id: station.id, territorio: station.province, combustible: fuel, origen: "mapa_ciudad" });
  }

  return (
    <section className="gg-card city-map-card" aria-label={`Mapa de gasolineras de ${city}`}>
      <header className="city-map-head">
        <div>
          <h2>Mapa de gasolineras de {city}</h2>
          <p>{ranked.length} venden {FUELS.find((f) => f.key === fuel)?.label.toLowerCase()}, a {fmtPrice(average)} €/L de media. Toca una para ver cómo llegar.</p>
        </div>
        <div className="seg-mini" role="group" aria-label="Combustible">
          {available.map((item) => (
            <button key={item.key} type="button" aria-pressed={fuel === item.key} onClick={() => { setFuel(item.key); setSelectedId(null); setShowAll(false); track("fuel_change", { combustible: item.key, origen: "mapa_ciudad" }); }}>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className="city-map-body">
        <ol className="city-map-list">
          {ranked.slice(0, 10).map((station, index) => {
            const price = station[fuel] as number;
            const diff = price - average;
            return (
              <li key={station.id}>
                <button type="button" className={selectedId === station.id ? "selected" : ""} onClick={() => select(station)}>
                  <span className="n">{index + 1}</span>
                  <span className="name"><b>{displayBrand(station.brand)}</b><small>{displayAddress(station.address)}</small></span>
                  <span className="v">{fmtPrice(price)}<small>{Math.abs(diff) < 0.0005 ? "en la media" : `${fmtPrice(Math.abs(diff) * 100, 1)} cént. ${diff < 0 ? "menos" : "más"} que la media`}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="city-map-canvas">
          <RadarMap
            stations={showAll ? ranked : ranked.slice(0, INITIAL_ON_MAP)}
            featuredIds={ranked.slice(0, 3).map((station) => station.id)}
            fuel={fuel}
            selectedId={selectedId}
            userPosition={null}
            focus={selected ? { lat: selected.lat, lng: selected.lng } : center}
            onSelect={select}
          />
          {ranked.length > INITIAL_ON_MAP ? (
            <button type="button" className="map-toggle gg-glass" onClick={() => setShowAll((value) => !value)}>
              {showAll ? `Ver solo las ${INITIAL_ON_MAP} más baratas` : `Ver las ${ranked.length} en el mapa`}
            </button>
          ) : null}
          {selected ? (
            <div className="city-map-selected gg-glass" role="status">
              <div>
                <b>{displayBrand(selected.brand)}, {fmtPrice(selected[fuel] as number)} €/L</b>
                <small>{displayAddress(selected.address)}. {formatSchedule(selected.schedule)}</small>
              </div>
              <a
                className="gg-cta"
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("directions_click", { station_id: selected.id, territorio: selected.province, combustible: fuel, origin: "mapa_ciudad" })}
              >
                Cómo llegar
              </a>
              <button type="button" className="close" onClick={() => setSelectedId(null)} aria-label="Cerrar">×</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
