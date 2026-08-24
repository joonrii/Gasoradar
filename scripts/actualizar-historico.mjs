// scripts/actualizar-historico.mjs
//
// GasolinaGo: descarga los precios oficiales del Ministerio y genera:
//   historico.json    → medias por provincia
//   historico.csv     → lo mismo en tabla, para análisis
//   rolling.json      → precios recientes por estación (uso interno)
//   comparativa.json  → precios de ayer y de hace 7 días
//   estaciones.json   → catálogo actual de TODAS las estaciones de España
//
// Se ejecuta desde GitHub Actions.

import fs from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

// Códigos oficiales de provincia → nombre. La API devuelve estaciones de toda España.
const PROVINCIAS = {
  "01": "Araba/Álava", "02": "Albacete", "03": "Alicante/Alacant", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Illes Balears", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón/Castelló",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria", "40": "Segovia",
  "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
  "45": "Toledo", "46": "Valencia/València", "47": "Valladolid", "48": "Bizkaia",
  "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla"
};

const COMUNIDADES = {
  "Araba/Álava": "País Vasco", "Gipuzkoa": "País Vasco", "Bizkaia": "País Vasco",
  "Navarra": "Navarra", "A Coruña": "Galicia", "Lugo": "Galicia", "Ourense": "Galicia", "Pontevedra": "Galicia",
  "Asturias": "Asturias", "Cantabria": "Cantabria", "Álava": "País Vasco",
  "León": "Castilla y León", "Palencia": "Castilla y León", "Salamanca": "Castilla y León", "Segovia": "Castilla y León", "Soria": "Castilla y León", "Valladolid": "Castilla y León", "Zamora": "Castilla y León", "Burgos": "Castilla y León", "Ávila": "Castilla y León",
  "Albacete": "Castilla-La Mancha", "Ciudad Real": "Castilla-La Mancha", "Cuenca": "Castilla-La Mancha", "Guadalajara": "Castilla-La Mancha", "Toledo": "Castilla-La Mancha",
  "Madrid": "Comunidad de Madrid", "Barcelona": "Cataluña", "Girona": "Cataluña", "Lleida": "Cataluña", "Tarragona": "Cataluña",
  "Alicante/Alacant": "Comunitat Valenciana", "Castellón/Castelló": "Comunitat Valenciana", "Valencia/València": "Comunitat Valenciana",
  "Almería": "Andalucía", "Cádiz": "Andalucía", "Córdoba": "Andalucía", "Granada": "Andalucía", "Huelva": "Andalucía", "Jaén": "Andalucía", "Málaga": "Andalucía", "Sevilla": "Andalucía",
  "Huesca": "Aragón", "Teruel": "Aragón", "Zaragoza": "Aragón",
  "La Rioja": "La Rioja", "Murcia": "Región de Murcia", "Badajoz": "Extremadura", "Cáceres": "Extremadura",
  "Illes Balears": "Illes Balears", "Las Palmas": "Canarias", "Santa Cruz de Tenerife": "Canarias",
  "Ceuta": "Ceuta", "Melilla": "Melilla"
};

const COMBUSTIBLES = {
  g95: "Precio Gasolina 95 E5",
  g98: "Precio Gasolina 98 E5",
  diesel: "Precio Gasoleo A",
  dieselPlus: "Precio Gasoleo Premium",
};

const DIAS_ATRAS = Number(process.env.DIAS || 3);
const MAX_POR_EJECUCION = 45;
const PAUSA_MS = 1500;
const DIAS_ROLLING = 3;

const CARPETA = "datos";
const F_JSON = path.join(CARPETA, "historico.json");
const F_CSV = path.join(CARPETA, "historico.csv");
const F_ROLLING = path.join(CARPETA, "rolling.json");
const F_COMPARATIVA = path.join(CARPETA, "comparativa.json");
const F_ESTACIONES = path.join(CARPETA, "estaciones.json");

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

function calcularAgregados(lista) {
  const acumulado = {};

  for (const e of lista) {
    const provincia = PROVINCIAS[e.IDProvincia] || e.Provincia || "Desconocida";

    for (const [clave, campo] of Object.entries(COMBUSTIBLES)) {
      const p = num(e[campo]);
      if (p === null) continue;
      acumulado[provincia] ??= {};
      acumulado[provincia][clave] ??= [];
      acumulado[provincia][clave].push(p);
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

function extraerPorEstacion(lista) {
  const salida = {};

  for (const e of lista) {
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

// Catálogo preparado para SEO y producto. Solo guardamos campos necesarios.
function generarEstaciones(lista, fecha) {
  const salida = {};

  for (const e of lista) {
    const id = e.IDEESS;
    if (!id) continue;

    const provincia = PROVINCIAS[e.IDProvincia] || e.Provincia || null;
    const comunidad = COMUNIDADES[provincia] || null;

    const precios = {};
    for (const [clave, campo] of Object.entries(COMBUSTIBLES)) {
      const p = num(e[campo]);
      if (p !== null) precios[clave] = p;
    }

    salida[id] = {
      id,
      nombre: e.Rotulo || "Gasolinera",
      direccion: e.Direccion || null,
      municipio: e.Municipio || null,
      provincia,
      comunidad,
      codigoPostal: e["C.P."] || null,
      latitud: num(e.Latitud),
      longitud: num(e.Longitud),
      horario: e.Horario || null,
      precios,
      actualizado: fecha,
    };
  }

  return salida;
}

function generarCSV(historico) {
  const filas = ["fecha,provincia,combustible,minimo,medio,maximo,estaciones"];
  for (const fecha of Object.keys(historico).sort()) {
    for (const [territorio, combustibles] of Object.entries(historico[fecha])) {
      for (const [combustible, v] of Object.entries(combustibles)) {
        filas.push([fecha, territorio, combustible, v.min, v.med, v.max, v.n].join(","));
      }
    }
  }
  return filas.join("\n") + "\n";
}

async function main() {
  await fs.mkdir(CARPETA, { recursive: true });

  const historico = await leerJSON(F_JSON, {});
  const rolling = await leerJSON(F_ROLLING, {});

  const hoy = new Date();
  hoy.setUTCHours(12, 0, 0, 0);

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

  let ok = 0, fallos = 0;
  let estacionesHoy = null;

  for (const { fecha, clave, esHoy, i } of aProcesar) {
    try {
      const lista = await descargarDia(fecha, esHoy);
      const agregados = calcularAgregados(lista);
      if (Object.keys(agregados).length === 0) throw new Error("sin datos de España");

      historico[clave] = agregados;

      if (i < DIAS_ROLLING) rolling[clave] = extraerPorEstacion(lista);
      if (esHoy) estacionesHoy = generarEstaciones(lista, clave);

      console.log(`  ${clave}: OK (${lista.length} estaciones, ${Object.keys(agregados).length} provincias)`);
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

  if (estacionesHoy) {
    await fs.writeFile(F_ESTACIONES, JSON.stringify({ generado: iso(hoy), estaciones: estacionesHoy }), "utf8");
    console.log(`Catálogo España: ${Object.keys(estacionesHoy).length} estaciones.`);
  }

  const histOrdenado = {};
  for (const k of Object.keys(historico).sort()) histOrdenado[k] = historico[k];

  const fechasRolling = Object.keys(rolling).sort().slice(-DIAS_ROLLING);
  const rollOrdenado = {};
  for (const k of fechasRolling) rollOrdenado[k] = rolling[k];

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

  console.log(`\nGuardado: ${ok} días nuevos, ${fallos} fallidos.`);
  console.log(`Histórico: ${Object.keys(histOrdenado).length} días.`);
}

main().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
