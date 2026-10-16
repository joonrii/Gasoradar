// scripts/actualizar-historico.mjs
//
// Genera dentro de datos/:
//   historico.json     → medias por territorio (la web pinta el gráfico)
//   historico.csv      → lo mismo en tabla, para Power BI
//   rolling/NN.json    → precios por gasolinera de los últimos días, un archivo
//                        por provincia (NN = IDProvincia) con fechas en columnas
//   observatorio.json  → resumen nacional y provincial de los últimos días
//   estaciones.json    → instantánea de hoy, respaldo si la API falla
//
// Se ejecuta desde GitHub Actions. No hace falta instalar nada.

import fs from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

const COMBUSTIBLES = {
  g95:        "Precio Gasolina 95 E5",
  g98:        "Precio Gasolina 98 E5",
  diesel:     "Precio Gasoleo A",
  dieselPlus: "Precio Gasoleo Premium",
};

const DIAS_ATRAS = Number(process.env.DIAS || 3);
const MAX_POR_EJECUCION = 45;
const PAUSA_MS = 1500;
const DIAS_ROLLING = 30;         // ventana real del minigráfico por estación
const DIAS_OBSERVATORIO = 30;    // ventana nacional para el dashboard
const MIN_ESTACIONES_NACIONAL = 5000;

const CARPETA = "datos";
const F_JSON = path.join(CARPETA, "historico.json");
const F_CSV = path.join(CARPETA, "historico.csv");
const D_ROLLING = path.join(CARPETA, "rolling");
const F_OBSERVATORIO = path.join(CARPETA, "observatorio.json");
const F_ESTACIONES = path.join(CARPETA, "estaciones.json");

// ── Utilidades ───────────────────────────────────────────────────────────
const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const coordenada = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const coordenadaEnEspana = (lat, lng) =>
  lat >= 27 && lat <= 44.5 && lng >= -18.5 && lng <= 5;

const iso = (d) => d.toISOString().slice(0, 10);

const formatoAPI = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const redondear = (n) => Math.round(n * 1000) / 1000;

const leerJSON = async (ruta, porDefecto) => {
  try { return JSON.parse(await fs.readFile(ruta, "utf8")); }
  catch { return porDefecto; }
};

function extraerDiasObservatorio(valor, salida = {}) {
  if (!valor || typeof valor !== "object") return salida;

  // Recupera también archivos generados por versiones antiguas que podían
  // anidar `{ generado, dias }` dentro de `dias` en ejecuciones sucesivas.
  if (valor.dias && typeof valor.dias === "object") {
    extraerDiasObservatorio(valor.dias, salida);
  }

  for (const [fecha, datos] of Object.entries(valor)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && datos?.nacional && datos?.provincias) {
      salida[fecha] = datos;
    }
  }
  return salida;
}

// ── Descarga de un día ───────────────────────────────────────────────────
async function descargarDia(fecha, esHoy) {
  const url = esHoy
    ? BASE + "EstacionesTerrestres/"
    : BASE + "EstacionesTerrestresHist/" + formatoAPI(fecha);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const lista = data.ListaEESSPrecio;
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error("respuesta sin estaciones");
  }
  return lista;
}

// ── Medias por territorio ────────────────────────────────────────────────
function calcularAgregados(lista) {
  const acumulado = {};

  for (const e of lista) {
    const nombre = String(e.Provincia || e.IDProvincia || "Sin provincia").trim();

    for (const [clave, campo] of Object.entries(COMBUSTIBLES)) {
      const p = num(e[campo]);
      if (p === null) continue;
      acumulado[nombre] ??= {};
      acumulado[nombre][clave] ??= [];
      acumulado[nombre][clave].push(p);
    }
  }

  const resultado = {};
  for (const [territorio, combustibles] of Object.entries(acumulado)) {
    resultado[territorio] = {};
    for (const [clave, precios] of Object.entries(combustibles)) {
      precios.sort((a, b) => a - b);
      const suma = precios.reduce((a, b) => a + b, 0);
      resultado[territorio][clave] = {
        min: redondear(precios[0]),
        med: redondear(suma / precios.length),
        max: redondear(precios[precios.length - 1]),
        n: precios.length,
      };
    }
  }
  return resultado;
}

