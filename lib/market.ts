import historyJson from "@/datos/historico.json";
import { getCityStations } from "@/lib/city-insights";
import { COMMUNITIES, getProvinceIdByName } from "@/lib/communities";
import { SITEMAP_SEO_LOCATIONS, type IndexedSeoLocation } from "@/lib/seo-locations";
import { getFallbackStations } from "@/lib/stations";
import type { FuelKey, Station } from "@/lib/types";

// Cifras de mercado para la portada y las páginas de ciudad. Canarias, Ceuta y
// Melilla pagan menos impuestos por el carburante: se excluyen de las medias
// "de España" para que la comparación con la península sea justa.

export const LOWER_TAX_PROVINCE_IDS = new Set(["35", "38", "51", "52"]);
export const MARKET_FUELS = ["g95", "diesel"] as const;
export type MarketFuel = (typeof MARKET_FUELS)[number];

type FuelStats = { min: number; med: number; max: number; n: number };
type HistoryDay = Record<string, Partial<Record<FuelKey, FuelStats>>>;
const history = historyJson as unknown as Record<string, HistoryDay>;

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const round = (value: number) => Number(value.toFixed(3));
const isLowerTax = (provinceName: string) => LOWER_TAX_PROVINCE_IDS.has(getProvinceIdByName(provinceName) ?? "");

// Las versiones antiguas del histórico solo guardaban cuatro provincias.
const NATIONAL_DATES = Object.keys(history).sort().filter((date) => Object.keys(history[date]).length >= 48);

export type Series = { dates: string[]; values: Record<MarketFuel, Array<number | null>> };

function weighted(day: HistoryDay, fuel: MarketFuel, include: (province: string) => boolean) {
  let sum = 0;
  let count = 0;
  for (const [province, fuels] of Object.entries(day)) {
    const stats = fuels[fuel];
    if (!stats || !include(province)) continue;
    sum += stats.med * stats.n;
    count += stats.n;
  }
  return count ? round(sum / count) : null;
}

export function getNationalSeries(): Series {
  return {
    dates: NATIONAL_DATES,
    values: {
      g95: NATIONAL_DATES.map((date) => weighted(history[date], "g95", (province) => !isLowerTax(province))),
      diesel: NATIONAL_DATES.map((date) => weighted(history[date], "diesel", (province) => !isLowerTax(province))),
    },
  };
}

export function getProvinceSeries(provinceName: string, dates: string[]) {
  return {
    g95: dates.map((date) => history[date]?.[provinceName]?.g95?.med ?? null),
    diesel: dates.map((date) => history[date]?.[provinceName]?.diesel?.med ?? null),
  };
}

const allStations = getFallbackStations();
const peninsula = allStations.filter((station) => !LOWER_TAX_PROVINCE_IDS.has(station.provinceId ?? ""));

function averageOf(stations: Station[], fuel: FuelKey) {
  const prices = stations.map((station) => station[fuel]).filter((price): price is number => price !== null);
  return prices.length ? round(mean(prices)) : null;
}

export function getTodayAverages() {
  return { g95: averageOf(peninsula, "g95") ?? 0, diesel: averageOf(peninsula, "diesel") ?? 0, stationCount: allStations.length };
}

export function getBrandAverages(minStations = 80) {
  const byBrand = new Map<string, number[]>();
  for (const station of peninsula) {
    if (station.g95 === null) continue;
    const name = station.brand.trim().toUpperCase();
    byBrand.set(name, [...(byBrand.get(name) ?? []), station.g95]);
  }
  return [...byBrand]
    .filter(([, prices]) => prices.length >= minStations)
    .map(([name, prices]) => ({ name, average: round(mean(prices)), count: prices.length }))
    .sort((a, b) => a.average - b.average);
}

export function getCheapestCities(limit = 10) {
  return SITEMAP_SEO_LOCATIONS.filter((location) => !LOWER_TAX_PROVINCE_IDS.has(location.provinceId))
    .flatMap((location) => {
      const prices = getCityStations(location).map((station) => station.g95).filter((price): price is number => price !== null);
      return prices.length >= 5 ? [{ location, average: round(mean(prices)), min: Math.min(...prices), count: prices.length }] : [];
    })
    .sort((a, b) => a.average - b.average)
    .slice(0, limit);
}

export type CommunityAverage = { code: string; name: string; average: number; count: number; lowerTax: boolean };

export function getCommunityAverages(): CommunityAverage[] {
  return COMMUNITIES.flatMap((community) => {
    const stations = allStations.filter((station) => station.provinceId && community.provinceIds.includes(station.provinceId));
    const average = averageOf(stations, "g95");
    if (average === null) return [];
    return [{
      code: community.code,
      name: community.shortName,
      average,
      count: stations.length,
      lowerTax: community.provinceIds.some((id) => LOWER_TAX_PROVINCE_IDS.has(id)),
    }];
  });
}

// Ciudad indexable más cercana a un punto (para la tarjeta "Tu zona")
export function getNearestCity(lat: number, lng: number): IndexedSeoLocation | null {
  let best: { location: IndexedSeoLocation; distance: number } | null = null;
  for (const location of SITEMAP_SEO_LOCATIONS) {
    const stations = getCityStations(location);
    if (!stations.length) continue;
    const cLat = mean(stations.map((station) => station.lat));
    const cLng = mean(stations.map((station) => station.lng));
    const distance = (cLat - lat) ** 2 + ((cLng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (!best || distance < best.distance) best = { location, distance };
  }
  return best?.location ?? null;
}
