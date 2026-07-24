// api/precios.js
// Trae las gasolineras de Euskadi y Navarra.
// No necesita ninguna librería ni instalación.

const BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

// Códigos oficiales de provincia
const TERRITORIOS = [
  { id: "48", nombre: "Bizkaia" },
  { id: "20", nombre: "Gipuzkoa" },
  { id: "01", nombre: "Araba" },
  { id: "31", nombre: "Navarra" },
];

// "1,459" → 1.459   |   "" → null
const num = (v) => (v ? parseFloat(String(v).replace(",", ".")) : null);

async function traerProvincia(t) {
  const r = await fetch(BASE + t.id);
  if (!r.ok) throw new Error(t.nombre + ": el Ministerio respondió " + r.status);
  const data = await r.json();

  return (data.ListaEESSPrecio || []).map((e) => ({
    marca:      e["Rótulo"],
    municipio:  e["Municipio"],
    provincia:  t.nombre,
    dir:        e["Dirección"],
    horario:    e["Horario"],
    lat:        num(e["Latitud"]),
    lng:        num(e["Longitud (WGS84)"]),
    g95:        num(e["Precio Gasolina 95 E5"]),
    g98:        num(e["Precio Gasolina 98 E5"]),
    diesel:     num(e["Precio Gasoleo A"]),
    dieselPlus: num(e["Precio Gasoleo Premium"]),
  }));
}

export default async function handler(req, res) {
  try {
    // Las cuatro llamadas a la vez, no una detrás de otra (más rápido)
    const resultados = await Promise.allSettled(TERRITORIOS.map(traerProvincia));

    const estaciones = resultados
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .filter((e) => e.lat && e.lng)
      .filter((e) => e.g95 || e.g98 || e.diesel || e.dieselPlus);

    if (!estaciones.length) throw new Error("No se obtuvo ninguna estación");

    // Avisa si algún territorio falló, pero sin tumbar el resto
    const fallidos = resultados
      .map((r, i) => (r.status === "rejected" ? TERRITORIOS[i].nombre : null))
      .filter(Boolean);

    // Cachea 30 min en Vercel: no llamamos al Ministerio en cada visita
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({
      fecha: new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
      total: estaciones.length,
      fallidos,
      estaciones,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
