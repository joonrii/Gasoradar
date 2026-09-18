import historyJson from "@/datos/historico.json";

type FuelStats = { min: number; med: number; max: number; n: number };
type ProvinceHistory = Record<string, { g95?: FuelStats }>;
type History = Record<string, ProvinceHistory>;

export type ObservatoryPoint = { date: string; value: number };

export function getG95ThirtyDayInsight() {
  const history = historyJson as unknown as History;
  const dates = Object.keys(history).sort().slice(-30);
  const points: ObservatoryPoint[] = dates.map((date) => {
    const values = Object.values(history[date])
      .map((province) => province.g95)
      .filter((value): value is FuelStats => Boolean(value?.n));
    const stationCount = values.reduce((sum, value) => sum + value.n, 0);
    const weightedAverage = values.reduce((sum, value) => sum + value.med * value.n, 0) / stationCount;
    return { date, value: Number(weightedAverage.toFixed(3)) };
  });

  const latestDate = dates.at(-1) ?? "";
  const latestProvinces = Object.entries(history[latestDate] ?? {})
    .flatMap(([province, fuels]) => fuels.g95 ? [{ province, ...fuels.g95 }] : [])
    .sort((a, b) => a.med - b.med);
  const first = points[0]?.value ?? 0;
  const latest = points.at(-1)?.value ?? 0;

  return {
    points,
    latestDate,
    first,
    latest,
    change: Number((latest - first).toFixed(3)),
    changePercent: first ? Number((((latest - first) / first) * 100).toFixed(1)) : 0,
    stationCount: latestProvinces.reduce((sum, province) => sum + province.n, 0),
    provinces: latestProvinces,
  };
}

