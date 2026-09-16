import fallbackData from "@/datos/estaciones.json";
import type { Station } from "@/lib/types";

const SOURCE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

export const PROVINCE_IDS = Array.from({ length: 52 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

const numberOrNull = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const coordinateOrNull = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export function normalizeStation(entry: Record<string, unknown>): Station | null {
  const lat = coordinateOrNull(entry.Latitud ?? entry.lat);
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

export async function getProvinceStations(provinceId: string) {
  const response = await fetch(`${SOURCE}${provinceId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Provincia ${provinceId}: HTTP ${response.status}`);
  const data = await response.json();
  return ((data.ListaEESSPrecio ?? []) as Record<string, unknown>[])
    .map(normalizeStation)
    .filter((station): station is Station => station !== null);
}

export async function getAllStations() {
  const stations: Station[] = [];

  const collect = async (provinceIds: string[]) => {
    const failed: string[] = [];
    const results = await Promise.allSettled(provinceIds.map(getProvinceStations));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") stations.push(...result.value);
      else failed.push(provinceIds[index]);
    });
    return failed;
  };

  const failed = await collect(PROVINCE_IDS);
  const failedAfterRetry = failed.length ? await collect(failed) : [];
  return { stations, failed: failedAfterRetry };
}

export function getFallbackStations() {
  return fallbackData.estaciones
    .map((entry) => normalizeStation(entry as unknown as Record<string, unknown>))
    .filter((station): station is Station => station !== null);
}

export function getFallbackUpdatedAt() {
  return fallbackData.fecha;
}
