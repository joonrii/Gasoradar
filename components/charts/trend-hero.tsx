"use client";

import { useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { dayLabel, fmtPrice, monotonePath, niceTicks } from "@/components/charts/chart-utils";
import { useWidth } from "@/components/charts/use-width";
import { track } from "@/lib/analytics";

type Fuel = "g95" | "diesel";
const FUELS: Array<{ key: Fuel; label: string; color: string }> = [
  { key: "g95", label: "Gasolina 95", color: "var(--s1)" },
  { key: "diesel", label: "Diésel A", color: "var(--s2)" },
];
const RANGES = [{ days: 7, label: "7 días" }, { days: 30, label: "30 días" }, { days: 0, label: "Todo" }];
const H = 260;
const M = { t: 30, r: 18, b: 28, l: 44 };

// Gráfico principal de la portada: la cifra grande sigue al dedo o al ratón.
export function TrendHero({ dates: allDates, values }: { dates: string[]; values: Record<Fuel, Array<number | null>> }) {
  const [fuel, setFuel] = useState<Fuel>("g95");
  const [range, setRange] = useState(30);
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(720);

  const n = range ? Math.min(range, allDates.length) : allDates.length;
  const dates = allDates.slice(-n);
  const vals = values[fuel].slice(-n).map((value) => value ?? NaN);
  const meta = FUELS.find((item) => item.key === fuel)!;
  const rangeName = range ? `${range} días` : `${allDates.length} días`;

  const geometry = (() => {
    const finite = vals.filter(Number.isFinite);
    const ticks = niceTicks(Math.min(...finite), Math.max(...finite), 4);
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const x = (i: number) => M.l + (i / Math.max(1, vals.length - 1)) * (W - M.l - M.r);
    const y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0)) * (H - M.t - M.b);
    const points = vals.map((v, i) => [x(i), y(v)] as [number, number]);
    const line = monotonePath(points);
    const iMax = vals.indexOf(Math.max(...finite));
    const iMin = vals.lastIndexOf(Math.min(...finite));
    let iJump = 1;
    for (let i = 1; i < vals.length; i++) if (Math.abs(vals[i] - vals[i - 1]) > Math.abs(vals[iJump] - vals[iJump - 1])) iJump = i;
    const every = Math.ceil(vals.length / Math.max(2, Math.floor((W - M.l - M.r) / 72)));
    return { ticks, x, y, line, iMax, iMin, iJump, jump: vals[iJump] - vals[iJump - 1], every };
  })();

  const { ticks, x, y, line, iMax, iMin, iJump, jump, every } = geometry;
  const last = vals.length - 1;
  const cur = hover ?? last;
  const change = vals[cur] - vals[0];
  const annotations: Array<{ i: number; text: string; above: boolean }> = [{ i: iMax, text: `Máximo ${fmtPrice(vals[iMax])}`, above: true }];
  if (iMin !== last && iMin !== iMax) annotations.push({ i: iMin, text: `Mínimo ${fmtPrice(vals[iMin])}`, above: false });
  if (Math.abs(jump) >= 0.01 && !(Math.abs(iJump - iMin) <= 2 && iMin !== last)) {
    annotations.push({ i: iJump, text: `${dayLabel(dates[iJump])}: ${jump < 0 ? "−" : "+"}${fmtPrice(Math.abs(jump) * 100, 1)} cént. en un día`, above: Math.abs(iJump - iMax) > 2 && jump > 0 });
  }

  const pointerToIndex = (clientX: number, rect: DOMRect) =>
    Math.max(0, Math.min(last, Math.round((((clientX - rect.left) / rect.width) * W - M.l) / (W - M.l - M.r) * last)));

  return (
    <ChartCard
      className={`trend-card ${fuel}`}
      table={{ head: ["Día", "Gasolina 95", "Diésel A"], rows: allDates.slice(-n).map((date, i) => [dayLabel(date), fmtPrice(values.g95.slice(-n)[i] ?? 0), fmtPrice(values.diesel.slice(-n)[i] ?? 0)]).reverse() }}
      headerExtra={
        <div className="readout" aria-live="polite">
          <p className="eyebrow">{meta.label} · media en España</p>
          <div className="readout-value"><b>{fmtPrice(vals[cur])}</b><span>€/L</span></div>
          <p className="readout-sub">
            <span className={`chg ${change < 0 ? "good" : change > 0 ? "bad" : ""}`}>
              {Math.abs(change) < 0.0005 ? "Sin cambios" : `${change < 0 ? "↓" : "↑"} ${fmtPrice(Math.abs(change) * 100, 1)} cént.`}
            </span>{" "}
            {cur === last ? `en ${rangeName} · hoy, ${dayLabel(dates[cur])}` : `desde el ${dayLabel(dates[0])} · ${dayLabel(dates[cur])}`}
          </p>
        </div>
      }
    >
      <div className="trend-controls">
        <div className="seg-mini" role="group" aria-label="Combustible">
          {FUELS.map((item) => (
            <button key={item.key} type="button" aria-pressed={fuel === item.key} onClick={() => { setFuel(item.key); track("fuel_change", { combustible: item.key, origen: "grafico_portada" }); }}>
              <i style={{ background: item.color }} />{item.label}
            </button>
          ))}
        </div>
        <div className="seg-mini" role="group" aria-label="Periodo">
          {RANGES.map((item) => (
            <button key={item.label} type="button" aria-pressed={range === item.days} onClick={() => setRange(item.days)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="chart" ref={ref}>
        <svg
          key={`${fuel}-${range}`}
          viewBox={`0 0 ${W} ${H}`}
          height={H}
          role="img"
          tabIndex={0}
          aria-label={`${meta.label}: precio medio en España en los últimos ${rangeName}. Usa las flechas para recorrer los días.`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); setHover(Math.max(0, cur - 1)); }
            if (event.key === "ArrowRight") { event.preventDefault(); setHover(Math.min(last, cur + 1)); }
          }}
          onBlur={() => setHover(null)}
        >
          <defs>
            <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: meta.color, stopOpacity: 0.24 }} />
              <stop offset="1" style={{ stopColor: meta.color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={M.l} x2={W - M.r} y1={y(tick)} y2={y(tick)} className="grid-line" />
              <text x={M.l - 8} y={y(tick) + 4} textAnchor="end">{fmtPrice(tick, 2)}</text>
            </g>
          ))}
          {dates.map((date, i) => {
            const isLast = i === last;
            if (!isLast && (i % every || last - i < every * 0.6)) return null;
            return <text key={date} x={x(i)} y={H - 8} textAnchor={isLast ? "end" : i === 0 ? "start" : "middle"}>{dayLabel(date)}</text>;
          })}
          <path className="trend-area" d={`${line}L${x(last)},${H - M.b}L${x(0)},${H - M.b}Z`} fill="url(#trend-grad)" />
          <path className="trend-line" d={line} pathLength={1} style={{ stroke: meta.color }} />
          {annotations.map((a) => {
            const ax = x(a.i);
            const ay = y(vals[a.i]);
            return (
              <g key={a.text} className="annotation">
                <circle cx={ax} cy={ay} r={4} style={{ fill: "var(--surface-solid)", stroke: meta.color }} strokeWidth={2} />
                <text x={ax} y={Math.max(12, Math.min(H - M.b - 4, a.above ? ay - 12 : ay + 20))} textAnchor={ax < W * 0.2 ? "start" : ax > W * 0.8 ? "end" : "middle"} className="annot">{a.text}</text>
              </g>
            );
          })}
          <circle cx={x(last)} cy={y(vals[last])} r={5} className="pulse" style={{ fill: meta.color }} />
          <circle cx={x(last)} cy={y(vals[last])} r={5} style={{ fill: meta.color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
          {hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.t - 10} y2={H - M.b} className="crosshair" />
              <circle cx={x(hover)} cy={y(vals[hover])} r={6} style={{ fill: meta.color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
            </g>
          ) : null}
          <rect
            x={M.l}
            y={0}
            width={W - M.l - M.r}
            height={H - M.b}
            className="hit"
            onPointerMove={(event) => setHover(pointerToIndex(event.clientX, event.currentTarget.ownerSVGElement!.getBoundingClientRect()))}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      </div>
      <p className="chart-note">Media de todas las gasolineras de la península y Baleares. Pasa el dedo o el ratón por el gráfico para ver cada día.</p>
    </ChartCard>
  );
}
