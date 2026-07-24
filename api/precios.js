// api/precios.js
// Función serverless de Vercel.
// Llama a la API del Ministerio, limpia los datos y los devuelve listos para usar.
// No necesita ninguna librería ni instalación.

const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/48";
// 48 = Bizkaia. Cambia este número para otra provincia (28 = Madrid, 8 = Barcelona…)

// "1,459" → 1.459   |   "" → null
const precio = (v) => (v ? parseFloat(String(v).replace(",", ".")) : null);
const coord  = (v) => (v ? parseFloat(String(v).replace(",", ".")) : null);

export default async function handler(req, res) {
  try {
    const r = await fetch(API_URL);
    if (!r.ok) throw new Error("El Ministerio respondió " + r.status);

    const data = await r.json();
    const lista = data.ListaEESSPrecio || [];

    const estaciones = lista
      .map((e) => ({
        marca:      e["Rótulo"],
        municipio:  e["Municipio"],
        dir:        e["Dirección"],
        horario:    e["Horario"],
        lat:        coord(e["Latitud"]),
        lng:        coord(e["Longitud (WGS84)"]),
        g95:        precio(e["Precio Gasolina 95 E5"]),
        g98:        precio(e["Precio Gasolina 98 E5"]),
        diesel:     precio(e["Precio Gasoleo A"]),
        dieselPlus: precio(e["Precio Gasoleo Premium"]),
      }))
      // descarta estaciones sin coordenadas válidas o sin ningún precio
      .filter((e) => e.lat && e.lng)
      .filter((e) => e.g95 || e.g98 || e.diesel || e.dieselPlus);

    // Cachea la respuesta 30 min en Vercel: no llamamos al Ministerio en cada visita
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ fecha: data.Fecha || null, estaciones });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
