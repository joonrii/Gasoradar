import {
  getAllStations,
  getFallbackStations,
  getFallbackUpdatedAt,
  getStationsByProvinceIds,
} from "@/lib/stations";
import { getCommunityBySlug, stationBelongsToCommunity } from "@/lib/communities";
import type { StationsResponse } from "@/lib/types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const communitySlug = new URL(request.url).searchParams.get("community");
  const community = communitySlug ? getCommunityBySlug(communitySlug) : null;

  if (communitySlug && !community) {
    return Response.json({ error: "Comunidad no válida" }, { status: 400 });
  }

  try {
    const { stations, failed } = community
      ? await getStationsByProvinceIds(community.provinceIds)
      : await getAllStations();
    if (!stations.length) throw new Error("La fuente oficial no devolvió estaciones válidas");
    if (failed.length) console.warn(`Provincias no disponibles: ${failed.join(", ")}`);

    const payload: StationsResponse = {
      updatedAt: new Date().toISOString(),
      total: stations.length,
      source: "live",
      stations,
    };
    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (error) {
    const stations = community
      ? getFallbackStations().filter((station) => stationBelongsToCommunity(station.province, community))
      : getFallbackStations();
    const payload: StationsResponse = {
      updatedAt: getFallbackUpdatedAt(),
      total: stations.length,
      source: "fallback",
      stations,
    };
    console.error("Fallback de estaciones activado", error);
    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  }
}
