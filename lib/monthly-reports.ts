import { getObservatoryData, type FuelSummary, type ObservatorySeries } from "@/lib/observatory-data";
import type { FuelKey } from "@/lib/types";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

export const REPORT_FUELS: Array<{ key: FuelKey; label: string }> = [
  { key: "g95", label: "Gasolina 95" },
  { key: "g98", label: "Gasolina 98" },
  { key: "diesel", label: "Diésel A" },
  { key: "dieselPlus", label: "Diésel premium" },
];

type MonthlyFuel = {
  average: number;
  first: number;
  latest: number;
  change: number;
  changePercent: number;
  min: number;
  max: number;
  stations: number;
};

export type MonthlyTerritory = {
  name: string;
  average: number;
  first: number;
  latest: number;
  changePercent: number;
  stations: number;
};

export type MonthlyReport = {
  slug: string;
  key: string;
  label: string;
  year: number;
  month: number;
  firstDate: string;
  latestDate: string;
  days: number;
  isComplete: boolean;
  fuels: Partial<Record<FuelKey, MonthlyFuel>>;
  points: Array<{ date: string; value: number }>;
  territories: MonthlyTerritory[];
  coverage: { provinces: number; stations: number };
};

function summariesFor(series: ObservatorySeries[], fuel: FuelKey) {
  return series
    .map((point) => ({ date: point.date, summary: point.fuels[fuel] }))
    .filter((point): point is { date: string; summary: FuelSummary } => Boolean(point.summary));
}

function aggregate(series: ObservatorySeries[], fuel: FuelKey): MonthlyFuel | null {
  const values = summariesFor(series, fuel);
  if (!values.length) return null;
  const observations = values.reduce((sum, point) => sum + point.summary.n, 0);
  const average = values.reduce((sum, point) => sum + point.summary.med * point.summary.n, 0) / observations;
  const first = values[0].summary.med;
  const latest = values.at(-1)?.summary.med ?? first;
  return {
    average: Number(average.toFixed(3)),
    first,
    latest,
    change: Number((latest - first).toFixed(3)),
    changePercent: first ? Number((((latest - first) / first) * 100).toFixed(1)) : 0,
    min: Math.min(...values.map((point) => point.summary.min)),
    max: Math.max(...values.map((point) => point.summary.max)),
    stations: values.at(-1)?.summary.n ?? 0,
  };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getMonthlyReports(): MonthlyReport[] {
  const data = getObservatoryData();
  const monthKeys = [...new Set(data.dates.map((date) => date.slice(0, 7)))].sort().reverse();

  return monthKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const national = data.national.filter((point) => point.date.startsWith(key));
    const firstDate = national[0].date;
    const latestDate = national.at(-1)?.date ?? firstDate;
    const fuels: Partial<Record<FuelKey, MonthlyFuel>> = {};
    for (const fuel of REPORT_FUELS) {
      const result = aggregate(national, fuel.key);
      if (result) fuels[fuel.key] = result;
    }

    const territories = Object.entries(data.territories)
      .map(([name, series]) => {
        const result = aggregate(series.filter((point) => point.date.startsWith(key)), "g95");
        return result ? { name, average: result.average, first: result.first, latest: result.latest, changePercent: result.changePercent, stations: result.stations } : null;
      })
      .filter((territory): territory is MonthlyTerritory => Boolean(territory))
      .sort((a, b) => a.average - b.average);

    return {
      slug: `${MONTHS[month - 1]}-${year}`,
      key,
      label: `${MONTHS[month - 1]} de ${year}`,
      year,
      month,
      firstDate,
      latestDate,
      days: national.length,
      isComplete: Number(firstDate.slice(8, 10)) === 1 && Number(latestDate.slice(8, 10)) === lastDayOfMonth(year, month),
      fuels,
      points: summariesFor(national, "g95").map((point) => ({ date: point.date, value: point.summary.med })),
      territories,
      coverage: { provinces: data.coverage.provinces, stations: fuels.g95?.stations ?? data.coverage.stations },
    };
  });
}

export function getMonthlyReport(slug: string) {
  return getMonthlyReports().find((report) => report.slug === slug);
}
