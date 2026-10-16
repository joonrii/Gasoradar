// Utilidades compartidas por los gráficos (servidor y cliente).

export const fmtPrice = (value: number, decimals = 3) => value.toFixed(decimals).replace(".", ",");
export const fmtEuros = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
export const fmtCents = (value: number) => `${Math.abs(value * 100).toFixed(1).replace(".", ",")} cént.`;
export const signedCents = (value: number) => `${value < 0 ? "−" : "+"}${fmtCents(value)}`;

export function dayLabel(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

export function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 0.01;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const low = Math.floor(min / step) * step;
  const high = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) ticks.push(Number(value.toFixed(6)));
  return ticks;
}

// Curva monótona (Fritsch–Carlson): suave sin inventar picos entre dos días.
export function monotonePath(points: Array<[number, number]>) {
  const n = points.length;
  if (n === 0) return "";
  if (n < 3) return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0
      ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  }
  tangent[n - 1] = slope[n - 2];
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(points[i][0] + h).toFixed(1)},${(points[i][1] + tangent[i] * h).toFixed(1)} ${(points[i + 1][0] - h).toFixed(1)},${(points[i + 1][1] - tangent[i + 1] * h).toFixed(1)} ${points[i + 1][0].toFixed(1)},${points[i + 1][1].toFixed(1)}`;
  }
  return d;
}

// Segmentos continuos de una serie con huecos (null)
export function segments(values: Array<number | null>) {
  const out: Array<Array<{ index: number; value: number }>> = [];
  let current: Array<{ index: number; value: number }> = [];
  values.forEach((value, index) => {
    if (value === null) { if (current.length) out.push(current); current = []; return; }
    current.push({ index, value });
  });
  if (current.length) out.push(current);
  return out;
}
