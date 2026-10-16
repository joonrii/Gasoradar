import { getZoneForPoint } from "@/lib/zone";

// Vercel añade la ubicación aproximada de la IP (nivel ciudad) en estas
// cabeceras. No se guarda ni se reenvía: solo sirve para elegir la ciudad.
export async function GET(request: Request) {
  const lat = Number(request.headers.get("x-vercel-ip-latitude"));
  const lng = Number(request.headers.get("x-vercel-ip-longitude"));
  const country = request.headers.get("x-vercel-ip-country");
  const zone = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && country === "ES" ? getZoneForPoint(lat, lng) : null;
  return Response.json({ zone }, { headers: { "Cache-Control": "private, no-store" } });
}
