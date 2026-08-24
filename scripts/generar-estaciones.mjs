// scripts/generar-estaciones.mjs
// Genera el catálogo actual de todas las estaciones de España a partir de la API oficial.

import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const OUTPUT = path.join("datos", "estaciones.json");

const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const PROVINCIAS = {
  "01":"Araba/Álava","02":"Albacete","03":"Alicante/Alacant","04":"Almería","05":"Ávila","06":"Badajoz","07":"Illes Balears","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón/Castelló","13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada","19":"Guadalajara","20":"Gipuzkoa","21":"Huelva","22":"Huesca","23":"Jaén","24":"León","25":"Lleida","26":"La Rioja","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia","31":"Navarra","32":"Ourense","33":"Asturias","34":"Palencia","35":"Las Palmas","36":"Pontevedra","37":"Salamanca","38":"Santa Cruz de Tenerife","39":"Cantabria","40":"Segovia","41":"Sevilla","42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia/València","47":"Valladolid","48":"Bizkaia","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla"
};

const COMUNIDADES = {
  "Araba/Álava":"País Vasco","Gipuzkoa":"País Vasco","Bizkaia":"País Vasco","Navarra":"Navarra",
  "A Coruña":"Galicia","Lugo":"Galicia","Ourense":"Galicia","Pontevedra":"Galicia","Asturias":"Asturias","Cantabria":"Cantabria",
  "León":"Castilla y León","Palencia":"Castilla y León","Salamanca":"Castilla y León","Segovia":"Castilla y León","Soria":"Castilla y León","Valladolid":"Castilla y León","Zamora":"Castilla y León","Burgos":"Castilla y León","Ávila":"Castilla y León",
  "Albacete":"Castilla-La Mancha","Ciudad Real":"Castilla-La Mancha","Cuenca":"Castilla-La Mancha","Guadalajara":"Castilla-La Mancha","Toledo":"Castilla-La Mancha",
  "Madrid":"Comunidad de Madrid","Barcelona":"Cataluña","Girona":"Cataluña","Lleida":"Cataluña","Tarragona":"Cataluña",
  "Alicante/Alacant":"Comunitat Valenciana","Castellón/Castelló":"Comunitat Valenciana","Valencia/València":"Comunitat Valenciana",
  "Almería":"Andalucía","Cádiz":"Andalucía","Córdoba":"Andalucía","Granada":"Andalucía","Huelva":"Andalucía","Jaén":"Andalucía","Málaga":"Andalucía","Sevilla":"Andalucía",
  "Huesca":"Aragón","Teruel":"Aragón","Zaragoza":"Aragón","La Rioja":"La Rioja","Murcia":"Región de Murcia","Badajoz":"Extremadura","Cáceres":"Extremadura",
  "Illes Balears":"Illes Balears","Las Palmas":"Canarias","Santa Cruz de Tenerife":"Canarias","Ceuta":"Ceuta","Melilla":"Melilla"
};

const res = await fetch(BASE, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
const lista = data.ListaEESSPrecio;
if (!Array.isArray(lista) || !lista.length) throw new Error("La API no devolvió estaciones");

const estaciones = {};
for (const e of lista) {
  const id = e.IDEESS;
  if (!id) continue;
  const provincia = PROVINCIAS[e.IDProvincia] || e.Provincia || null;
  estaciones[id] = {
    id,
    nombre: e.Rotulo || "Gasolinera",
    direccion: e.Direccion || null,
    municipio: e.Municipio || null,
    provincia,
    comunidad: COMUNIDADES[provincia] || null,
    codigoPostal: e["C.P."] || null,
    latitud: num(e.Latitud),
    longitud: num(e.Longitud),
    horario: e.Horario || null,
    precios: {
      g95: num(e["Precio Gasolina 95 E5"]),
      g98: num(e["Precio Gasolina 98 E5"]),
      diesel: num(e["Precio Gasoleo A"]),
      dieselPlus: num(e["Precio Gasoleo Premium"])
    },
    actualizado: new Date().toISOString()
  };
}

await fs.mkdir("datos", { recursive: true });
await fs.writeFile(OUTPUT, JSON.stringify({ generado: new Date().toISOString(), estaciones }), "utf8");
console.log(`Catálogo generado: ${Object.keys(estaciones).length} estaciones.`);
