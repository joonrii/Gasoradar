import observatoryJson from "@/datos/observatorio.json";
import { getCommunityByProvinceName } from "@/lib/communities";
import type { FuelKey } from "@/lib/types";

export type FuelSummary = { min: number; med: number; max: number; n: number };
type Day = { nacional: Partial<Record<FuelKey, FuelSummary>>; provincias: Record<string, Partial<Record<FuelKey, FuelSummary>>> };
type Source = { generado: string; dias: Record<string, Day> };
export type ObservatorySeries = { date: string; fuels: Partial<Record<FuelKey, FuelSummary>> };

function mergeSummaries(items: Array<Partial<Record<FuelKey, FuelSummary>>>) {
  const result: Partial<Record<FuelKey, FuelSummary>> = {};
  for (const fuel of ["g95", "g98", "diesel", "dieselPlus"] as FuelKey[]) {
    const values = items.map((item) => item[fuel]).filter((item): item is FuelSummary => Boolean(item));
    const count = values.reduce((sum, item) => sum + item.n, 0);
    if (!count) continue;
    result[fuel] = {
      min: Math.min(...values.map((item) => item.min)),
      med: Number((values.reduce((sum, item) => sum + item.med * item.n, 0) / count).toFixed(3)),
      max: Math.max(...values.map((item) => item.max)),
      n: count,
    };
  }
  return result;
}

export function getObservatoryData() {
  const source = observatoryJson as unknown as Source;
  const dates = Object.keys(source.dias).sort();
  const territories = new Map<string, ObservatorySeries[]>();

  const national = dates.map((date) => ({ date, fuels: source.dias[date].nacional }));
  for (const date of dates) {
    const byCommunity = new Map<string, Array<Partial<Record<FuelKey, FuelSummary>>>>();
    for (const [province, fuels] of Object.entries(source.dias[date].provincias)) {
      const community = getCommunityByProvinceName(province)?.shortName ?? province;
      byCommunity.set(community, [...(byCommunity.get(community) ?? []), fuels]);
    }
    for (const [community, summaries] of byCommunity) {
      territories.set(community, [...(territories.get(community) ?? []), { date, fuels: mergeSummaries(summaries) }]);
    }
  }

  return {
    generatedAt: source.generado,
    dates,
    national,
    territories: Object.fromEntries(territories),
    coverage: {
      provinces: Object.keys(source.dias[dates.at(-1) ?? ""]?.provincias ?? {}).length,
      stations: source.dias[dates.at(-1) ?? ""]?.nacional.g95?.n ?? 0,
    },
  };
}