function calcularResumenObservatorio(lista) {
  const provincias = calcularAgregados(lista);
  const nacional = {};

  for (const combustibles of Object.values(provincias)) {
    for (const [clave, valores] of Object.entries(combustibles)) {
      nacional[clave] ??= { suma: 0, n: 0, min: Infinity, max: -Infinity };
      nacional[clave].suma += valores.med * valores.n;
      nacional[clave].n += valores.n;
      nacional[clave].min = Math.min(nacional[clave].min, valores.min);
      nacional[clave].max = Math.max(nacional[clave].max, valores.max);
    }
  }

  const combustiblesNacionales = {};
  for (const [clave, valores] of Object.entries(nacional)) {
    combustiblesNacionales[clave] = {
      min: redondear(valores.min),
      med: redondear(valores.suma / valores.n),
      max: redondear(valores.max),
      n: valores.n,
    };
  }

  return { nacional: combustiblesNacionales, provincias };
}

// ── Precios estación por estación (minigráfico) ──────────────────────────
const FUELS = Object.keys(COMBUSTIBLES);

// rolling[fecha][idEstacion] = { g95, ... }; provinciaDe[idEstacion] = "28"
async function leerRolling() {
  const rolling = {};
  const provinciaDe = {};
  let archivos = [];
  try { archivos = await fs.readdir(D_ROLLING); } catch { /* primera ejecución */ }
  for (const archivo of archivos.filter((a) => /^\d{2}\.json$/.test(a))) {
    const provincia = archivo.slice(0, 2);
    const { fechas, estaciones } = await leerJSON(path.join(D_ROLLING, archivo), { fechas: [], estaciones: {} });
    for (const [id, series] of Object.entries(estaciones)) {
      provinciaDe[id] = provincia;
      fechas.forEach((fecha, i) => {
        const precios = {};
        for (const fuel of FUELS) if (series[fuel]?.[i] != null) precios[fuel] = series[fuel][i];
        if (Object.keys(precios).length) (rolling[fecha] ??= {})[id] = precios;
      });
    }
  }
  return { rolling, provinciaDe };
}

async function escribirRolling(rolling, provinciaDe) {
  const fechas = Object.keys(rolling).sort();
  const porProvincia = {};
  const ids = new Set(fechas.flatMap((f) => Object.keys(rolling[f])));
  for (const id of ids) {
    const provincia = provinciaDe[id];
    if (!provincia) continue;
    const series = {};
    for (const fuel of FUELS) {
      const valores = fechas.map((f) => rolling[f][id]?.[fuel] ?? null);
      if (valores.some((v) => v !== null)) series[fuel] = valores;
    }
    (porProvincia[provincia] ??= {})[id] = series;
  }
  await fs.rm(D_ROLLING, { recursive: true, force: true });
  await fs.mkdir(D_ROLLING, { recursive: true });
  for (const [provincia, estaciones] of Object.entries(porProvincia)) {
    await fs.writeFile(path.join(D_ROLLING, `${provincia}.json`), JSON.stringify({ fechas, estaciones }), "utf8");
  }
}

function extraerPorEstacion(lista, provinciaDe) {
  const salida = {};

  for (const e of lista) {
    const id = e.IDEESS;
    if (!id) continue;
    if (e.IDProvincia) provinciaDe[id] = String(e.IDProvincia).padStart(2, "0");

    const precios = {};
    for (const [clave, campo] of Object.entries(COMBUSTIBLES)) {
      const p = num(e[campo]);
      if (p !== null) precios[clave] = p;
    }
    if (Object.keys(precios).length) salida[id] = precios;
  }
  return salida;
}

