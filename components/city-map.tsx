"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { fmtPrice } from "@/components/charts/chart-utils";
import { track } from "@/lib/analytics";
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

const title = (value: string) => value.toLocaleLowerCase("es-ES").replace(/(^|[\s,(-])([a-záéíóúüñ])/g, (_, a: string, b: string) => a + b.toLocaleUpperCase("es-ES"));
const brand = (value: string) => value.trim().split(/\s+/).map((word) => (word.length <= 3 ? word : word[0] + word.slice(1).toLocaleLowerCase("es-ES"))).join(" ");
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

  const ranked = useMemo(
    () => stations.filter((station) => station[fuel] !== null).sort((a, b) => (a[fuel] as number) - (b[fuel] as number)),
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
          <p>{ranked.length} con precio de {FUELS.find((f) => f.key === fuel)?.label.toLowerCase()} · media {fmtPrice(average)} €/L. Toca una para ver cómo llegar.</p>
        </div>
        <div className="seg-mini" role="group" aria-label="Combustible">
          {available.map((item) => (
            <button key={item.key} type="button" aria-pressed={fuel === item.key} onClick={() => { setFuel(item.key); setSelectedId(null); track("fuel_change", { combustible: item.key, origen: "mapa_ciudad" }); }}>
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
                  <span className="name"><b>{brand(station.brand)}</b><small>{title(station.address)}</small></span>
                  <span className="v">{fmtPrice(price)}<small>{Math.abs(diff) < 0.0005 ? "en la media" : `${diff < 0 ? "−" : "+"}${fmtPrice(Math.abs(diff) * 100, 1)} cént.`}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="city-map-canvas">
          <RadarMap
            stations={ranked}
            featuredIds={ranked.slice(0, 3).map((station) => station.id)}
            fuel={fuel}
            selectedId={selectedId}
            userPosition={null}
            focus={selected ? { lat: selected.lat, lng: selected.lng } : center}
            onSelect={select}
          />
          {selected ? (
            <div className="city-map-selected gg-glass" role="status">
              <div>
                <b>{brand(selected.brand)} · {fmtPrice(selected[fuel] as number)} €/L</b>
                <small>{title(selected.address)} · {selected.schedule}</small>
              </div>
              <a
                className="gg-cta"
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("directions_click", { station_id: selected.id, territorio: selected.province, combustible: fuel, origin: "mapa_ciudad" })}
              >
                Cómo llegar <span aria-hidden="true">↗</span>
              </a>
              <button type="button" className="close" onClick={() => setSelectedId(null)} aria-label="Cerrar">×</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
