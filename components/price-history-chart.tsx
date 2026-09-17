"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import type { FuelKey } from "@/lib/types";

type FuelHistory = { min: number; average: number; count: number };
type HistoryPoint = { date: string; fuels: Record<FuelKey, FuelHistory | null> };
type SeriesPoint = { date: string; value: FuelHistory };

const fuelNames: Record<FuelKey, string> = {
  g95: "Gasolina 95", g98: "Gasolina 98", diesel: "Diésel A", dieselPlus: "Diésel premium",
};
const rangeDays: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1A": 365 };
const plot = { left: 72, right: 806, top: 20, bottom: 190 };

function formatPrice(value: number) {
  return `${value.toFixed(3).replace(".", ",")} €/L`;
}

function formatDate(value: string, long = false) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", long
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short" }).format(date);
}

function coordinates(values: number[], min: number, max: number) {
  const range = Math.max(max - min, 0.01);
  return values.map((value, index) => ({
    x: values.length === 1 ? (plot.left + plot.right) / 2 : plot.left + (index / (values.length - 1)) * (plot.right - plot.left),
    y: plot.bottom - ((value - min) / range) * (plot.bottom - plot.top),
  }));
}

function pathFrom(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

export function PriceHistoryChart({ points, fuel, place, province }: { points: HistoryPoint[]; fuel: FuelKey; place: string; province: string }) {
  const [range, setRange] = useState("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const available = useMemo(
    () => points
      .map((point) => ({ date: point.date, value: point.fuels[fuel] }))
      .filter((point): point is SeriesPoint => point.value !== null),
    [fuel, points],
  );
  const series = available.slice(-rangeDays[range]);

  if (series.length < 2) {
    return (
      <section className="history-card history-empty">
        <div><p className="eyebrow">Evolución del precio</p><h2>Estamos construyendo el histórico de {place}.</h2></div>
        <p>Desde hoy guardaremos los precios para que pronto puedas ver si conviene repostar o esperar.</p>
      </section>
    );
  }

  const cheapest = series.map((point) => point.value.min);
  const averages = series.map((point) => point.value.average);
  const rawMin = Math.min(...cheapest, ...averages);
  const rawMax = Math.max(...cheapest, ...averages);
  const padding = Math.max((rawMax - rawMin) * 0.12, 0.015);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const yTicks = [max, (max + min) / 2, min];
  const cheapPoints = coordinates(cheapest, min, max);
  const averagePoints = coordinates(averages, min, max);
  const activeIndex = Math.min(hoveredIndex ?? series.length - 1, series.length - 1);
  const active = series[activeIndex];
  const activeX = cheapPoints[activeIndex].x;
  const xTickIndexes = [...new Set([0, Math.round((series.length - 1) / 3), Math.round(((series.length - 1) * 2) / 3), series.length - 1])];
  const change = ((averages.at(-1)! - averages[0]) / averages[0]) * 100;

  return (
    <section className="history-card">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Referencia para {place} · datos del Ministerio</p>
          <h2>{fuelNames[fuel]} en {province}: últimos {range === "1A" ? "12 meses" : `${rangeDays[range]} días`}</h2>
        </div>
        <div className="range-switch" aria-label="Rango temporal">
          {Object.keys(rangeDays).map((option) => (
            <button key={option} className={range === option ? "active" : ""} disabled={available.length < rangeDays[option]}
              title={available.length >= rangeDays[option] ? `Últimos ${option}` : "Disponible cuando tengamos más histórico"}
              onClick={() => { setRange(option); setHoveredIndex(null); track("history_range_change", { rango: option, combustible: fuel }); }}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-readout" aria-live="polite">
        <strong>{formatDate(active.date, true)}</strong>
        <span><i className="legend-cheap" />Más barata <b>{formatPrice(active.value.min)}</b></span>
        <span><i className="legend-average" />Media provincial <b>{formatPrice(active.value.average)}</b></span>
        <small>{active.value.count} estaciones con precio</small>
      </div>

      <div className="chart-wrap" role="img" aria-label={`Evolución de ${fuelNames[fuel]} en la provincia de ${province}`} onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox="0 0 820 235" aria-hidden="true">
          {yTicks.map((tick, index) => {
            const y = plot.top + index * ((plot.bottom - plot.top) / 2);
            return <g key={tick}><line x1={plot.left} y1={y} x2={plot.right} y2={y} className="chart-grid" /><text x="62" y={y + 4} textAnchor="end" className="chart-axis-price">{tick.toFixed(2).replace(".", ",")} €</text></g>;
          })}
          {xTickIndexes.map((index) => <text key={series[index].date} x={cheapPoints[index].x} y="220" textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"} className="chart-axis-date">{formatDate(series[index].date)}</text>)}
          <path d={pathFrom(averagePoints)} className="chart-line average-line" />
          <path d={pathFrom(cheapPoints)} className="chart-line cheap-line" />
          <line x1={activeX} y1={plot.top} x2={activeX} y2={plot.bottom} className="chart-cursor" />
          <circle cx={averagePoints[activeIndex].x} cy={averagePoints[activeIndex].y} r="5" className="chart-dot average-dot" />
          <circle cx={cheapPoints[activeIndex].x} cy={cheapPoints[activeIndex].y} r="6" className="chart-dot cheap-dot" />
          {cheapPoints.map((point, index) => <circle key={series[index].date} cx={point.x} cy={point.y} r="12" className="chart-hit" onMouseEnter={() => setHoveredIndex(index)} onClick={() => setHoveredIndex(index)} />)}
        </svg>
      </div>

      <div className="history-footer">
        <div className="chart-legend"><span><i className="legend-cheap" />Más barata</span><span><i className="legend-average" />Media provincial</span></div>
        <p><strong>{change <= 0 ? "↓" : "↑"} {Math.abs(change).toFixed(1).replace(".", ",")}%</strong> en el periodo seleccionado</p>
      </div>
      <small className="history-note">Precios provinciales oficiales. Pasa el cursor o toca la gráfica para consultar cada fecha. Los rangos se activan al acumular datos suficientes.</small>
    </section>
  );
}