function crearSnapshotEstaciones(lista, fecha) {
  const estaciones = lista.flatMap((e) => {
    const lat = coordenada(e.Latitud);
    const lng = coordenada(e["Longitud (WGS84)"]);
    if (lat === null || lng === null || !coordenadaEnEspana(lat, lng)) return [];
    const estacion = {
      id: String(e.IDEESS || ""),
      marca: String(e["Rótulo"] || "Sin rótulo"),
      municipio: String(e.Municipio || ""),
      provincia: String(e.Provincia || ""),
      idProvincia: String(e.IDProvincia || ""),
      dir: String(e["Dirección"] || ""),
      horario: String(e.Horario || "Horario no disponible"),
      lat,
      lng,
      g95: num(e["Precio Gasolina 95 E5"]),
      g98: num(e["Precio Gasolina 98 E5"]),
      diesel: num(e["Precio Gasoleo A"]),
      dieselPlus: num(e["Precio Gasoleo Premium"]),
    };
    return estacion.g95 || estacion.g98 || estacion.diesel || estacion.dieselPlus ? [estacion] : [];
  });
  return { fecha, estaciones };
}

// ── CSV para Power BI ────────────────────────────────────────────────────
function generarCSV(historico) {
  const filas = ["fecha,territorio,combustible,minimo,medio,maximo,estaciones"];
  for (const fecha of Object.keys(historico).sort()) {
    for (const [territorio, combustibles] of Object.entries(historico[fecha])) {
      for (const [combustible, v] of Object.entries(combustibles)) {
        filas.push([fecha, territorio, combustible, v.min, v.med, v.max, v.n].join(","));
      }
    }
  }
  return filas.join("\n") + "\n";
}

