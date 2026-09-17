import rollingData from "@/datos/rolling.json";
import historicalData from "@/datos/historico.json";
import { getFallbackStations } from "@/lib/stations";
import type { FuelKey } from "@/lib/types";

type RollingDay = Record<string, Partial<Record<FuelKey, number>>>;
type HistoricalFuel = { min: number; med: number; max: number; n: number };
type HistoricalDay = Record<string, Partial<Record<FuelKey, HistoricalFuel>>>;
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get("city");
  const province = params.get("province");

  if (!city || !province) {
    return Response.json({ error: "Falta la ciudad o la provincia" }, { status: 400 });
  }

  const stationIds = new Set(
    getFallbackStations()
      .filter((station) => station.city === city && station.province === province)
      .map((station) => station.id),
  );

  let points = Object.entries(rollingData as Record<string, RollingDay>).map(([date, stations]) => {
    const fuels = {} as Record<FuelKey, { min: number; average: number; count: number } | null>;
    for (const fuel of ["g95", "g98", "diesel", "dieselPlus"] as FuelKey[]) {
      const prices = Object.entries(stations)
        .filter(([id]) => stationIds.has(id))
        .map(([, values]) => values[fuel])
        .filter((price): price is number => typeof price === "number" && price > 0);
      fuels[fuel] = prices.length
        ? {
            min: Math.min(...prices),
            average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
            count: prices.length,
          }
        : null;
    }
    return { date, fuels };
  });

  if (!points.some((point) => Object.values(point.fuels).some(Boolean))) {
    points = Object.entries(historicalData as Record<string, HistoricalDay>).map(([date, provinces]) => {
      const provinceData = Object.entries(provinces).find(([name]) => normalize(name) === normalize(province))?.[1];
      const fuels = {} as Record<FuelKey, { min: number; average: number; count: number } | null>;
      for (const fuel of ["g95", "g98", "diesel", "dieselPlus"] as FuelKey[]) {
        const values = provinceData?.[fuel];
        fuels[fuel] = values ? { min: values.min, average: values.med, count: values.n } : null;
      }
      return { date, fuels };
    });
  }

  return Response.json(
    { city, province, points },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
