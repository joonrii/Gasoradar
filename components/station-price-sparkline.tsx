"use client";

import { useEffect, useMemo, useState } from "react";
import type { FuelKey } from "@/lib/types";

type PricePoint = { date: string; price: number };

const formatPrice = (price: number) => price.toFixed(3).replace(".", ",");
const formatDate = (date: string) => new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));

function todayInSpain() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

export function StationPriceSparkline({
  stationId,
  fuel,
  currentPrice,
}: {
  stationId: string;
  fuel: FuelKey;
  currentPrice: number;
}) {
  const requestKey = `${stationId}:${fuel}`;
  const [result, setResult] = useState<{ key: string; points: PricePoint[] }>({ key: "", points: [] });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/station-history?station=${encodeURIComponent(stationId)}&fuel=${fuel}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el histórico");
        return response.json() as Promise<{ points: PricePoint[] }>;
      })
      .then(({ points }) => setResult({ key: requestKey, points }))
      .catch((error: Error) => {
        if (error.name !== "AbortError") setResult({ key: requestKey, points: [] });
      });

    return () => controller.abort();
  }, [fuel, requestKey, stationId]);

  const loading = result.key !== requestKey;

  const points = useMemo(() => {
    const history = result.key === requestKey ? result.points : [];
    const today = todayInSpain();
    const byDate = new Map(history.map((point) => [point.date, point.price]));
    byDate.set(today, currentPrice);
    return Array.from(byDate, ([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [currentPrice, requestKey, result]);

  if (loading) return <div className="station-sparkline sparkline-loading" aria-label="Cargando evolución de 30 días" />;
  if (points.length < 2) return <span className="sparkline-empty">Recopilando<br />histórico</span>;

  const width = 132;
  const height = 42;
  const padding = 4;
  const prices = points.map((point) => point.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const spread = Math.max(high - low, 0.01);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2),
    y: padding + ((high - point.price) / spread) * (height - padding * 2),
  }));
  const path = coordinates.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const first = points[0].price;
  const last = points.at(-1)?.price ?? currentPrice;
  const change = ((last - first) / first) * 100;
  const active = activeIndex === null ? null : coordinates[activeIndex];
  const trend = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";
  const trendLabel = trend === "up" ? `↑ ${Math.abs(change).toFixed(1).replace(".", ",")}%` : trend === "down" ? `↓ ${Math.abs(change).toFixed(1).replace(".", ",")}%` : "→ 0,0%";

  function choosePoint(clientX: number, target: SVGSVGElement) {
    const bounds = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div className="station-sparkline">
      {active && <span className="sparkline-tooltip">{formatDate(active.date)} · {formatPrice(active.price)} €/L</span>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        tabIndex={0}
        aria-label={`Evolución real de los últimos 30 días: de ${formatPrice(first)} a ${formatPrice(last)} euros por litro`}
        onPointerMove={(event) => choosePoint(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerDown={(event) => choosePoint(event.clientX, event.currentTarget)}
        onFocus={() => setActiveIndex(points.length - 1)}
        onBlur={() => setActiveIndex(null)}
      >
        <line className="sparkline-baseline" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <path className="sparkline-path" d={path} />
        {active && <circle className="sparkline-active-dot" cx={active.x} cy={active.y} r="3" />}
        <circle className="sparkline-last-dot" cx={coordinates.at(-1)?.x} cy={coordinates.at(-1)?.y} r="3.5" />
      </svg>
      <div className="sparkline-meta">
        <span>{points.length < 30 ? `30 días · ${points.length} datos` : "30 días"}</span>
        <strong className={trend}>{trendLabel}</strong>
      </div>
    </div>
  );
}
