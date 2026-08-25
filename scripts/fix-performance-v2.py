from pathlib import Path
import re

root = Path('.')
index = root / 'index.html'
text = index.read_text(encoding='utf-8')

# Leaflet MarkerCluster: clusters collapse/expand naturally as the user zooms.
needle = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />'
insert = needle + '\n<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />\n<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />'
if 'leaflet.markercluster' not in text:
    text = text.replace(needle, insert, 1)

needle = '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>'
insert = needle + '\n<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>'
if 'leaflet.markercluster.js' not in text:
    text = text.replace(needle, insert, 1)

# Replace the plain layer group with a real cluster group.
text = text.replace('const capa = L.layerGroup().addTo(map);', '''const capa = L.markerClusterGroup({
  chunkedLoading: true,
  chunkInterval: 100,
  chunkDelay: 20,
  maxClusterRadius: 55,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 15,
  animate: true
}).addTo(map);''', 1)

# The previous optimization accidentally limited Spain to the visitor's IP area.
# The API now returns the full dataset and the map handles it through clustering.
text = text.replace('lista.slice(0, 180).forEach(s => {', 'lista.forEach(s => {', 1)

# Fix province objects being rendered as [object Object].
text = text.replace('TERRITORIOS.forEach(t => {\n  const b = document.createElement("button");\n  b.className = "chip2" + (t===terr ? " on" : "");\n  b.dataset.terr = t; b.textContent = t;', '''TERRITORIOS.forEach(tObj => {
  const t = typeof tObj === "string" ? tObj : tObj.nombre;
  const b = document.createElement("button");
  b.className = "chip2" + (t===terr ? " on" : "");
  b.dataset.terr = t; b.textContent = t;''', 1)

# Do not block the first screen behind the Ministry request. Render the shell immediately,
# then populate it when the API responds.
old = '''async function cargarDatos(){
  try{
    // No pedimos permisos de ubicación al entrar. Vercel aporta una ubicación aproximada por IP.
    const r = await fetch("/api/precios");
    if (!r.ok) throw new Error("respuesta "+r.status);
    const data = await r.json();
    if (!data.estaciones || !data.estaciones.length) throw new Error("sin estaciones");
    STATIONS = data.estaciones;
    comparativa = data.comparativa || null;
    setEstado("ok", "Precios oficiales del Ministerio" + (data.fecha ? " · actualizado "+data.fecha : ""));
  }catch(err){
    STATIONS = RESPALDO;
    setEstado("aviso", "No se pudieron cargar los precios reales — mostrando datos de ejemplo");
    console.warn("Fallo al cargar /api/precios:", err);
  }
  STATIONS.forEach(s => { s._k = claveBusqueda(s); s._nat = formaNatural(s.municipio); });
  if (STATIONS.length) map.fitBounds(STATIONS.map(s=>[s.lat,s.lng]), { padding:[60,60] });
  document.getElementById("scan").classList.add("hide");
  document.getElementById("app").classList.add("show");
  setTimeout(()=> map.invalidateSize(), 450);
  render(true);
  setTimeout(()=> document.getElementById("panelFiltros").classList.add("open"), 550);
}'''
new = '''async function cargarDatos(){
  // Show the map immediately; data arrives asynchronously.
  document.getElementById("scan").classList.add("hide");
  document.getElementById("app").classList.add("show");
  setTimeout(()=> map.invalidateSize(), 100);
  render(true);

  try{
    const r = await fetch("/api/precios", { cache:"no-store" });
    if (!r.ok) throw new Error("respuesta "+r.status);
    const data = await r.json();
    if (!data.estaciones || !data.estaciones.length) throw new Error("sin estaciones");
    STATIONS = data.estaciones;
    comparativa = data.comparativa || null;
    setEstado("ok", "Precios oficiales del Ministerio" + (data.fecha ? " · actualizado "+data.fecha : ""));
  }catch(err){
    STATIONS = RESPALDO;
    setEstado("aviso", "No se pudieron cargar los precios reales — mostrando datos de ejemplo");
    console.warn("Fallo al cargar /api/precios:", err);
  }
  STATIONS.forEach(s => { s._k = claveBusqueda(s); s._nat = formaNatural(s.municipio); });
  if (STATIONS.length) map.fitBounds(STATIONS.map(s=>[s.lat,s.lng]), { padding:[60,60] });
  render(true);
}'''
if old not in text:
    raise SystemExit('cargarDatos block not found')
