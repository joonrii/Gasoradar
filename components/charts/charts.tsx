"use client";

import { useState } from "react";
import { dayLabel, fmtPrice, monotonePath, niceTicks, segments, signedCents } from "@/components/charts/chart-utils";
import { useWidth } from "@/components/charts/use-width";

type TooltipRow = { color?: string; value: string; label?: string };
type TooltipState = { x: number; y: number; title: string; rows: TooltipRow[] } | null;

function Tooltip({ state }: { state: TooltipState }) {
  if (!state) return null;
  return (
    <div className="chart-tooltip" style={{ left: state.x, top: state.y }} role="status">
      <div className="t-title">{state.title}</div>
      {state.rows.map((row, i) => (
        <div className="t-row" key={i}>
          {row.color ? <i style={{ background: row.color }} /> : null}
          <b>{row.value}</b>
          {row.label ? <span>{row.label}</span> : null}
        </div>
      ))}
    </div>
  );
}

// ── Varias series en el tiempo, con cruceta ─────────────────────────────────
export type LineSeries = { name: string; color: string; values: Array<number | null> };

export function MultiLineChart({ dates, series, height = 240 }: { dates: string[]; series: LineSeries[]; height?: number }) {
  const [ref, W] = useWidth<HTMLDivElement>(720);
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const M = { t: 12, r: 64, b: 28, l: 44 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 4);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const last = dates.length - 1;
  const x = (i: number) => M.l + (i / Math.max(1, last)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const every = Math.ceil(dates.length / Math.max(2, Math.floor((W - M.l - M.r) / 72)));
  const ends = series
    .map((s, si) => { const seg = segments(s.values).at(-1); const end = seg?.at(-1); return end ? { s, si, i: end.index, v: end.value, yy: y(end.value) } : null; })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.yy - b.yy);
  const collide = ends.some((e, k) => k > 0 && e.yy - ends[k - 1].yy < 14);
  const cur = hover;
  const tooltip: TooltipState = cur === null ? null : {
    x: x(cur),
    y: Math.min(...series.map((s) => (s.values[cur] === null ? H : y(s.values[cur] as number)))),
    title: dayLabel(dates[cur]),
    rows: series.filter((s) => s.values[cur] !== null).sort((a, b) => (b.values[cur] as number) - (a.values[cur] as number)).map((s) => ({ color: s.color, value: `${fmtPrice(s.values[cur] as number)} €`, label: s.name })),
  };

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" tabIndex={0} aria-label={`${series.map((s) => s.name).join(", ")}: precio medio diario. Usa las flechas para recorrer los días.`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); setHover(Math.max(0, (cur ?? last) - 1)); }
          if (event.key === "ArrowRight") { event.preventDefault(); setHover(Math.min(last, (cur ?? last) + 1)); }
        }}
        onFocus={() => setHover(cur ?? last)}
        onBlur={() => setHover(null)}
      >
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
        {series.map((s, si) => segments(s.values).map((seg, k) => (
          <path key={`${si}-${k}`} className="series-line" pathLength={1} d={monotonePath(seg.map((p) => [x(p.index), y(p.value)]))} style={{ stroke: s.color }} />
        )))}
        {ends.map((e) => (
          <g key={e.si}>
            <circle cx={x(e.i)} cy={e.yy} r={4.5} style={{ fill: e.s.color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
            {!collide ? <text x={x(e.i) + 9} y={e.yy + 4} className="strong">{fmtPrice(e.v)}</text> : null}
          </g>
        ))}
        {cur !== null ? (
          <g>
            <line x1={x(cur)} x2={x(cur)} y1={M.t} y2={H - M.b} className="crosshair" />
            {series.map((s, si) => s.values[cur] === null ? null : (
              <circle key={si} cx={x(cur)} cy={y(s.values[cur] as number)} r={4.5} style={{ fill: s.color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
            ))}
          </g>
        ) : null}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="hit"
          onPointerMove={(event) => {
            const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            setHover(Math.max(0, Math.min(last, Math.round((((event.clientX - rect.left) / rect.width) * W - M.l) / (W - M.l - M.r) * last))));
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      <Tooltip state={tooltip} />
    </div>
  );
}

// ── Reparto de precios: un punto por gasolinera ────────────────────────────
export type StripItem = { price: number; label: string; sub: string };

export function PriceStrip({ items, average }: { items: StripItem[]; average: number }) {
  const [ref, W] = useWidth<HTMLDivElement>(480);
  const [tip, setTip] = useState<TooltipState>(null);
  const r = 5;
  const gap = 2;
  const M = { t: 26, r: 14, b: 28, l: 14 };
  const prices = items.map((item) => item.price);
  const lo = Math.floor(Math.min(...prices) * 100) / 100;
  const hi = Math.ceil(Math.max(...prices) * 100) / 100;
  const binW = (W - M.l - M.r) / ((hi - lo) * 100 + 1);
  const bins = new Map<number, StripItem[]>();
  for (const item of [...items].sort((a, b) => a.price - b.price)) {
    const k = Math.round((item.price - lo) * 100);
    bins.set(k, [...(bins.get(k) ?? []), item]);
  }
  const tallest = Math.max(...[...bins.values()].map((list) => list.length));
  const H = M.t + M.b + tallest * (r * 2 + gap) + 4;
  const x = (price: number) => M.l + ((price - lo) * 100 + 0.5) * binW;
  const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a));
  const minStack = bins.get(Math.round((cheapest.price - lo) * 100))?.length ?? 1;

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label="Distribución de precios: cada punto es una gasolinera">
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="grid-line" />
        {niceTicks(lo, hi, 4).filter((t) => t >= lo && t <= hi).map((t) => <text key={t} x={x(t)} y={H - 10} textAnchor="middle">{fmtPrice(t, 2)} €</text>)}
        <line x1={x(average)} x2={x(average)} y1={M.t - 6} y2={H - M.b} className="mean-line" />
        <text x={x(average)} y={M.t - 10} textAnchor="middle" className="strong">Media {fmtPrice(average)}</text>
        {[...bins].map(([bin, list]) => list.map((item, j) => {
          const cx = M.l + (bin + 0.5) * binW;
          const cy = H - M.b - r - 3 - j * (r * 2 + gap);
          const isMin = item === cheapest;
          const color = isMin ? "var(--s2)" : "var(--s1)";
          const show = () => setTip({ x: cx, y: cy - 6, title: item.label, rows: [{ color, value: `${fmtPrice(item.price)} €/L`, label: item.sub }] });
          return (
            <g key={`${bin}-${j}`} className="strip-dot" onPointerEnter={show} onPointerLeave={() => setTip(null)} onFocus={show} onBlur={() => setTip(null)} tabIndex={0} aria-label={`${item.label}: ${fmtPrice(item.price)} €/L`}>
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              <circle cx={cx} cy={cy} r={isMin ? r + 1 : r} style={{ fill: color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
            </g>
          );
        }))}
        <text x={x(cheapest.price) - 4} y={H - M.b - minStack * (r * 2 + gap) - 10} className="strong">↓ La más barata</text>
      </svg>
      <Tooltip state={tip} />
    </div>
  );
}

// ── Ranking en puntos: honesto con precios muy parecidos ───────────────────
export type DotRow = { label: string; value: number; note?: string };

export function DotRanking({ rows, highlightFirst = true }: { rows: DotRow[]; highlightFirst?: boolean }) {
  const [ref, W] = useWidth<HTMLDivElement>(480);
  const [tip, setTip] = useState<TooltipState>(null);
  const rowH = 28;
  const M = { t: 22, r: 58, b: 4, l: Math.min(130, W * 0.34) };
  const H = M.t + M.b + rows.length * rowH;
  const ticks = niceTicks(Math.min(...rows.map((r) => r.value)), Math.max(...rows.map((r) => r.value)), 3);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (v: number) => M.l + ((v - lo) / (hi - lo)) * (W - M.l - M.r);

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label="Precio medio por marca">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.t - 4} y2={H - M.b} className="grid-line" />
            <text x={x(t)} y={12} textAnchor="middle">{fmtPrice(t, 2)} €</text>
          </g>
        ))}
        {rows.map((row, i) => {
          const cy = M.t + i * rowH + rowH / 2;
          const hl = highlightFirst && i === 0;
          const color = hl ? "var(--s2)" : "var(--s1)";
          const show = () => setTip({ x: x(row.value), y: cy - 8, title: row.label, rows: [{ color, value: `${fmtPrice(row.value)} €/L`, label: row.note }] });
          return (
            <g key={row.label} className="dot-row" tabIndex={0} aria-label={`${row.label}: ${fmtPrice(row.value)} €/L`} onPointerEnter={show} onPointerLeave={() => setTip(null)} onFocus={show} onBlur={() => setTip(null)}>
              <rect x={0} y={M.t + i * rowH} width={W} height={rowH} fill="transparent" />
              <text x={M.l - 10} y={cy + 4} textAnchor="end" className={hl ? "strong" : ""}>{row.label}</text>
              <line x1={M.l} x2={x(row.value)} y1={cy} y2={cy} style={{ stroke: color }} strokeWidth={2} opacity={0.35} strokeLinecap="round" />
              <circle cx={x(row.value)} cy={cy} r={6} className="dot-mark" style={{ fill: color, stroke: "var(--surface-solid)", animationDelay: `${Math.min(i * 30, 400)}ms` }} strokeWidth={2} />
              <text x={x(row.value) + 12} y={cy + 4} className={hl ? "strong" : ""}>{fmtPrice(row.value)}</text>
            </g>
          );
        })}
      </svg>
      <Tooltip state={tip} />
    </div>
  );
}

