import { COMMUNITIES } from "@/lib/communities";
import { SEO_LOCATIONS, type SeoLocation } from "@/lib/locations";
import { getFallbackStations } from "@/lib/stations";

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (value: string) => normalize(value).replace(/ /g, "-");
const MUNICIPALITIES_SOURCE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Municipios/";
const NOMINATIM_SOURCE = "https://nominatim.openstreetmap.org/search";
const provinceByIso: Record<string, string> = {
  VI: "01", AB: "02", A: "03", AL: "04", AV: "05", BA: "06", PM: "07", B: "08", BU: "09", CC: "10", CA: "11", CS: "12", CR: "13", CO: "14", C: "15", CU: "16", GI: "17", GR: "18", GU: "19", SS: "20", H: "21", HU: "22", J: "23", LE: "24", L: "25", LO: "26", LU: "27", M: "28", MA: "29", MU: "30", NA: "31", OR: "32", O: "33", P: "34", GC: "35", PO: "36", SA: "37", TF: "38", S: "39", SG: "40", SE: "41", SO: "42", T: "43", TE: "44", TO: "45", V: "46", VA: "47", BI: "48", ZA: "49", Z: "50", CE: "51", ML: "52",
};

type OfficialMunicipality = {
  IDMunicipio: string;
  IDProvincia: string;
  Municipio: string;
  Provincia: string;
};

const provinceIds = new Map<string, string>();
for (const community of COMMUNITIES) {
  community.provinceNames.forEach((name, index) => provinceIds.set(normalize(name), community.provinceIds[index]));
}

const locationIndex = (() => {
  const locations = new Map<string, SeoLocation>();
  for (const location of SEO_LOCATIONS) locations.set(`${location.city}|${location.province}`, location);
  for (const station of getFallbackStations()) {
    const provinceId = provinceIds.get(normalize(station.province));
    if (!provinceId || !station.city) continue;
    const key = `${station.city}|${station.province}`;
    if (!locations.has(key)) {
      locations.set(key, {
        provinceId,
        provinceSlug: slugify(station.province),
        citySlug: slugify(station.city),
        city: station.city,
        province: station.province,
        displayName: station.city,
      });
    }
  }
  return [...locations.values()];
})();

async function getOfficialLocations() {
  const response = await fetch(MUNICIPALITIES_SOURCE, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error(`Municipios: HTTP ${response.status}`);
  const municipalities = (await response.json()) as OfficialMunicipality[];
  return municipalities.map((item): SeoLocation => ({
    municipalityId: item.IDMunicipio,
    provinceId: item.IDProvincia,
    provinceSlug: slugify(item.Provincia),
    citySlug: slugify(item.Municipio),
    city: item.Municipio,
    province: item.Provincia,
    displayName: item.Municipio,
  }));
}

async function resolveWithOpenStreetMap(query: string): Promise<SeoLocation[]> {
  const url = new URL(NOMINATIM_SOURCE);
  url.searchParams.set("q", `${query}, España`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("limit", "3");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "GasolinaGo/2.0 (https://www.gasolinago.com)" },
    next: { revalidate: 2592000 },
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error(`Geocodificación: HTTP ${response.status}`);
  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    name: string;
    address: Record<string, string>;
  }>;
  return results.flatMap((item) => {
    const iso = item.address["ISO3166-2-lvl6"]?.replace("ES-", "");
    const provinceId = provinceByIso[iso];
    const province = item.address.state_district ?? item.address.province;
    const city = item.address.city ?? item.address.town ?? item.address.village ?? item.address.municipality ?? item.name;
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!provinceId || !province || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{
      provinceId,
      provinceSlug: slugify(province),
      citySlug: slugify(city),
      city,
      province: province.toUpperCase(),
      displayName: city,
      center: { lat, lng },
    }];
  });
}

export async function GET(request: Request) {
  const query = normalize(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) return Response.json({ locations: [] });
  const localMatches = locationIndex
    .filter((location) => normalize(`${location.displayName} ${location.province}`).includes(query))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"))
    .slice(0, 8);
  if (localMatches.length) return Response.json({ locations: localMatches }, { headers: { "Cache-Control": "public, s-maxage=86400" } });

  let locations: SeoLocation[] = [];
  try {
    locations = await Promise.any([
      getOfficialLocations().then((items) => {
        const matches = items.filter((location) => normalize(`${location.displayName} ${location.province}`).includes(query)).slice(0, 8);
        if (!matches.length) throw new Error("Sin coincidencias oficiales");
        return matches;
      }),
      resolveWithOpenStreetMap(query).then((items) => {
        if (!items.length) throw new Error("Sin coincidencias geográficas");
        return items;
      }),
    ]);
  } catch (error) {
    console.error("No se pudo resolver el municipio", error);
  }
  return Response.json({ locations }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
