import { SEO_LOCATIONS, type SeoLocation } from "@/lib/locations";
import { getFallbackStations } from "@/lib/stations";

const MIN_STATIONS_PER_CITY = 3;
const MAX_INDEXED_CITIES = 500;

const PROVINCE_IDS = [
  "ARABA/ÁLAVA", "ALBACETE", "ALICANTE", "ALMERÍA", "ÁVILA", "BADAJOZ",
  "BALEARS (ILLES)", "BARCELONA", "BURGOS", "CÁCERES", "CÁDIZ",
  "CASTELLÓN / CASTELLÓ", "CIUDAD REAL", "CÓRDOBA", "CORUÑA (A)", "CUENCA",
  "GIRONA", "GRANADA", "GUADALAJARA", "GIPUZKOA", "HUELVA", "HUESCA",
  "JAÉN", "LEÓN", "LLEIDA", "RIOJA (LA)", "LUGO", "MADRID", "MÁLAGA",
  "MURCIA", "NAVARRA", "OURENSE", "ASTURIAS", "PALENCIA", "PALMAS (LAS)",
  "PONTEVEDRA", "SALAMANCA", "SANTA CRUZ DE TENERIFE", "CANTABRIA", "SEGOVIA",
  "SEVILLA", "SORIA", "TARRAGONA", "TERUEL", "TOLEDO", "VALENCIA / VALÈNCIA",
  "VALLADOLID", "BIZKAIA", "ZAMORA", "ZARAGOZA", "CEUTA", "MELILLA",
] as const;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const provinceIdByName = new Map(
  PROVINCE_IDS.map((province, index) => [normalize(province), String(index + 1).padStart(2, "0")]),
);

const articleName = (value: string) => {
  const match = value.match(/^(.*?) \((El|La|Los|Las|L'|A|O)\)$/i);
  if (!match) return value;
  const article = match[2].toLowerCase() === "l'" ? "L'" : `${match[2]} `;
  return `${article}${match[1]}`;
};

const displayLabel = (value: string) => {
  const reordered = articleName(value);
  if (reordered !== reordered.toLocaleUpperCase("es-ES")) return reordered;
  return reordered
    .toLocaleLowerCase("es-ES")
    .replace(/(^|[\s/])([a-záéíóúüñ])/g, (_, separator, letter: string) => `${separator}${letter.toLocaleUpperCase("es-ES")}`);
};

const provinceSlugOverrides = new Map(
  SEO_LOCATIONS.map((location) => [normalize(location.province), location.provinceSlug]),
);

export type IndexedSeoLocation = SeoLocation & { stationCount: number };

export type SeoProvince = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  stationCount: number;
  locations: IndexedSeoLocation[];
};

const stations = getFallbackStations();
const cityCounts = new Map<string, number>();
const provinceCounts = new Map<string, number>();

for (const station of stations) {
  const cityKey = `${station.province}\u0000${station.city}`;
  cityCounts.set(cityKey, (cityCounts.get(cityKey) ?? 0) + 1);
  provinceCounts.set(station.province, (provinceCounts.get(station.province) ?? 0) + 1);
}

const curatedKeys = new Set(SEO_LOCATIONS.map((location) => `${location.province}\u0000${location.city}`));
const curated: IndexedSeoLocation[] = SEO_LOCATIONS.map((location) => ({
  ...location,
  stationCount: cityCounts.get(`${location.province}\u0000${location.city}`) ?? 0,
}));

const generated = [...cityCounts.entries()]
  .filter(([key, count]) => count >= MIN_STATIONS_PER_CITY && !curatedKeys.has(key))
  .map(([key, stationCount]) => {
    const [province, city] = key.split("\u0000");
    return {
      provinceId: provinceIdByName.get(normalize(province)) ?? "",
      provinceSlug: provinceSlugOverrides.get(normalize(province)) ?? normalize(articleName(province)),
      citySlug: normalize(articleName(city)),
      city,
      province,
      displayName: articleName(city),
      stationCount,
    } satisfies IndexedSeoLocation;
  })
  .sort((a, b) => b.stationCount - a.stationCount || a.displayName.localeCompare(b.displayName, "es"));

const provinceSeeds = [...new Set(generated.map((location) => location.province))]
  .flatMap((province) => generated.filter((location) => location.province === province).slice(0, 5));

export const INDEXED_SEO_LOCATIONS = [...curated, ...provinceSeeds, ...generated]
  .filter((location, index, all) => all.findIndex(
    (candidate) => candidate.provinceSlug === location.provinceSlug && candidate.citySlug === location.citySlug,
  ) === index)
  .slice(0, MAX_INDEXED_CITIES);

export const SEO_PROVINCES: SeoProvince[] = [...provinceCounts.entries()]
  .map(([name, stationCount]) => {
    const slug = provinceSlugOverrides.get(normalize(name)) ?? normalize(articleName(name));
    return {
      id: provinceIdByName.get(normalize(name)) ?? "",
      slug,
      name,
      displayName: displayLabel(name),
      stationCount,
      locations: INDEXED_SEO_LOCATIONS
        .filter((location) => location.province === name)
        .sort((a, b) => b.stationCount - a.stationCount || a.displayName.localeCompare(b.displayName, "es")),
    };
  })
  .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));

export function getIndexedSeoLocation(provinceSlug: string, citySlug: string) {
  return INDEXED_SEO_LOCATIONS.find(
    (location) => location.provinceSlug === provinceSlug && location.citySlug === citySlug,
  );
}

export function getSeoProvince(provinceSlug: string) {
  return SEO_PROVINCES.find((province) => province.slug === provinceSlug);
}

export function getSeoLocationPath(location: SeoLocation) {
  return `/gasolineras/${location.provinceSlug}/${location.citySlug}`;
}

export function getSeoProvincePath(province: Pick<SeoProvince, "slug">) {
  return `/gasolineras/${province.slug}`;
}
