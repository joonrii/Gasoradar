import { COMMUNITIES } from "@/lib/communities";
import { SEO_LOCATIONS, type SeoLocation } from "@/lib/locations";
import { getFallbackStations } from "@/lib/stations";

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (value: string) => normalize(value).replace(/ /g, "-");

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

export async function GET(request: Request) {
  const query = normalize(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) return Response.json({ locations: [] });
  const locations = locationIndex
    .filter((location) => normalize(`${location.displayName} ${location.province}`).includes(query))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"))
    .slice(0, 8);
  return Response.json({ locations }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
