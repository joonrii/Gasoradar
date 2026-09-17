const GEOCODE_SOURCE = "https://nominatim.openstreetmap.org/search";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get("city")?.trim();
  const province = params.get("province")?.trim();
  if (!city || !province) return Response.json({ error: "Falta la ubicación" }, { status: 400 });

  const url = new URL(GEOCODE_SOURCE);
  url.searchParams.set("q", `${city}, ${province}, España`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "GasolinaGo/2.0 (https://www.gasolinago.com)" },
    next: { revalidate: 2592000 },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return Response.json({ error: "No se pudo localizar el municipio" }, { status: 502 });
  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const lat = Number(results[0]?.lat);
  const lng = Number(results[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ point: null });
  return Response.json({ point: { lat, lng } }, { headers: { "Cache-Control": "public, s-maxage=2592000" } });
}