// ── Principal ────────────────────────────────────────────────────────────
async function main() {
  await fs.mkdir(CARPETA, { recursive: true });

  const historico = await leerJSON(F_JSON, {});
  const { rolling, provinciaDe } = await leerRolling();
  const observatorioGuardado = await leerJSON(F_OBSERVATORIO, {});
  const observatorio = extraerDiasObservatorio(observatorioGuardado);
  const observatorioNecesitaReparacion = Object.keys(observatorioGuardado.dias ?? {}).some(
    (clave) => !/^\d{4}-\d{2}-\d{2}$/.test(clave),
  );
  const snapshotActual = await leerJSON(F_ESTACIONES, { fecha: null, estaciones: [] });
  const snapshotTieneCoordenadasInvalidas = snapshotActual.estaciones.some(
    (estacion) => !coordenadaEnEspana(Number(estacion.lat), Number(estacion.lng)),
  );
  console.log(`Histórico actual: ${Object.keys(historico).length} días`);

  const hoy = new Date();
  hoy.setUTCHours(12, 0, 0, 0);

  // Días que faltan en el histórico
  const pendientes = [];
  const diasAConsultar = Math.max(DIAS_ATRAS, DIAS_ROLLING, DIAS_OBSERVATORIO);
  for (let i = 0; i < diasAConsultar; i++) {
    const d = new Date(hoy);
    d.setUTCDate(d.getUTCDate() - i);
    const clave = iso(d);
    const faltaHist = !historico[clave];
    // Las versiones antiguas solo guardaban cuatro provincias. Volvemos a
    // descargar esos días hasta tener una instantánea con cobertura nacional.
    const estacionesGuardadas = Object.keys(rolling[clave] || {}).length;
    const faltaRolling = i < DIAS_ROLLING && estacionesGuardadas < MIN_ESTACIONES_NACIONAL;
    const faltaObservatorio = i < DIAS_OBSERVATORIO && !observatorio[clave];
    const faltaSnapshot = i === 0 && (
      snapshotActual.fecha !== clave ||
      snapshotActual.estaciones.length < MIN_ESTACIONES_NACIONAL ||
      snapshotTieneCoordenadasInvalidas
    );
    if (faltaHist || faltaRolling || faltaObservatorio || faltaSnapshot) pendientes.push({ fecha: d, clave, esHoy: i === 0, i });
  }

  pendientes.reverse();
  const aProcesar = pendientes.slice(0, MAX_POR_EJECUCION);

  if (aProcesar.length === 0) {
    if (observatorioNecesitaReparacion) {
      const diasOrdenados = {};
      for (const clave of Object.keys(observatorio).sort().slice(-DIAS_OBSERVATORIO)) {
        diasOrdenados[clave] = observatorio[clave];
      }
      await fs.writeFile(F_OBSERVATORIO, JSON.stringify({ generado: iso(hoy), dias: diasOrdenados }), "utf8");
      console.log(`Observatorio reparado: ${Object.keys(diasOrdenados).length} días válidos.`);
    }
    console.log("No falta ningún día. Nada que hacer.");
    return;
  }
  console.log(`Días a descargar: ${aProcesar.length} (de ${pendientes.length} pendientes)`);

  let ok = 0, fallos = 0;
  let snapshotNuevo = null;

  for (const { fecha, clave, esHoy, i } of aProcesar) {
    try {
      const lista = await descargarDia(fecha, esHoy);

      const agregados = calcularAgregados(lista);
      if (Object.keys(agregados).length === 0) throw new Error("sin datos territoriales");
      historico[clave] = agregados;

      if (i < DIAS_OBSERVATORIO) observatorio[clave] = calcularResumenObservatorio(lista);
      if (i === 0) snapshotNuevo = crearSnapshotEstaciones(lista, clave);

      // Solo guardamos el detalle por estación de los días recientes
      if (i < DIAS_ROLLING) rolling[clave] = extraerPorEstacion(lista, provinciaDe);

      console.log(`  ${clave}: OK (${Object.keys(agregados).length} territorios)`);
      ok++;
    } catch (err) {
      console.log(`  ${clave}: fallo (${err.message})`);
      fallos++;
    }
    await esperar(PAUSA_MS);
  }

  if (ok === 0) {
    console.log("No se pudo guardar ningún día nuevo.");
    return;
  }

  // Ordenar el histórico
  const histOrdenado = {};
  for (const k of Object.keys(historico).sort()) histOrdenado[k] = historico[k];

  // Podar el rolling: solo los últimos días
  const fechasRolling = Object.keys(rolling).sort().slice(-DIAS_ROLLING);
  const rollOrdenado = {};
  for (const k of fechasRolling) rollOrdenado[k] = rolling[k];

  const fechasObservatorio = Object.keys(observatorio).sort().slice(-DIAS_OBSERVATORIO);
  const observatorioOrdenado = {};
  for (const k of fechasObservatorio) observatorioOrdenado[k] = observatorio[k];

  await fs.writeFile(F_JSON, JSON.stringify(histOrdenado), "utf8");
  await fs.writeFile(F_CSV, generarCSV(histOrdenado), "utf8");
  await escribirRolling(rollOrdenado, provinciaDe);
  await fs.writeFile(F_OBSERVATORIO, JSON.stringify({
    generado: iso(hoy),
    dias: observatorioOrdenado,
  }), "utf8");
  if (snapshotNuevo) await fs.writeFile(F_ESTACIONES, JSON.stringify(snapshotNuevo), "utf8");

  console.log(`\nGuardado: ${ok} días nuevos, ${fallos} fallidos.`);
  console.log(`Histórico: ${Object.keys(histOrdenado).length} días.`);
  console.log(`Histórico por estación: ${fechasRolling.length} días en ${D_ROLLING}/.`);
  if (snapshotNuevo) console.log(`Snapshot nacional: ${snapshotNuevo.estaciones.length} estaciones.`);
}

main().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
