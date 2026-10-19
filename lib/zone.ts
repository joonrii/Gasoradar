import { displayAddress, displayBrand, formatSchedule, getCityStations } from "@/lib/city-insights";
import { getNearestCity } from "@/lib/market";
import { SITEMAP_SEO_LOCATIONS, getSeoLocationPath, type IndexedSeoLocation } from "@/lib/seo-locations";

export type ZoneStation = { brand: string; address: string; price: number; lat: number; lng: number; schedule: string };

export type ZoneSummary = {
  city: string;
  path: string;
  cheapest: ZoneStation;
  priciest: ZoneStation;
  average: number;
  approximate: boolean;
};

export function getZoneSummary(location: IndexedSeoLocation, approximate: boolean): ZoneSummary | null {
  const priced = getCityStations(location).filter((station) => station.g95 !== null).sort((a, b) => (a.g95 as number) - (b.g95 as number));
  if (!priced.length) return null;
  const pick = (station: (typeof priced)[number]): ZoneStation => ({ brand: displayBrand(station.brand), address: displayAddress(station.address), price: station.g95 as number, lat: station.lat, lng: station.lng, schedule: formatSchedule(station.schedule) });
  return {
    city: location.displayName,
    path: getSeoLocationPath(location),
    cheapest: pick(priced[0]),
    priciest: pick(priced[priced.length - 1]),
    average: priced.reduce((sum, station) => sum + (station.g95 as number), 0) / priced.length,
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
