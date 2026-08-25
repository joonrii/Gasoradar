// GasolinaGo API: national snapshot stays server-side; browser only receives selected area.
const MINISTERIO = "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/";
import fs from "node:fs/promises";
import path from "node:path";

const num = v => v === undefined || v === null || v === "" ? null : parseFloat(String(v).replace(",", "."));
const R = 6371;
let memoria = null;
let memoriaTs = 0;

function distanciaKm(aLat, aLng, bLat, bLng) {
  const dLat = (bLat-aLat)*Math.PI/180;
  const dLng = (bLng-aLng)*Math.PI/180;
  const la1 = aLat*Math.PI/180;
  const la2 = bLat*Math.PI/180;
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function esCoordenadaEspana(lat, lng) {
  const mainland = lat >= 35.8 && lat <= 43.95 && lng >= -9.6 && lng <= 3.35;
  const baleares = lat >= 38.55 && lat <= 40.25 && lng >= 1.0 && lng <= 4.45;
  const canarias = lat >= 27.4 && lat <= 29.55 && lng >= -18.6 && lng <= -12.8;
  const ceutaMelilla = lat >= 35.0 && lat <= 35.95 && lng >= -5.5 && lng <= -2.4;
  return mainland || baleares || canarias || ceutaMelilla;
}

async function traerEspaña() {
  try {
    const file = path.join(process.cwd(), "datos", "estaciones.json");
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    if (Array.isArray(raw.estaciones) && raw.estaciones.length) return raw.estaciones;
  } catch (_) {}

  const ahora = Date.now();
  if (memoria && ahora - memoriaTs < 1800000) return memoria;
  const r = await fetch(MINISTERIO);
  if (!r.ok) throw new Error("El Ministerio respondió " + r.status);
  const data = await r.json();
  memoria = data.ListaEESSPrecio || [];
  memoriaTs = ahora;
  return memoria;
}

function normalizar(e) {
  return {
    id: e["IDEESS"], marca: e["Rótulo"], municipio: e["Municipio"],
    provincia: e["Provincia"], dir: e["Dirección"], horario: e["Horario"],
    lat: num(e["Latitud"]), lng: num(e["Longitud (WGS84)"]),
    g95: num(e["Precio Gasolina 95 E5"]), g98: num(e["Precio Gasolina 98 E5"]),
    diesel: num(e["Precio Gasoleo A"]), dieselPlus: num(e["Precio Gasoleo Premium"])
  };
}

function queryParams(req) {
  // Vercel's Node runtime normally exposes req.query, but parsing req.url as a
  // fallback makes the endpoint robust across local/dev and runtime variants.
  if (req.query && typeof req.query === "object") return req.query;
  try { return Object.fromEntries(new URL(req.url || "", "http://localhost").searchParams.entries()); }
  catch (_) { return {}; }
}

function origen(req, q) {
  const lat = Number(q.lat), lng = Number(q.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
  const hLat = Number(req.headers?.["x-vercel-ip-latitude"]);
  const hLng = Number(req.headers?.["x-vercel-ip-longitude"]);
  return Number.isFinite(hLat) && Number.isFinite(hLng) ? {lat:hLat, lng:hLng} : null;
}

function normalizaTexto(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default async function handler(req, res) {
  try {
    const q = queryParams(req);
    const raw = await traerEspaña();
    const todas = raw.map(normalizar)
      .filter(e => e.lat != null && e.lng != null && esCoordenadaEspana(e.lat, e.lng))
      .filter(e => e.g95 != null || e.g98 != null || e.diesel != null || e.dieselPlus != null);

    const searchText = String(q.q || "").trim();
    const point = origen(req, q);

    // Search mode: return municipalities, never the station dataset.
    if (searchText) {
      const nq = normalizaTexto(searchText);
      const matches = todas.filter(e => {
        const haystack = normalizaTexto([e.municipio, e.provincia, e.marca, e.dir].join(" "));
        return haystack.includes(nq);
      });
      const groups = new Map();
      for (const e of matches) {
        const key = `${e.municipio}|${e.provincia}`;
        if (!groups.has(key)) groups.set(key, {nombre:e.municipio, provincia:e.provincia, latSum:0, lngSum:0, n:0});
        const g = groups.get(key);
        g.latSum += e.lat; g.lngSum += e.lng; g.n++;
      }
      const locations = [...groups.values()]
        .map(g => ({nombre:g.nombre, provincia:g.provincia, lat:g.latSum/g.n, lng:g.lngSum/g.n, n:g.n}))
        .sort((a,b) => b.n-a.n)
        .slice(0, 12);
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({locations, total:matches.length});
    }

    if (!point) {
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
      return res.status(200).json({requiresLocation:true, totalEspaña:todas.length, estaciones:[]});
    }

    const radius = Math.min(Math.max(Number(q.radio) || 20, 5), 40);
    const estaciones = todas
      .map(e => ({...e, dist:distanciaKm(point.lat, point.lng, e.lat, e.lng)}))
      .filter(e => e.dist <= radius)
      .sort((a,b) => a.dist-b.dist)
      .slice(0, 600);

    res.setHeader("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return res.status(200).json({
      fecha: new Date().toLocaleString("es-ES", {timeZone:"Europe/Madrid"}),
      total: estaciones.length,
      totalEspaña:todas.length,
      origen:point,
      radio: radius,
      estaciones
    });
  } catch (err) {
    console.error("GasolinaGo API error:", err);
    return res.status(500).json({error: err?.message || "Error interno de la API"});
  }
}
