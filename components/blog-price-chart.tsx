import type { ObservatoryPoint } from "@/lib/observatory";

function price(value: number) {
  return value.toFixed(3).replace(".", ",");
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

export function BlogPriceChart({ points, compact = false }: { points: ObservatoryPoint[]; compact?: boolean }) {
  if (points.length < 2) return null;
  const width = compact ? 480 : 900;
  const height = compact ? 180 : 330;
  const padding = compact ? 18 : 52;
  const values = points.map((point) => point.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const extra = Math.max((dataMax - dataMin) * 0.16, 0.012);
  const min = dataMin - extra;
  const max = dataMax + extra;
  const x = (index: number) => padding + (index / (points.length - 1)) * (width - padding * 2);
  const y = (value: number) => padding + ((max - value) / (max - min)) * (height - padding * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - padding} L${x(0).toFixed(1)},${height - padding} Z`;
  const ticks = [max, (max + min) / 2, min];

  return (
    <figure className={`blog-chart${compact ? " compact" : ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución del precio medio desde ${price(points[0].value)} hasta ${price(points.at(-1)?.value ?? 0)} euros por litro`}>
        <defs>
          <linearGradient id={compact ? "blog-area-compact" : "blog-area"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d5f35a" stopOpacity=".52" />
            <stop offset="1" stopColor="#d5f35a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {!compact && ticks.map((tick) => <g key={tick}>
          <line className="blog-chart-grid" x1={padding} x2={width - padding} y1={y(tick)} y2={y(tick)} />
          <text className="blog-chart-price" x="0" y={y(tick) + 4}>{price(tick)} €</text>
        </g>)}
        <path d={area} fill={`url(#${compact ? "blog-area-compact" : "blog-area"})`} />
        <path className="blog-chart-line" d={path} />
        <circle className="blog-chart-dot" cx={x(points.length - 1)} cy={y(points.at(-1)?.value ?? 0)} r={compact ? 5 : 7} />
        {!compact && <>
          <text className="blog-chart-date" x={padding} y={height - 8}>{shortDate(points[0].date)}</text>
          <text className="blog-chart-date" x={width - padding} y={height - 8} textAnchor="end">{shortDate(points.at(-1)?.date ?? "")}</text>
        </>}
      </svg>
      {!compact && <figcaption>Precio medio ponderado de gasolina 95 · €/L · Fuente: datos oficiales procesados por GasolinaGo</figcaption>}
    </figure>
  );
}

