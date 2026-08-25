// GasolinaGo API: search uses a compact locality index; station queries load only the relevant province.
import fs from "node:fs/promises";
import path from "node:path";

const R = 6371;
const DATA = path.join(process.cwd(), "datos");
const num = v => v === undefined || v === null || v === "" ? null : parseFloat(String(v).replace(",", "."));
const safeName = s => String(s || "").replace(/[^A-Za-z0-9_-]/g, "_");
const normalizaTexto = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function distanciaKm(aLat,aLng,bLat,bLng){
  const dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const la1=aLat*Math.PI/180, la2=bLat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return R*2*Math.asin(Math.sqrt(h));
}
function queryParams(req){
  if(req.query && typeof req.query === "object") return req.query;
  try{return Object.fromEntries(new URL(req.url||"","http://localhost").searchParams.entries())}catch(_){return {}};
}
function pointFrom(req,q){
  const lat=Number(q.lat), lng=Number(q.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng)) return {lat,lng};
  const hLat=Number(req.headers?.["x-vercel-ip-latitude"]), hLng=Number(req.headers?.["x-vercel-ip-longitude"]);
  return Number.isFinite(hLat)&&Number.isFinite(hLng)?{lat:hLat,lng:hLng}:null;
}

async function readJson(file){return JSON.parse(await fs.readFile(file,"utf8"));}
async function readLocalidades(){
  try{return await readJson(path.join(DATA,"localidades.json"))}catch(_){return []}
}
async function readGeo(){
  try{return await readJson(path.join(DATA,"estaciones-geo.json"))}catch(_){return []}
}
async function readProvince(provincia){
  try{return await readJson(path.join(DATA,"provincias",`${safeName(provincia)}.json`))}catch(_){return []}
}
function normalizar(e){
  return {id:e.id??e.IDEESS,marca:e.marca??e["Rótulo"],municipio:e.municipio??e["Municipio"],provincia:e.provincia??e["Provincia"],dir:e.dir??e["Dirección"],horario:e.horario??e["Horario"],lat:num(e.lat??e["Latitud"]),lng:num(e.lng??e["Longitud (WGS84)"]),g95:num(e.g95??e["Precio Gasolina 95 E5"]),g98:num(e.g98??e["Precio Gasolina 98 E5"]),diesel:num(e.diesel??e["Precio Gasoleo A"]),dieselPlus:num(e.dieselPlus??e["Precio Gasoleo Premium"])};
}

export default async function handler(req,res){
  try{
    const q=queryParams(req);
    const searchText=String(q.q||"").trim();

    if(searchText){
      const nq=normalizaTexto(searchText);
      const localidades=await readLocalidades();
      const locations=localidades.filter(x=>normalizaTexto([x.nombre,x.provincia].join(" ")).includes(nq)).slice(0,12);
      res.setHeader("Cache-Control","public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({locations,total:locations.length});
    }

    const point=pointFrom(req,q);
    if(!point) return res.status(200).json({requiresLocation:true,estaciones:[],total:0});

    const radius=Math.min(Math.max(Number(q.radio)||20,5),40);
    let provincia=String(q.provincia||"").trim();
    if(!provincia){
      const geo=await readGeo();
      let nearest=null;
      for(const g of geo){const d=distanciaKm(point.lat,point.lng,g.lat,g.lng);if(!nearest||d<nearest.d)nearest={provincia:g.provincia,d};}
      provincia=nearest?.provincia||"";
    }
    let raw=provincia?await readProvince(provincia):[];
    // If the province index is unavailable, use the legacy national snapshot as a safe fallback.
    if(!raw.length){try{const all=await readJson(path.join(DATA,"estaciones.json"));raw=all.estaciones||[]}catch(_){} }
    const todas=raw.map(normalizar).filter(e=>e.lat!=null&&e.lng!=null&&(e.g95!=null||e.g98!=null||e.diesel!=null||e.dieselPlus!=null));
    const estaciones=todas.map(e=>({...e,dist:distanciaKm(point.lat,point.lng,e.lat,e.lng)})).filter(e=>e.dist<=radius).sort((a,b)=>a.dist-b.dist).slice(0,600);
    res.setHeader("Cache-Control","private, max-age=60, stale-while-revalidate=300");
    return res.status(200).json({fecha:new Date().toLocaleString("es-ES",{timeZone:"Europe/Madrid"}),total:estaciones.length,origen:point,provincia,radio,estaciones});
  }catch(err){
    console.error("GasolinaGo API error:",err);
    return res.status(500).json({error:err?.message||"Error interno de la API"});
  }
}
