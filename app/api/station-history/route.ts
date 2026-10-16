import { readProvinceHistory } from "@/lib/station-history";
import type { FuelKey } from "@/lib/types";

const fuels = new Set<FuelKey>(["g95", "g98", "diesel", "dieselPlus"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const stationId = params.get("station");
  const provinceId = params.get("province");
  const fuel = params.get("fuel") as FuelKey | null;

  if (!stationId || !provinceId || !fuel || !fuels.has(fuel)) {
    return Response.json({ error: "Falta la estación, la provincia o el combustible" }, { status: 400 });
  }

  const history = await readProvinceHistory(provinceId);
  const prices = history?.estaciones[stationId]?.[fuel] ?? [];
  const points = (history?.fechas ?? [])
    .map((date, index) => ({ date, price: prices[index] }))
    .filter((point): point is { date: string; price: number } =>
      typeof point.price === "number" && point.price > 0,
    )
    .slice(-30);

  return Response.json(
    { stationId, fuel, points },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
