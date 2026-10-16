"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtCents, fmtEuros, fmtPrice } from "@/components/charts/chart-utils";
import type { ZoneSummary } from "@/lib/zone";

// Una sola petición compartida por todas las tarjetas de zona de la página.
let zoneRequest: Promise<ZoneSummary | null> | null = null;
function requestZone() {
  zoneRequest ??= fetch("/api/zona")
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: { zone: ZoneSummary | null } | null) => payload?.zone ?? null)
    .catch(() => null);
  return zoneRequest;
}

// Empieza con una ciudad por defecto (para que la página esté completa al
// cargar) y la cambia por la zona aproximada del visitante si se conoce.
function useZone(initial: ZoneSummary | null) {
  const [zone, setZone] = useState(initial);
  useEffect(() => {
    let alive = true;
    requestZone().then((next) => { if (alive && next) setZone(next); });
    return () => { alive = false; };
  }, []);
  return zone;
}

export function ZoneCard({ initial }: { initial: ZoneSummary | null }) {
  const zone = useZone(initial);
  if (!zone) return null;
  return (
    <aside className="zone-card" aria-live="polite">
      <small>{zone.approximate ? "Tu zona" : "Ejemplo"} · {zone.city}</small>
      <strong>{zone.cheapest.brand}, {zone.cheapest.address}</strong>
      <div className="zone-price">{fmtPrice(zone.cheapest.price)}<span> €/L</span></div>
      <p>
        La gasolina 95 más barata de {zone.city} hoy: {fmtCents(zone.average - zone.cheapest.price)} menos que la media de la ciudad.
        {zone.approximate ? " Calculamos tu zona de forma aproximada, sin pedirte permiso." : ""}
      </p>
      <div className="zone-actions">
        <Link href={zone.path}>Ver {zone.city} →</Link>
        <Link href="/cerca" className="ghost">Cerca de mí</Link>
      </div>
    </aside>
  );
}

const TANK_LITRES = 50;

export function TankCard({ initial }: { initial: ZoneSummary | null }) {
  const zone = useZone(initial);
  if (!zone) return null;
  const rows = [
    { label: "En la más barata", sub: `${zone.cheapest.brand}, ${zone.cheapest.address}`, value: zone.cheapest.price * TANK_LITRES, color: "var(--cheap)" },
    { label: "En una gasolinera media", sub: `Media de ${zone.city}: ${fmtPrice(zone.average)} €/L`, value: zone.average * TANK_LITRES, color: "var(--muted)" },
    { label: "En la más cara", sub: `${zone.priciest.brand}, ${zone.priciest.address}`, value: zone.priciest.price * TANK_LITRES, color: "var(--high)" },
  ];
  const max = Math.max(...rows.map((row) => row.value));
  const saving = rows[2].value - rows[0].value;
  return (
    <section className="gg-card chart-card tank-card">
      <header className="chart-card-head"><div><h3>¿Cuánto te cuesta llenar el depósito?</h3><p>{TANK_LITRES} litros de gasolina 95 hoy en {zone.city}, según dónde repostes.</p></div></header>
      <div className="tank">
        {rows.map((row, i) => (
          <div className="tank-row" key={row.label}>
            <span><b>{fmtEuros(row.value)}</b> · {row.label}</span>
            <div className="tank-track"><div className="tank-fill" style={{ width: `${((row.value / max) * 100).toFixed(1)}%`, background: row.color, animationDelay: `${i * 120}ms` }} /></div>
            <small>{row.sub}</small>
          </div>
        ))}
        <div className="tank-saving">
          <span>Repostando en la más barata en lugar de en la más cara</span>
          <b>Ahorras {fmtEuros(saving)} cada vez</b>
          <span>≈ {Math.round(saving * 24)} € al año si llenas el depósito dos veces al mes.</span>
        </div>
      </div>
    </section>
  );
}
