// Minigráfico estático para las tarjetas de cifras (sin JavaScript).
export function Sparkline({ values, color }: { values: Array<number | null>; color: string }) {
  const finite = values.filter((value): value is number => value !== null);
  if (finite.length < 2) return null;
  const w = 200;
  const h = 34;
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const points = values.flatMap((value, i) => value === null ? [] : [[(i / (values.length - 1)) * (w - 6) + 3, h - 4 - ((value - lo) / (hi - lo || 1)) * (h - 8)] as const]);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [ex, ey] = points[points.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d}L${ex},${h}L${points[0][0]},${h}Z`} style={{ fill: color, opacity: 0.1 }} />
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r={3.5} style={{ fill: color, stroke: "var(--surface-solid)" }} strokeWidth={2} />
    </svg>
  );
}

export function StatTile({ label, value, unit, delta, deltaTone, spark, sparkColor }: {
  label: string; value: string; unit?: string; delta?: string; deltaTone?: "good" | "bad"; spark?: Array<number | null>; sparkColor?: string;
}) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <b>{value}{unit ? <small> {unit}</small> : null}</b>
      {delta ? <em className={deltaTone ?? ""}>{delta}</em> : null}
      {spark && sparkColor ? <Sparkline values={spark} color={sparkColor} /> : null}
    </div>
  );
}
