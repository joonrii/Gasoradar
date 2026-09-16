import fallbackData from "@/datos/estaciones.json";
import type { Station, StationsResponse } from "@/lib/types";

const SOURCE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";
const PROVINCE_IDS = Array.from({ length: 52 }, (_, index) => String(index + 1).padStart(2, "0"));

export const maxDuration = 60;

const numberOrNull = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const coordinateOrNull = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

function normalize(entry: Record<string, unknown>): Station | null {
  const lat = coordinateOrNull(entry["Latitud"] ?? entry.lat);
  const lng = coordinateOrNull(entry["Longitud (WGS84)"] ?? entry.lng);
  if (lat === null || lng === null) return null;

  const station: Station = {
    id: String(entry.IDEESS ?? entry.id ?? ""),
    brand: String(entry["Rótulo"] ?? entry.marca ?? "Sin rótulo"),
    city: String(entry.Municipio ?? entry.municipio ?? ""),
    province: String(entry.Provincia ?? entry.provincia ?? ""),
    address: String(entry["Dirección"] ?? entry.dir ?? ""),
    schedule: String(entry.Horario ?? entry.horario ?? "Horario no disponible"),
    lat,
    lng,
    g95: numberOrNull(entry["Precio Gasolina 95 E5"] ?? entry.g95),
    g98: numberOrNull(entry["Precio Gasolina 98 E5"] ?? entry.g98),
    diesel: numberOrNull(entry["Precio Gasoleo A"] ?? entry.diesel),
    dieselPlus: numberOrNull(entry["Precio Gasoleo Premium"] ?? entry.dieselPlus),
  };

  return station.g95 || station.g98 || station.diesel || station.dieselPlus ? station : null;
}

async function fetchProvince(provinceId: string) {
  const response = await fetch(`${SOURCE}${provinceId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Provincia ${provinceId}: HTTP ${response.status}`);
  const data = await response.json();
  return (data.ListaEESSPrecio ?? []) as Record<string, unknown>[];
}

async function fetchAllProvinces() {
  const entries: Record<string, unknown>[] = [];

  const collect = async (provinceIds: string[]) => {
    const failed: string[] = [];
    const results = await Promise.allSettled(provinceIds.map(fetchProvince));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") entries.push(...result.value);
      else failed.push(provinceIds[index]);
    });
    return failed;
  };

  const failed = await collect(PROVINCE_IDS);
  const failedAfterRetry = failed.length ? await collect(failed) : [];

  return { entries, failed: failedAfterRetry };
}

export async function GET() {
  try {
    const { entries, failed } = await fetchAllProvinces();
    const stations = entries
      .map((entry) => normalize(entry))
      .filter(Boolean) as Station[];
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
    const stations = fallbackData.estaciones
      .map((entry) => normalize(entry as unknown as Record<string, unknown>))
      .filter(Boolean) as Station[];
    const payload: StationsResponse = {
      updatedAt: fallbackData.fecha,
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
