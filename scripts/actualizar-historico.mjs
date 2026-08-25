// scripts/actualizar-historico.mjs
//
// Genera cuatro archivos dentro de datos/:
//   historico.json    → medias por territorio (la web pinta el gráfico)
//   historico.csv     → lo mismo en tabla, para Power BI
//   rolling.json      → precios por gasolinera de los últimos días (uso interno)
//   comparativa.json  → precios de ayer y de hace 7 días por gasolinera (la web)
//
// Se ejecuta desde GitHub Actions. No hace falta instalar nada.

import fs from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

const PROVINCIAS = {
  "48": "Bizkaia",
  "20": "Gipuzkoa",
  "01": "Araba",
  "31": "Navarra",
};

const COMBUSTIBLES = {
  g95:        "Precio Gasolina 95 E5",
  g98:        "Precio Gasolina 98 E5",
  diesel:     "Precio Gasoleo A",
  dieselPlus: "Precio Gasoleo Premium",
};

const DIAS_ATRAS = Number(process.env.DIAS || 3);
const MAX_POR_EJECUCION = 45;
const PAUSA_MS = 1500;
const DIAS_ROLLING = 9;          // días de precios por estación que conservamos

const CARPETA = "datos";
const F_JSON = path.join(CARPETA, "historico.json");
const F_CSV = path.join(CARPETA, "historico.csv");
const F_ROLLING = path.join(CARPETA, "rolling.json");
const F_COMPARATIVA = path.join(CARPETA, "comparativa.json");
const F_ESTACIONES = path.join(CARPETA, "estaciones.json");

// ── Utilidades ───────────────────────────────────────────────────────────
const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

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
    const nombre = PROVINCIAS[e.IDProvincia];
    if (!nombre) continue;

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

// ── Precios estación por estación (para las flechas) ─────────────────────
function extraerPorEstacion(lista) {
  const salida = {};

  for (const e of lista) {
    if (!PROVINCIAS[e.IDProvincia]) continue;
    const id = e.IDEESS;
    if (!id) continue;

    const precios = {};
    for (const [clave, campo] of Object.entries(COMBUSTIBLES)) {
      const p = num(e[campo]);
      if (p !== null) precios[clave] = p;
    }
    if (Object.keys(precios).length) salida[id] = precios;
  }
  return salida;
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
  const rolling = await leerJSON(F_ROLLING, {});
  console.log(`Histórico actual: ${Object.keys(historico).length} días`);

  const hoy = new Date();
  hoy.setUTCHours(12, 0, 0, 0);

  // Días que faltan en el histórico
  const pendientes = [];
  for (let i = 0; i < DIAS_ATRAS; i++) {
    const d = new Date(hoy);
    d.setUTCDate(d.getUTCDate() - i);
    const clave = iso(d);
    const faltaHist = !historico[clave];
    const faltaRolling = i < DIAS_ROLLING && !rolling[clave];
    if (faltaHist || faltaRolling) pendientes.push({ fecha: d, clave, esHoy: i === 0, i });
  }

  pendientes.reverse();
  const aProcesar = pendientes.slice(0, MAX_POR_EJECUCION);

  if (aProcesar.length === 0) {
    console.log("No falta ningún día. Nada que hacer.");
    return;
  }
  console.log(`Días a descargar: ${aProcesar.length} (de ${pendientes.length} pendientes)`);

  let ok = 0, fallos = 0;

  for (const { fecha, clave, esHoy, i } of aProcesar) {
    try {
      const lista = await descargarDia(fecha, esHoy);

      const agregados = calcularAgregados(lista);
      if (Object.keys(agregados).length === 0) throw new Error("sin datos de nuestros territorios");
      historico[clave] = agregados;

      // Solo guardamos el detalle por estación de los días recientes
      if (i < DIAS_ROLLING) rolling[clave] = extraerPorEstacion(lista);

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

  // Comparativa: ayer y hace 7 días
  const fechaDe = (dias) => {
    const d = new Date(hoy);
    d.setUTCDate(d.getUTCDate() - dias);
    return iso(d);
  };
  const claveAyer = fechaDe(1);
  const claveSemana = fechaDe(7);

  const comparativa = {
    generado: iso(hoy),
    fechaAyer: rollOrdenado[claveAyer] ? claveAyer : null,
    fechaSemana: rollOrdenado[claveSemana] ? claveSemana : null,
    ayer: rollOrdenado[claveAyer] || {},
    semana: rollOrdenado[claveSemana] || {},
  };

  await fs.writeFile(F_JSON, JSON.stringify(histOrdenado), "utf8");
  await fs.writeFile(F_CSV, generarCSV(histOrdenado), "utf8");
  await fs.writeFile(F_ROLLING, JSON.stringify(rollOrdenado), "utf8");
  await fs.writeFile(F_COMPARATIVA, JSON.stringify(comparativa), "utf8");

  // Publish today's complete station snapshot for the fast web API.
  const hoyLista = await descargarDia(hoy, true);
  const estaciones = hoyLista.map((e) => ({
    id: e.IDEESS, marca: e["Rótulo"], municipio: e["Municipio"], provincia: e["Provincia"],
    dir: e["Dirección"], horario: e["Horario"],
    lat: num(e["Latitud"]), lng: num(e["Longitud (WGS84)"]),
    g95: num(e["Precio Gasolina 95 E5"]), g98: num(e["Precio Gasolina 98 E5"]),
    diesel: num(e["Precio Gasoleo A"]), dieselPlus: num(e["Precio Gasoleo Premium"])
  })).filter(e => e.lat !== null && e.lng !== null && (e.g95 || e.g98 || e.diesel || e.dieselPlus));
  await fs.writeFile(F_ESTACIONES, JSON.stringify({ fecha: iso(hoy), estaciones }), "utf8");

  console.log(`\nGuardado: ${ok} días nuevos, ${fallos} fallidos.`);
  console.log(`Histórico: ${Object.keys(histOrdenado).length} días.`);
  console.log(`Comparativa: ayer=${comparativa.fechaAyer || "no disponible"}, semana=${comparativa.fechaSemana || "no disponible"}`);
}

main().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
