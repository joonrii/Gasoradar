import { COMMUNITIES } from "@/lib/communities";
import { SEO_LOCATIONS, type SeoLocation } from "@/lib/locations";
import { getFallbackStations } from "@/lib/stations";

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (value: string) => normalize(value).replace(/ /g, "-");
const MUNICIPALITIES_SOURCE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Municipios/";

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
    signal: AbortSignal.timeout(8000),
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

export async function GET(request: Request) {
  const query = normalize(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) return Response.json({ locations: [] });
  let source = locationIndex;
  try {
    source = await getOfficialLocations();
  } catch (error) {
    console.error("Índice local de municipios activado", error);
  }
  const locations = source
    .filter((location) => normalize(`${location.displayName} ${location.province}`).includes(query))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"))
    .slice(0, 8);
  return Response.json({ locations }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
