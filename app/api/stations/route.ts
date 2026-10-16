import {
  distanceKm,
  getAllStations,
  getFallbackStations,
  getFallbackUpdatedAt,
  getNearbyProvinceIds,
  getStationsByProvinceIds,
  type Point,
} from "@/lib/stations";
import { getCommunityBySlug, stationBelongsToCommunity } from "@/lib/communities";
import type { StationsResponse } from "@/lib/types";

export const maxDuration = 60;

// El radio máximo que ofrece la interfaz es 30 km; dejamos margen.
const NEARBY_KM = 35;

function parsePoint(params: URLSearchParams): Point | null {
  if (!params.has("lat") || !params.has("lng")) return null;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 27 && lat <= 44.5 && lng >= -18.5 && lng <= 5
    ? { lat, lng }
    : null;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const communitySlug = searchParams.get("community");
  const provinceId = searchParams.get("province");
  const community = communitySlug ? getCommunityBySlug(communitySlug) : null;
  const point = parsePoint(searchParams);
  const isNear = (station: Point) => !point || distanceKm(point, station) <= NEARBY_KM;

  if (communitySlug && !community) {
    return Response.json({ error: "Comunidad no válida" }, { status: 400 });
  }
  if (provinceId && !/^\d{2}$/.test(provinceId)) {
    return Response.json({ error: "Provincia no válida" }, { status: 400 });
  }
  if ((searchParams.has("lat") || searchParams.has("lng")) && !point) {
    return Response.json({ error: "Ubicación no válida" }, { status: 400 });
  }

  try {
    const result = point
      ? await getStationsByProvinceIds(getNearbyProvinceIds(point, NEARBY_KM))
      : provinceId
      ? await getStationsByProvinceIds([provinceId])
      : community
      ? await getStationsByProvinceIds(community.provinceIds)
      : await getAllStations();
    const stations = result.stations.filter(isNear);
    const { failed } = result;
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
    const stations = point
      ? getFallbackStations().filter(isNear)
      : provinceId
      ? getFallbackStations().filter((station) => station.provinceId === provinceId)
      : community
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
