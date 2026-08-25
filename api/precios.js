// Fast, location-aware proxy for the Ministry official station data.
const MINISTERIO = "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const num = v => v ? parseFloat(String(v).replace(",", ".")) : null;
const R = 6371;
const MAX_ESTACIONES = 350;
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

async function traerEspaña() {
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

function getQuery(req) {
  const q = req.query || {};
  const lat = Number(q.lat), lng = Number(q.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
}

function getGeoFromVercel(req) {
  const lat = Number(req.headers["x-vercel-ip-latitude"]);
  const lng = Number(req.headers["x-vercel-ip-longitude"]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
}

export default async function handler(req, res) {
  try {
    const raw = await traerEspaña();
    const todas = raw.map(normalizar)
      .filter(e => e.lat != null && e.lng != null)
      .filter(e => e.g95 || e.g98 || e.diesel || e.dieselPlus);
    if (!todas.length) throw new Error("No se obtuvo ninguna estación");

    const origen = getQuery(req) || getGeoFromVercel(req);
    let estaciones;
    if (origen) {
      estaciones = todas
        .map(e => ({...e, _dist: distanciaKm(origen.lat, origen.lng, e.lat, e.lng)}))
        .sort((a,b) => a._dist-b._dist)
        .slice(0, MAX_ESTACIONES)
        .map(({_dist, ...e}) => e);
    } else {
      estaciones = todas.slice(0, MAX_ESTACIONES);
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({
      fecha: new Date().toLocaleString("es-ES", {timeZone:"Europe/Madrid"}),
      total: estaciones.length,
      totalEspaña: todas.length,
      fallidos: [],
      estaciones
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
}
