import { INDEXED_SEO_LOCATIONS, type IndexedSeoLocation } from "@/lib/seo-locations";
import { distanceKm, getFallbackStations, type Point } from "@/lib/stations";
import { readProvinceHistory } from "@/lib/station-history";
import { displayAddress, displayBrand, isOpen24h } from "@/lib/format";
import type { FuelKey, Station } from "@/lib/types";

// Datos propios de cada página de ciudad. Todo el texto se genera a partir de
// estas cifras para que cada página diga algo distinto y comprobable.

export const CITY_FUELS: Array<{ key: FuelKey; label: string }> = [
  { key: "g95", label: "Gasolina 95" },
  { key: "diesel", label: "Diésel A" },
];

const TANK_LITRES = 50;

export type FuelStats = {
  fuel: FuelKey;
  label: string;
  ranked: Station[];
  cheapestPrice: number;
  maxPrice: number;
  average: number;
  saving: number;
};

export type Trend = { fuel: FuelKey; label: string; from: string; to: string; firstAverage: number; lastAverage: number; change: number };

export type CityInsights = {
  stations: Station[];
  fuels: FuelStats[];
  provinceAverage: Partial<Record<FuelKey, number>>;
  nationalAverage: Partial<Record<FuelKey, number>>;
  trend: Trend | null;
  daily: { dates: string[]; g95: Array<number | null> };
  cheapestBrand: { name: string; average: number; count: number } | null;
  topBrand: { name: string; count: number } | null;
  open24h: Station[];
  nearby: Array<IndexedSeoLocation & { distance: number }>;
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const formatPrice = (value: number) => `${value.toFixed(3).replace(".", ",")} €/L`;
export const formatEuros = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
export const formatCents = (value: number) => {
  const cents = Math.abs(value * 100);
  return `${cents.toFixed(1).replace(".", ",")} ${cents >= 0.95 && cents < 1.05 ? "céntimo" : "céntimos"}`;
};

export { displayAddress, displayBrand, formatSchedule } from "@/lib/format";

const allStations = getFallbackStations();

function averagesBy(group: (station: Station) => string) {
  const sums = new Map<string, Partial<Record<FuelKey, number[]>>>();
  for (const station of allStations) {
    const key = group(station);
    const entry = sums.get(key) ?? {};
    for (const { key: fuel } of CITY_FUELS) {
      const price = station[fuel];
      if (price !== null) (entry[fuel] ??= []).push(price);
    }
    sums.set(key, entry);
  }
  const result = new Map<string, Partial<Record<FuelKey, number>>>();
  for (const [key, entry] of sums) {
    result.set(key, Object.fromEntries(Object.entries(entry).map(([fuel, prices]) => [fuel, mean(prices)])));
  }
  return result;
}

const provinceAverages = averagesBy((station) => station.province);
const nationalAverage = averagesBy(() => "ES").get("ES") ?? {};

const stationsByCity = new Map<string, Station[]>();
for (const station of allStations) {
  const key = `${station.province}|${station.city}`;
  stationsByCity.set(key, [...(stationsByCity.get(key) ?? []), station]);
}

export function getCityStations(location: Pick<IndexedSeoLocation, "city" | "province">) {
  return stationsByCity.get(`${location.province}|${location.city}`) ?? [];
}

const centers = new Map<string, Point>();
for (const location of INDEXED_SEO_LOCATIONS) {
  const stations = getCityStations(location);
  if (!stations.length) continue;
  centers.set(`${location.provinceSlug}/${location.citySlug}`, {
    lat: median(stations.map((station) => station.lat)),
    lng: median(stations.map((station) => station.lng)),
  });
}

function nearbyLocations(location: IndexedSeoLocation, limit: number) {
  const center = centers.get(`${location.provinceSlug}/${location.citySlug}`);
  if (!center) return [];
  return INDEXED_SEO_LOCATIONS.flatMap((candidate) => {
    const candidateCenter = centers.get(`${candidate.provinceSlug}/${candidate.citySlug}`);
    if (!candidateCenter || candidate === location) return [];
    return [{ ...candidate, distance: distanceKm(center, candidateCenter) }];
  })
    .filter((candidate) => candidate.distance <= 60)
    .sort((a, b) => Number(b.indexable) - Number(a.indexable) || a.distance - b.distance)
    .slice(0, limit)
    .sort((a, b) => a.distance - b.distance);
}

function fuelStats(stations: Station[], fuel: FuelKey, label: string): FuelStats | null {
  const ranked = stations
    .filter((station) => station[fuel] !== null)
    // A igual precio, primero las abiertas 24 horas
    .toSorted((a, b) => (a[fuel] as number) - (b[fuel] as number) || Number(isOpen24h(b.schedule)) - Number(isOpen24h(a.schedule)));
  if (!ranked.length) return null;
  const prices = ranked.map((station) => station[fuel] as number);
  const average = mean(prices);
  return {
    fuel,
    label,
    ranked,
    cheapestPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    average,
    saving: Math.max(0, (average - prices[0]) * TANK_LITRES),
  };
}

async function cityDaily(location: IndexedSeoLocation, stations: Station[], fuel: FuelKey) {
  const history = await readProvinceHistory(location.provinceId);
  if (!history) return { dates: [] as string[], values: [] as Array<number | null> };
  const ids = stations.map((station) => station.id);
  const values = history.fechas.map((_, index) => {
    const prices = ids
      .map((id) => history.estaciones[id]?.[fuel]?.[index])
      .filter((price): price is number => typeof price === "number" && price > 0);
    return prices.length >= Math.min(3, ids.length) ? Number(mean(prices).toFixed(3)) : null;
  });
  return { dates: history.fechas, values };
}

function cityTrend(series: { dates: string[]; values: Array<number | null> }, fuels: FuelStats[]): Trend | null {
  const primary = fuels[0];
  if (!primary) return null;
  const daily = series.dates.flatMap((date, i) => (series.values[i] === null ? [] : [{ date, average: series.values[i] as number }]));
  if (daily.length < 7) return null;
  const first = daily[0];
  const last = daily[daily.length - 1];
  return {
    fuel: primary.fuel,
    label: primary.label,
    from: first.date,
    to: last.date,
    firstAverage: first.average,
    lastAverage: last.average,
    change: last.average - first.average,
  };
}

function brandStats(stations: Station[], fuel: FuelKey | undefined) {
  const byBrand = new Map<string, number[]>();
  for (const station of stations) {
    const name = displayBrand(station.brand);
    const price = fuel ? station[fuel] : null;
    byBrand.set(name, [...(byBrand.get(name) ?? []), ...(price !== null ? [price] : [])]);
  }
  const counts = stations.reduce((map, station) => {
    const name = displayBrand(station.brand);
    return map.set(name, (map.get(name) ?? 0) + 1);
  }, new Map<string, number>());
  const topBrand = [...counts].sort((a, b) => b[1] - a[1])[0];
  const cheapestBrand = [...byBrand]
    .filter(([, prices]) => prices.length >= 2)
    .map(([name, prices]) => ({ name, average: mean(prices), count: prices.length }))
    .sort((a, b) => a.average - b.average)[0];
  return {
    topBrand: topBrand && topBrand[1] >= 2 ? { name: topBrand[0], count: topBrand[1] } : null,
    cheapestBrand: cheapestBrand ?? null,
  };
}

export async function getCityInsights(location: IndexedSeoLocation): Promise<CityInsights> {
  const stations = getCityStations(location);
  const fuels = CITY_FUELS.flatMap(({ key, label }) => fuelStats(stations, key, label) ?? []);
  const brands = brandStats(stations, fuels[0]?.fuel);
  const series = await cityDaily(location, stations, "g95");
  return {
    stations,
    fuels,
    provinceAverage: provinceAverages.get(location.province) ?? {},
    nationalAverage,
    trend: cityTrend(series, fuels.filter((fuel) => fuel.fuel === "g95")),
    daily: { dates: series.dates, g95: series.values },
    ...brands,
    open24h: stations.filter((station) => isOpen24h(station.schedule)),
    nearby: nearbyLocations(location, 6),
  };
}

// ── Texto ──────────────────────────────────────────────────────────────────

export type Faq = { question: string; answer: string };

const formatDay = (date: string) =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

function comparison(value: number, reference: number | undefined, place: string) {
  if (reference === undefined) return null;
  const diff = value - reference;
  if (Math.abs(diff) < 0.005) return `prácticamente igual que la media de ${place}`;
  return `${formatCents(diff)} ${diff < 0 ? "por debajo" : "por encima"} de la media de ${place}`;
}

export function buildCityCopy(name: string, provinceName: string, insights: CityInsights) {
  const { fuels, trend, cheapestBrand, topBrand, open24h, stations } = insights;
  const paragraphs: string[] = [];
  const faqs: Faq[] = [];
  const [primary, secondary] = fuels;

  if (primary) {
    const best = primary.ranked[0];
    const vsProvince = comparison(primary.average, insights.provinceAverage[primary.fuel], provinceName);
    const vsSpain = comparison(primary.average, insights.nationalAverage[primary.fuel], "España");
    paragraphs.push(
      `En ${name} hay ${stations.length} gasolineras. La ${primary.label.toLowerCase()}${primary.ranked.length < stations.length ? ` (la venden ${primary.ranked.length})` : ""} cuesta de media ${formatPrice(primary.average)}` +
        (vsProvince ? `, ${vsProvince}` : "") +
        (vsSpain ? ` y ${vsSpain}` : "") +
        ".",
    );
    paragraphs.push(
      `Entre la estación más barata (${formatPrice(primary.cheapestPrice)}) y la más cara (${formatPrice(primary.maxPrice)}) hay ${formatCents(primary.maxPrice - primary.cheapestPrice)} por litro: ` +
        `llenar un depósito de ${TANK_LITRES} litros en la más barata cuesta ${formatEuros((primary.maxPrice - primary.cheapestPrice) * TANK_LITRES)} menos que en la más cara.`,
    );
    faqs.push({
      question: `¿Dónde está la ${primary.label.toLowerCase()} más barata en ${name} hoy?`,
      answer: `En ${displayBrand(best.brand)}, ${displayAddress(best.address)}, a ${formatPrice(primary.cheapestPrice)}. Es ${formatCents(primary.average - primary.cheapestPrice)} más barata que la media de ${name}, un ahorro de ${formatEuros(primary.saving)} en un depósito de ${TANK_LITRES} litros.`,
    });
    if (vsProvince || vsSpain) {
      faqs.push({
        question: `¿Es más cara la gasolina en ${name} que en el resto de ${provinceName.startsWith("la provincia") ? provinceName : `la provincia de ${provinceName}`}?`,
        answer: `La media de ${primary.label.toLowerCase()} en ${name} es ${formatPrice(primary.average)}: ${[vsProvince, vsSpain].filter(Boolean).join(" y ")}.`,
      });
    }
  }

  if (secondary) {
    const best = secondary.ranked[0];
    faqs.push({
      question: `¿Y el diésel más barato en ${name}?`,
      answer: `En ${displayBrand(best.brand)}, ${displayAddress(best.address)}, a ${formatPrice(secondary.cheapestPrice)}. La media del diésel A en ${name} es ${formatPrice(secondary.average)}.`,
    });
  }

  if (trend) {
    const direction = Math.abs(trend.change) < 0.005
      ? "se ha mantenido estable"
      : `ha ${trend.change < 0 ? "bajado" : "subido"} ${formatCents(trend.change)}`;
    const sentence = `Desde el ${formatDay(trend.from)}, el precio medio de la ${trend.label.toLowerCase()} en ${name} ${direction}: de ${formatPrice(trend.firstAverage)} a ${formatPrice(trend.lastAverage)}.`;
    paragraphs.push(sentence);
    faqs.push({ question: `¿Cómo ha cambiado el precio de la gasolina en ${name} este mes?`, answer: sentence });
  }

  if (cheapestBrand && topBrand) {
    paragraphs.push(
      cheapestBrand.name === topBrand.name
        ? `${topBrand.name} es la marca con más estaciones en ${name} (${topBrand.count}) y además la más barata de media.`
        : `${topBrand.name} es la marca con más estaciones en ${name} (${topBrand.count}), pero la más barata de media es ${cheapestBrand.name} (${formatPrice(cheapestBrand.average)}).`,
    );
  }

  faqs.push({
    question: `¿Hay gasolineras abiertas 24 horas en ${name}?`,
    answer: open24h.length
      ? `Sí, ${open24h.length === 1 ? "una abre" : `${open24h.length} abren`} las 24 horas: ${open24h.slice(0, 4).map((station) => `${displayBrand(station.brand)} (${displayAddress(station.address)})`).join(", ")}${open24h.length > 4 ? " y otras" : ""}.`
      : `Ninguna de las ${stations.length} gasolineras de ${name} declara horario de 24 horas. Consulta el horario de cada estación antes de ir de noche.`,
  });

  return { paragraphs, faqs };
}

// ── Ciudad y alrededores ─────────────────────────────────────────────────
// Quien vive en Bilbao también reposta en Barakaldo o Basauri: el mapa de cada
// ciudad incluye las gasolineras a menos de AREA_RADIUS_KM de su centro.
export const AREA_RADIUS_KM = 10;

export type AreaStation = Station & { distance: number; town: string; inCity: boolean };

const townLabel = (value: string) => {
  const match = value.match(/^(.*?) \((El|La|Los|Las|L'|A|O)\)$/i);
  return match ? `${match[2]}${match[2].endsWith("'") ? "" : " "}${match[1]}` : value;
};

export function getAreaStations(location: IndexedSeoLocation): AreaStation[] {
  const own = getCityStations(location);
  if (!own.length) return [];
  const center: Point = { lat: median(own.map((s) => s.lat)), lng: median(own.map((s) => s.lng)) };
  const ownIds = new Set(own.map((station) => station.id));
  return allStations
    .map((station) => ({ station, distance: distanceKm(center, station) }))
    .filter(({ station, distance }) => ownIds.has(station.id) || distance <= AREA_RADIUS_KM)
    .map(({ station, distance }) => ({
      ...station,
      distance: Math.round(distance * 10) / 10,
      town: townLabel(station.city),
      inCity: ownIds.has(station.id),
    }));
}
