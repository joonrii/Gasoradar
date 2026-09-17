"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import type { FuelKey } from "@/lib/types";

type HistoryPoint = {
  date: string;
  fuels: Record<FuelKey, { min: number; average: number; count: number } | null>;
};

const fuelNames: Record<FuelKey, string> = {
  g95: "Gasolina 95",
  g98: "Gasolina 98",
  diesel: "Diésel A",
  dieselPlus: "Diésel premium",
};

function linePath(values: number[], min: number, max: number) {
  const width = 760;
  const height = 190;
  const range = Math.max(max - min, 0.01);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 24) - 12;
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PriceHistoryChart({ points, fuel, place }: { points: HistoryPoint[]; fuel: FuelKey; place: string }) {
  const [range, setRange] = useState("7D");
  const rangeDays: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1A": 365 };
  const available = useMemo(
    () => points.map((point) => ({ date: point.date, value: point.fuels[fuel] })).filter((point) => point.value),
    [fuel, points],
  );
  const series = available.slice(-rangeDays[range]);

  if (series.length < 2) {
    return (
      <section className="history-card history-empty">
        <div>
          <p className="eyebrow">Evolución del precio</p>
          <h2>Estamos construyendo el histórico de {place}.</h2>
        </div>
        <p>Desde hoy guardaremos los precios para que pronto puedas ver si conviene repostar o esperar.</p>
      </section>
    );
  }

  const cheapest = series.map((point) => point.value!.min);
  const averages = series.map((point) => point.value!.average);
  const all = [...cheapest, ...averages];
  const min = Math.min(...all) - 0.015;
  const max = Math.max(...all) + 0.015;
  const change = ((averages.at(-1)! - averages[0]) / averages[0]) * 100;

  return (
    <section className="history-card">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Evolución en {place}</p>
          <h2>{fuelNames[fuel]} durante los últimos {range === "1A" ? "12 meses" : `${rangeDays[range]} días`}</h2>
        </div>
        <div className="range-switch" aria-label="Rango temporal">
          {["7D", "30D", "90D", "1A"].map((option) => (
            <button
              key={option}
              className={range === option ? "active" : ""}
              disabled={available.length < rangeDays[option]}
              title={available.length >= rangeDays[option] ? `Últimos ${option}` : "Disponible cuando tengamos más histórico"}
              onClick={() => {
                setRange(option);
                track("history_range_change", { rango: option, combustible: fuel });
              }}
            >{option}</button>
          ))}
        </div>
      </div>
      <div className="chart-wrap" role="img" aria-label={`Gráfico de precios de ${fuelNames[fuel]} en ${place}`}>
        <svg viewBox="0 0 760 210" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="45" x2="760" y2="45" className="chart-grid" />
          <line x1="0" y1="105" x2="760" y2="105" className="chart-grid" />
          <line x1="0" y1="165" x2="760" y2="165" className="chart-grid" />
          <path d={linePath(averages, min, max)} className="chart-line average-line" />
          <path d={linePath(cheapest, min, max)} className="chart-line cheap-line" />
        </svg>
        <div className="chart-dates"><span>{series[0].date.slice(5).replace("-", "/")}</span><span>{series.at(-1)!.date.slice(5).replace("-", "/")}</span></div>
      </div>
      <div className="history-footer">
        <div className="chart-legend"><span><i className="legend-cheap" />Más barata</span><span><i className="legend-average" />Media de la ciudad</span></div>
        <p><strong>{change <= 0 ? "↓" : "↑"} {Math.abs(change).toFixed(1).replace(".", ",")}%</strong> en la última semana</p>
      </div>
      <small className="history-note">Los rangos se activan a medida que acumulamos datos suficientes para esta provincia.</small>
    </section>
  );
}
