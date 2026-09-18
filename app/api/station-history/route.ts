import rollingData from "@/datos/rolling.json";
import type { FuelKey } from "@/lib/types";

type RollingDay = Record<string, Partial<Record<FuelKey, number>>>;

const fuels = new Set<FuelKey>(["g95", "g98", "diesel", "dieselPlus"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const stationId = params.get("station");
  const fuel = params.get("fuel") as FuelKey | null;

  if (!stationId || !fuel || !fuels.has(fuel)) {
    return Response.json({ error: "Falta la estación o el combustible" }, { status: 400 });
  }

  const points = Object.entries(rollingData as Record<string, RollingDay>)
    .map(([date, stations]) => ({ date, price: stations[stationId]?.[fuel] }))
    .filter((point): point is { date: string; price: number } =>
      typeof point.price === "number" && point.price > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return Response.json(
    { stationId, fuel, points },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
