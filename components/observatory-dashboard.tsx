"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import type { ObservatorySeries } from "@/lib/observatory-data";
import type { FuelKey } from "@/lib/types";

const FUEL_OPTIONS: Array<{ key: FuelKey; label: string; short: string }> = [
  { key: "g95", label: "Gasolina 95", short: "95" },
  { key: "g98", label: "Gasolina 98", short: "98" },
  { key: "diesel", label: "Diésel A", short: "A" },
  { key: "dieselPlus", label: "Diésel premium", short: "A+" },
];

type Props = {
  national: ObservatorySeries[];
  territories: Record<string, ObservatorySeries[]>;
  coverage: { provinces: number; stations: number };
};

type Point = { date: string; value: number };

function price(value: number) { return value.toFixed(3).replace(".", ","); }
function percentage(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`; }
function dateLabel(date: string, long = false) {
  return new Intl.DateTimeFormat("es-ES", long ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "short" })
    .format(new Date(`${date}T12:00:00`)).replace(".", "");
}

function makePath(points: Point[], min: number, max: number, width = 860, height = 260, pad = 28) {
  const range = Math.max(max - min, 0.01);
  return points.map((point, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = pad + ((max - point.value) / range) * (height - pad * 2);
    return { x, y };
  });
}

export function ObservatoryDashboard({ national, territories, coverage }: Props) {
  const [fuel, setFuel] = useState<FuelKey>("g95");
  const [range, setRange] = useState<7 | 30>(30);
  const availableTerritories = useMemo(() => Object.keys(territories).sort((a, b) => a.localeCompare(b, "es")), [territories]);
  const [selectedTerritory, setSelectedTerritory] = useState("Andalucía");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const nationalSeries = useMemo(() => national
    .map((point) => ({ date: point.date, value: point.fuels[fuel]?.med }))
    .filter((point): point is Point => typeof point.value === "number")
    .slice(-range), [fuel, national, range]);
  const territorySeries = useMemo(() => (territories[selectedTerritory] ?? [])
    .map((point) => ({ date: point.date, value: point.fuels[fuel]?.med }))
    .filter((point): point is Point => typeof point.value === "number")
    .slice(-range), [fuel, range, selectedTerritory, territories]);
  const ranking = useMemo(() => availableTerritories
    .map((name) => ({ name, value: territories[name].at(-1)?.fuels[fuel]?.med, stations: territories[name].at(-1)?.fuels[fuel]?.n ?? 0 }))
    .filter((item): item is { name: string; value: number; stations: number } => typeof item.value === "number")
    .sort((a, b) => a.value - b.value), [availableTerritories, fuel, territories]);

  const start = nationalSeries[0]?.value ?? 0;
  const latest = nationalSeries.at(-1)?.value ?? 0;
  const change = start ? ((latest - start) / start) * 100 : 0;
  const lowest = ranking[0];
  const highest = ranking.at(-1);
  const selectedIndex = Math.min(hoveredIndex ?? nationalSeries.length - 1, nationalSeries.length - 1);
  const activeNational = nationalSeries[selectedIndex];
  const activeTerritory = territorySeries.find((point) => point.date === activeNational?.date);
  const chartValues = [...nationalSeries, ...territorySeries].map((point) => point.value);
  const dataMin = Math.min(...chartValues);
  const dataMax = Math.max(...chartValues);
  const padding = Math.max((dataMax - dataMin) * .14, .012);
  const min = dataMin - padding;
  const max = dataMax + padding;
  const nationalPoints = makePath(nationalSeries, min, max);
  const territoryPoints = makePath(territorySeries, min, max);
  const line = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const maxRankingValue = highest?.value ?? 1;

  function chooseFuel(nextFuel: FuelKey) {
    setFuel(nextFuel); setHoveredIndex(null); track("observatory_fuel_change", { combustible: nextFuel });
  }
  function chooseRange(nextRange: 7 | 30) {
    setRange(nextRange); setHoveredIndex(null); track("observatory_range_change", { rango: `${nextRange}d`, combustible: fuel });
  }
  function chooseTerritory(name: string) {
    setSelectedTerritory(name); setHoveredIndex(null); track("observatory_territory_select", { territorio: name, combustible: fuel });
  }

  return <section className="observatory-dashboard" aria-label="Panel de análisis de precios">
    <div className="observatory-controls">
      <div className="observatory-fuels" aria-label="Combustible">{FUEL_OPTIONS.map((option) => <button key={option.key} className={fuel === option.key ? "active" : ""} onClick={() => chooseFuel(option.key)}><span>{option.short}</span>{option.label}</button>)}</div>
      <div className="observatory-range" aria-label="Periodo"><button className={range === 7 ? "active" : ""} onClick={() => chooseRange(7)}>7 días</button><button className={range === 30 ? "active" : ""} onClick={() => chooseRange(30)}>30 días</button></div>
    </div>

    <section className="observatory-kpis" aria-label="Resumen nacional">
      <div><span>Media nacional</span><strong>{price(latest)}<small> €/L</small></strong><em>último dato disponible</em></div>
      <div className={change >= 0 ? "up" : "down"}><span>Variación · {range} días</span><strong>{percentage(change)}</strong><em>{change >= 0 ? "Ha subido" : "Ha bajado"} desde {dateLabel(nationalSeries[0]?.date ?? "")}</em></div>
      <div><span>Territorio más barato</span><strong>{lowest?.name ?? "—"}</strong><em>{lowest ? `${price(lowest.value)} €/L de media` : "Sin datos"}</em></div>
      <div><span>Mayor diferencia territorial</span><strong>{highest && lowest ? `${price(highest.value - lowest.value)} €` : "—"}</strong><em>entre media más alta y más baja</em></div>
    </section>

    <section className="observatory-chart-card">
      <div className="observatory-chart-heading"><div><p className="eyebrow">Evolución nacional</p><h2>El precio medio, día a día.</h2></div><label>Comparar con<select value={selectedTerritory} onChange={(event) => chooseTerritory(event.target.value)}>{availableTerritories.map((name) => <option key={name}>{name}</option>)}</select></label></div>
      <div className="observatory-readout"><strong>{activeNational ? dateLabel(activeNational.date, true) : ""}</strong><span><i className="national" />España <b>{activeNational ? `${price(activeNational.value)} €/L` : "—"}</b></span><span><i className="territory" />{selectedTerritory} <b>{activeTerritory ? `${price(activeTerritory.value)} €/L` : "—"}</b></span></div>
      <div className="observatory-chart" onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox="0 0 860 260" role="img" aria-label={`Evolución de ${FUEL_OPTIONS.find((option) => option.key === fuel)?.label} en España y ${selectedTerritory}`}>
          {[max, (max + min) / 2, min].map((tick, index) => { const y = 28 + index * 102; return <g key={tick}><line x1="28" x2="832" y1={y} y2={y} /><text x="20" y={y + 4} textAnchor="end">{price(tick)} €</text></g>; })}
          <path className="territory-line" d={line(territoryPoints)} /><path className="national-line" d={line(nationalPoints)} />
          {nationalPoints[selectedIndex] && <><line className="observatory-cursor" x1={nationalPoints[selectedIndex].x} x2={nationalPoints[selectedIndex].x} y1="28" y2="232" /><circle className="national-dot" cx={nationalPoints[selectedIndex].x} cy={nationalPoints[selectedIndex].y} r="6" />{territoryPoints[selectedIndex] && <circle className="territory-dot" cx={territoryPoints[selectedIndex].x} cy={territoryPoints[selectedIndex].y} r="5" />}</>}
          {nationalPoints.map((point, index) => <circle key={nationalSeries[index].date} className="observatory-hit" cx={point.x} cy="130" r="18" onMouseEnter={() => setHoveredIndex(index)} onClick={() => setHoveredIndex(index)} />)}
          <text x="28" y="255">{dateLabel(nationalSeries[0]?.date ?? "")}</text><text x="832" y="255" textAnchor="end">{dateLabel(nationalSeries.at(-1)?.date ?? "")}</text>
        </svg>
      </div>
      <div className="observatory-legend"><span><i className="national" />Media nacional</span><span><i className="territory" />{selectedTerritory}</span><small>La media pondera el precio comunicado por cada estación.</small></div>
    </section>

    <section className="territory-ranking"><div className="observatory-section-heading"><div><p className="eyebrow">Radiografía territorial</p><h2>¿Dónde está más barata?</h2></div><p>Ordenadas por precio medio de {FUEL_OPTIONS.find((option) => option.key === fuel)?.label.toLowerCase()} en el último día disponible.</p></div><div className="territory-list">{ranking.map((item, index) => <button key={item.name} className={item.name === selectedTerritory ? "selected" : ""} onClick={() => chooseTerritory(item.name)}><span className="territory-position">{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><span className="territory-bar"><i style={{ width: `${(item.value / maxRankingValue) * 100}%` }} /></span><b>{price(item.value)}<small> €/L</small></b><em>{item.stations.toLocaleString("es-ES")} estaciones</em></button>)}</div></section>
    <p className="observatory-note">Cobertura: {coverage.provinces} provincias y {coverage.stations.toLocaleString("es-ES")} estaciones con precio de gasolina 95 en el último día. Datos oficiales del Ministerio para la Transición Ecológica procesados por GasolinaGo.</p>
  </section>;
}