// ── Mapa de comunidades: un solo tono en 5 tramos ──────────────────────────
export type MapShape = { code: string; d: string; name: string; average: number | null; lowerTax: boolean };

export function CommunityMap({ width, height, canaryBox, shapes, nationalAverage }: { width: number; height: number; canaryBox: [number, number, number, number]; shapes: MapShape[]; nationalAverage: number }) {
  const [tip, setTip] = useState<TooltipState>(null);
  const comparable = shapes.filter((s) => !s.lowerTax && s.average !== null).map((s) => s.average as number).sort((a, b) => a - b);
  const cuts = [1, 2, 3, 4].map((k) => comparable[Math.round(((comparable.length - 1) * k) / 5)]);
  const bin = (value: number) => cuts.filter((cut) => value > cut).length + 1;
  const [bx, by, bw, bh] = canaryBox;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="community-map" role="img" aria-label="Mapa de España por comunidades según el precio medio de la gasolina 95">
        <rect x={bx} y={by} width={bw} height={bh} rx={8} className="canary-box" />
        {shapes.map((shape, i) => {
          const fill = shape.lowerTax || shape.average === null ? "var(--q-off)" : `var(--q${bin(shape.average)})`;
          const show = (event?: React.PointerEvent) => {
            const box = (event?.currentTarget as SVGPathElement | undefined)?.ownerSVGElement?.getBoundingClientRect();
            const px = event && box ? ((event.clientX - box.left) / box.width) * 100 : 50;
            const py = event && box ? ((event.clientY - box.top) / box.height) * 100 : 30;
            setTip({
              x: px, y: py, title: shape.name,
              rows: [{ color: fill, value: shape.average === null ? "Sin datos" : `${fmtPrice(shape.average)} €/L`, label: shape.lowerTax ? "menos impuestos, no comparable" : shape.average === null ? "" : `${signedCents(shape.average - nationalAverage)} vs. media` }],
            });
          };
          return (
            <path key={shape.code} d={shape.d} style={{ fill, animationDelay: `${Math.min(i * 30, 450)}ms` }} tabIndex={0}
              aria-label={`${shape.name}: ${shape.average === null ? "sin datos" : `${fmtPrice(shape.average)} €/L`}`}
              onPointerMove={show} onPointerLeave={() => setTip(null)} onFocus={() => show()} onBlur={() => setTip(null)} />
          );
        })}
        <text x={bx + 8} y={by + bh - 8}>Canarias (otra fiscalidad)</text>
      </svg>
      {tip ? <div className="chart-tooltip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }} role="status">
        <div className="t-title">{tip.title}</div>
        {tip.rows.map((row, i) => <div className="t-row" key={i}>{row.color ? <i style={{ background: row.color }} /> : null}<b>{row.value}</b>{row.label ? <span>{row.label}</span> : null}</div>)}
      </div> : null}
    </div>
  );
}