text = text.replace(old, new, 1)

index.write_text(text, encoding='utf-8')

# Update API to serve the pre-generated static station snapshot first.
api = root / 'api' / 'precios.js'
a = api.read_text(encoding='utf-8')
if 'estaciones.json' not in a:
    a = a.replace('const MINISTERIO = "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/";', '''const MINISTERIO = "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/";
import fs from "node:fs/promises";
import path from "node:path";''', 1)

start = a.index('async function traerEspaña() {')
end = a.index('\n}\n\nfunction normalizar', start) + 2
new_fetch = '''async function traerEspaña() {
  // Static snapshot generated by GitHub Actions: avoids a slow Ministry request on every cold start.
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
}'''
a = a[:start] + new_fetch + a[end:]
# Remove the old 350-station geographic limitation.
a = a.replace('const MAX_ESTACIONES = 350;\n', '', 1)
old_logic = '''    const origen = getQuery(req) || getGeoFromVercel(req);
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
'''
new_logic = '''    const origen = getQuery(req) || getGeoFromVercel(req);
    let estaciones = todas;
    if (origen) {
      estaciones = todas.map(e => ({...e, _dist: distanciaKm(origen.lat, origen.lng, e.lat, e.lng)}));
    }
    // Keep all stations. The browser uses MarkerCluster to render them efficiently.
'''
if old_logic not in a:
    raise SystemExit('API old logic not found')
a = a.replace(old_logic, new_logic, 1)
a = a.replace('      estaciones\n    });', '      estaciones: estaciones.map(({_dist, ...e}) => e)\n    });', 1)
api.write_text(a, encoding='utf-8')

# Prepare the daily ETL to publish a complete current station snapshot.
etl = root / 'scripts' / 'actualizar-historico.mjs'
e = etl.read_text(encoding='utf-8')
e = e.replace('const F_COMPARATIVA = path.join(CARPETA, "comparativa.json");', 'const F_COMPARATIVA = path.join(CARPETA, "comparativa.json");\nconst F_ESTACIONES = path.join(CARPETA, "estaciones.json");', 1)
e = e.replace('  await fs.writeFile(F_COMPARATIVA, JSON.stringify(comparativa), "utf8");', '''  await fs.writeFile(F_COMPARATIVA, JSON.stringify(comparativa), "utf8");

  // Publish today's complete station snapshot for the fast web API.
  const hoyLista = await descargarDia(hoy, true);
  const estaciones = hoyLista.map((e) => ({
    id: e.IDEESS, marca: e["Rótulo"], municipio: e["Municipio"], provincia: e["Provincia"],
    dir: e["Dirección"], horario: e["Horario"],
    lat: num(e["Latitud"]), lng: num(e["Longitud (WGS84)"]),
    g95: num(e["Precio Gasolina 95 E5"]), g98: num(e["Precio Gasolina 98 E5"]),
    diesel: num(e["Precio Gasoleo A"]), dieselPlus: num(e["Precio Gasoleo Premium"])
  })).filter(e => e.lat !== null && e.lng !== null && (e.g95 || e.g98 || e.diesel || e.dieselPlus));
  await fs.writeFile(F_ESTACIONES, JSON.stringify({ fecha: iso(hoy), estaciones }), "utf8");''', 1)
etl.write_text(e, encoding='utf-8')

print('Performance v2 migration prepared.')
