// api/precios.js
// Trae las gasolineras de toda España desde el servicio oficial del Ministerio.
// No necesita ninguna librería ni instalación.

const BASE =
  "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroCCAA/";

const num = (v) => (v ? parseFloat(String(v).replace(",", ".")) : null);

async function traerEspaña() {
  // 00 = todas las comunidades autónomas / ámbito nacional en este servicio.
  // Se usa el endpoint general como respaldo si el filtro nacional no está disponible.
  const urls = [
    "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/",
  ];

  let lastError;
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("El Ministerio respondió " + r.status);
      const data = await r.json();
      return data.ListaEESSPrecio || [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("No se pudieron obtener las estaciones");
}

function normalizar(e) {
  return {
    id: e["IDEESS"],
    marca: e["Rótulo"],
    municipio: e["Municipio"],
    provincia: e["Provincia"],
    dir: e["Dirección"],
    horario: e["Horario"],
    lat: num(e["Latitud"]),
    lng: num(e["Longitud (WGS84)"]),
    g95: num(e["Precio Gasolina 95 E5"]),
    g98: num(e["Precio Gasolina 98 E5"]),
    diesel: num(e["Precio Gasoleo A"]),
    dieselPlus: num(e["Precio Gasoleo Premium"]),
  };
}

export default async function handler(req, res) {
  try {
    const raw = await traerEspaña();

    const estaciones = raw
      .map(normalizar)
      .filter((e) => e.lat && e.lng)
      .filter((e) => e.g95 || e.g98 || e.diesel || e.dieselPlus);

    if (!estaciones.length) throw new Error("No se obtuvo ninguna estación");

    // Cachea 30 min en Vercel: no llamamos al Ministerio en cada visita.
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({
      fecha: new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
      total: estaciones.length,
      fallidos: [],
      estaciones,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
