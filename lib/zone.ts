import { displayAddress, displayBrand, formatSchedule, getCityStations } from "@/lib/city-insights";
import { getNearestCity } from "@/lib/market";
import { SITEMAP_SEO_LOCATIONS, getSeoLocationPath, type IndexedSeoLocation } from "@/lib/seo-locations";
import { distanceKm, getFallbackStations, type Point } from "@/lib/stations";
import type { Station } from "@/lib/types";

// "Tu zona" es el área alrededor de la ciudad, no solo el municipio: en Bilbao
// las 7 gasolineras del municipio son caras y a pocos km hay otras mucho más
// baratas. Con un radio de 10 km la comparación refleja lo que de verdad
// puede ahorrar quien vive allí.
const ZONE_RADIUS_KM = 10;

export type ZoneStation = {
  brand: string;
  address: string;
  town: string;
  distance: number;
  price: number;
  lat: number;
  lng: number;
  schedule: string;
};

export type ZoneSummary = {
  city: string;
  path: string;
  radiusKm: number;
  stationCount: number;
  cheapest: ZoneStation;
  priciest: ZoneStation;
  average: number;
  approximate: boolean;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// "Palmas de Gran Canaria (Las)" → "Las Palmas de Gran Canaria"
const townName = (value: string) => {
  const match = value.match(/^(.*?) \((El|La|Los|Las|L'|A|O)\)$/i);
  return match ? `${match[2]}${match[2].endsWith("'") ? "" : " "}${match[1]}` : value;
};

export function getZoneSummary(location: IndexedSeoLocation, approximate: boolean): ZoneSummary | null {
  const cityStations = getCityStations(location);
  if (!cityStations.length) return null;
  const center: Point = { lat: median(cityStations.map((s) => s.lat)), lng: median(cityStations.map((s) => s.lng)) };
  const area = getFallbackStations()
    .filter((station) => station.g95 !== null)
    .map((station) => ({ station, distance: distanceKm(center, station) }))
    .filter((item) => item.distance <= ZONE_RADIUS_KM)
    .sort((a, b) => (a.station.g95 as number) - (b.station.g95 as number) || a.distance - b.distance);
  if (area.length < 2) return null;
  const pick = ({ station, distance }: { station: Station; distance: number }): ZoneStation => ({
    brand: displayBrand(station.brand),
    address: displayAddress(station.address),
    town: townName(station.city),
    distance: Math.round(distance * 10) / 10,
    price: station.g95 as number,
    lat: station.lat,
    lng: station.lng,
    schedule: formatSchedule(station.schedule),
  });
  return {
    city: location.displayName,
    path: getSeoLocationPath(location),
    radiusKm: ZONE_RADIUS_KM,
    stationCount: area.length,
    cheapest: pick(area[0]),
    priciest: pick(area[area.length - 1]),
    average: area.reduce((sum, item) => sum + (item.station.g95 as number), 0) / area.length,
    approximate,
  };
}

export function getDefaultZone() {
  const madrid = SITEMAP_SEO_LOCATIONS.find((location) => location.citySlug === "madrid" && location.provinceSlug === "madrid") ?? SITEMAP_SEO_LOCATIONS[0];
  return getZoneSummary(madrid, false);
}

export function getZoneForPoint(lat: number, lng: number) {
  const location = getNearestCity(lat, lng);
  return location ? getZoneSummary(location, true) : null;
}
