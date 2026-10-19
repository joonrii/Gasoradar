"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtEuros, fmtPrice } from "@/components/charts/chart-utils";
import { CitySearch } from "@/components/city-search";
import { SevenSeg, padDisplay } from "@/components/seven-seg";
import { track } from "@/lib/analytics";
import type { ZoneStation, ZoneSummary } from "@/lib/zone";

const LITRES = 50;
const FILL_MS = 2600;

// Una sola petición por página para conocer la zona aproximada del visitante.
let zoneRequest: Promise<ZoneSummary | null> | null = null;
function requestZone() {
  zoneRequest ??= fetch("/api/zona")
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: { zone: ZoneSummary | null } | null) => payload?.zone ?? null)
    .catch(() => null);
  return zoneRequest;
}

function useZone(initial: ZoneSummary | null) {
  const [zone, setZone] = useState(initial);
  useEffect(() => {
    let alive = true;
    requestZone().then((next) => { if (alive && next) setZone(next); });
    return () => { alive = false; };
  }, []);
  return zone;
}

// El surtidor frena al final, como uno de verdad.
const pumpEase = (t: number) => (t < 0.85 ? (t / 0.85) * 0.93 : 0.93 + (1 - Math.pow(1 - (t - 0.85) / 0.15, 3)) * 0.07);

function useFill(key: string) {
  const [litres, setLitres] = useState(LITRES);
  const [filling, setFilling] = useState(false);
  const frame = useRef(0);
  const run = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setLitres(LITRES); setFilling(false); return; }
    const start = performance.now();
    setFilling(true);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FILL_MS);
      setLitres(LITRES * pumpEase(t));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else setFilling(false);
    };
    frame.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => {
    // Arranca en el siguiente fotograma: la página se pinta primero completa.
    const id = requestAnimationFrame(run);
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(frame.current); };
  }, [key, run]);
  return { litres, filling, run };
}

function Pump({ station, tag, dear, litres, filling }: { station: ZoneStation; tag: string; dear?: boolean; litres: number; filling: boolean }) {
  return (
    <figure className={`pump${dear ? " dear" : ""}${filling ? " filling" : ""}`}>
      <figcaption className="pump-tag"><b>{station.brand}</b><span>{tag}</span></figcaption>
      <div className="pump-screen">
        <div className="pump-row main"><small>Importe €</small><SevenSeg text={padDisplay(station.price * litres, 2, 6)} label={`${fmtEuros(station.price * LITRES)} por ${LITRES} litros`} /></div>
        <div className="pump-row"><small>Litros</small><SevenSeg text={padDisplay(litres, 2, 5)} label={`${LITRES} litros`} /></div>
        <div className="pump-row sub"><small>Precio €/L</small><SevenSeg text={fmtPrice(station.price)} label={`${fmtPrice(station.price)} euros el litro`} /></div>
      </div>
      <div className="pump-nozzle" aria-hidden="true" />
    </figure>
  );
}

export function PumpHero({ initial, updated }: { initial: ZoneSummary | null; updated: string }) {
  const zone = useZone(initial);
  const { litres, filling, run } = useFill(zone?.city ?? "");
  if (!zone) return null;
  const saving = (zone.priciest.price - zone.cheapest.price) * LITRES;
  const done = !filling && litres >= LITRES;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${zone.cheapest.lat},${zone.cheapest.lng}`;

  return (
    <section className="pump-hero gg-glass" aria-labelledby="pump-title">
      <div className="pump-copy">
        <p className="eyebrow">{zone.approximate ? `Hoy en ${zone.city}, tu zona` : `Hoy en ${zone.city}`} · precios oficiales del {updated}</p>
        <h1 id="pump-title">En {zone.city}, llenar el depósito te cuesta {fmtEuros(saving)} menos si sabes dónde.</h1>
        <p>
          <b>{zone.cheapest.brand}</b>, {zone.cheapest.address}, tiene hoy la gasolina 95 más barata: <b>{fmtPrice(zone.cheapest.price)} €/L</b>
          {zone.cheapest.schedule === "Abierta 24 horas" ? ", abierta 24 horas" : ""}. La más cara de la ciudad está a {fmtPrice(zone.priciest.price)} €/L.
        </p>
        <div className="pump-actions">
          <a className="gg-cta" href={mapsUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => track("directions_click", { territorio: zone.city, combustible: "g95", origin: "portada_surtidor" })}>
            Cómo llegar a {zone.cheapest.brand}
          </a>
          <Link className="text-link" href={zone.path}>Ver todas las gasolineras de {zone.city}</Link>
        </div>
        <div className="pump-search">
          <span className="eyebrow">¿No estás en {zone.city}?</span>
          <CitySearch />
        </div>
      </div>
      <div className="pumps" aria-label={`Lo que cuesta llenar ${LITRES} litros en la más barata y en la más cara de ${zone.city}`}>
        <Pump station={zone.cheapest} tag="La más barata" litres={litres} filling={filling} />
        <Pump station={zone.priciest} tag="La más cara" dear litres={litres} filling={filling} />
        <div className={`pump-diff${done ? " show" : ""}`} aria-live="polite">{done ? `Ahorras ${fmtEuros(saving)} en este depósito` : ""}</div>
        <button type="button" className="replay" onClick={run}>Repostar otra vez</button>
      </div>
    </section>
  );
}
