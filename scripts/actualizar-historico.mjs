// scripts/actualizar-historico.mjs
//
// Descarga los precios de los días que falten y los añade al histórico.
// Genera dos archivos:
//   datos/historico.json → lo lee la web (compacto)
//   datos/historico.csv  → para abrir en Power BI o Excel
//
// Se ejecuta solo desde GitHub Actions. No hace falta instalar nada.

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

const DIAS_ATRAS = Number(process.env.DIAS || 3);   // cuántos días revisar hacia atrás
const MAX_POR_EJECUCION = 45;                        // tope de días nuevos por ejecución
const PAUSA_MS = 1500;                               // pausa entre llamadas, por educación

const CARPETA = "datos";
const F_JSON = path.join(CARPETA, "historico.json");
const F_CSV = path.join(CARPETA, "historico.csv");

// ── Utilidades ───────────────────────────────────────────────────────────
const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const iso = (d) => d.toISOString().slice(0, 10);              // 2026-07-24

const formatoAPI = (d) => {                                    // 24-07-2026
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const redondear = (n) => Math.round(n * 1000) / 1000;

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

// ── Cálculo de agregados de un día ───────────────────────────────────────
function calcularAgregados(lista) {
  const acumulado = {};   // territorio → combustible → array de precios

  for (const e of lista) {
    const nombre = PROVINCIAS[e.IDProvincia];
    if (!nombre) continue;                       // no es uno de nuestros territorios

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

// ── Escritura del CSV (formato largo, ideal para Power BI) ───────────────
function generarCSV(historico) {
  const filas = ["fecha,territorio,combustible,minimo,medio,maximo,estaciones"];
  const fechas = Object.keys(historico).sort();

  for (const fecha of fechas) {
    for (const [territorio, combustibles] of Object.entries(historico[fecha])) {
      for (const [combustible, v] of Object.entries(combustibles)) {
        filas.push(
          [fecha, territorio, combustible, v.min, v.med, v.max, v.n].join(",")
        );
      }
    }
  }
  return filas.join("\n") + "\n";
}

// ── Principal ────────────────────────────────────────────────────────────
async function main() {
  await fs.mkdir(CARPETA, { recursive: true });

  // Cargar histórico existente (si lo hay)
  let historico = {};
  try {
    historico = JSON.parse(await fs.readFile(F_JSON, "utf8"));
    console.log(`Histórico actual: ${Object.keys(historico).length} días`);
  } catch {
    console.log("No hay histórico previo. Se creará desde cero.");
  }

  // Qué días faltan
  const hoy = new Date();
  hoy.setUTCHours(12, 0, 0, 0);
  const pendientes = [];

  for (let i = 0; i < DIAS_ATRAS; i++) {
    const d = new Date(hoy);
    d.setUTCDate(d.getUTCDate() - i);
    const clave = iso(d);
    if (!historico[clave]) pendientes.push({ fecha: d, clave, esHoy: i === 0 });
  }

  pendientes.reverse();                                  // del más antiguo al más nuevo
  const aProcesar = pendientes.slice(0, MAX_POR_EJECUCION);

  if (aProcesar.length === 0) {
    console.log("No falta ningún día. Nada que hacer.");
    return;
  }
  console.log(`Días a descargar: ${aProcesar.length} (de ${pendientes.length} pendientes)`);

  let ok = 0, fallos = 0;

  for (const { fecha, clave, esHoy } of aProcesar) {
    try {
      const lista = await descargarDia(fecha, esHoy);
      const agregados = calcularAgregados(lista);

      if (Object.keys(agregados).length === 0) {
        console.log(`  ${clave}: sin datos de nuestros territorios, se omite`);
        fallos++;
      } else {
        historico[clave] = agregados;
        const t = Object.keys(agregados).length;
        console.log(`  ${clave}: OK (${t} territorios)`);
        ok++;
      }
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

  // Ordenar por fecha antes de guardar
  const ordenado = {};
  for (const k of Object.keys(historico).sort()) ordenado[k] = historico[k];

  await fs.writeFile(F_JSON, JSON.stringify(ordenado), "utf8");
  await fs.writeFile(F_CSV, generarCSV(ordenado), "utf8");

  console.log(`\nGuardado: ${ok} días nuevos, ${fallos} fallidos.`);
  console.log(`Total en el histórico: ${Object.keys(ordenado).length} días.`);
}

main().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
