// GasolinaGo API
// Search and map data come from the Spanish Ministry fuel service.
// The browser never downloads the national dataset.

const R = 6371;
const MINISTRY = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const UA = 'GasolinaGo/1.0';
let municipalitiesPromise = null;
let provincesPromise = null;

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const num = v => { if(v===undefined||v===null||v==='') return null; const n=parseFloat(String(v).replace(',','.')); return Number.isFinite(n)?n:null; };
const safe = v => encodeURIComponent(clean(v));

function distanceKm(aLat,aLng,bLat,bLng){
  const dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const la1=aLat*Math.PI/180, la2=bLat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return R*2*Math.asin(Math.sqrt(h));
}
function params(req){
  if(req.query&&typeof req.query==='object') return req.query;
  try{return Object.fromEntries(new URL(req.url||'','http://localhost').searchParams.entries());}catch{return {};}
}
async function ministry(pathname){
  const r=await fetch(`${MINISTRY}${pathname}`,{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(15000)});
  if(!r.ok) throw new Error(`Ministerio HTTP ${r.status}`);
  return r.json();
}
async function municipalities(){
  if(!municipalitiesPromise){
    municipalitiesPromise=ministry('/Listados/Municipios/').then(data=>{
      const list=Array.isArray(data)?data:(data?.Municipios||data?.ListaMunicipios||[]);
      if(!Array.isArray(list)||!list.length) throw new Error('El Ministerio no devolvió municipios');
      return list;
    }).catch(e=>{municipalitiesPromise=null;throw e;});
  }
  return municipalitiesPromise;
}
async function provinces(){
  if(!provincesPromise){
    provincesPromise=ministry('/Listados/Provincias/').then(data=>{
      if(!Array.isArray(data)||!data.length) throw new Error('El Ministerio no devolvió provincias');
      return data;
    }).catch(e=>{provincesPromise=null;throw e;});
  }
  return provincesPromise;
}
function getProvinceId(p){return clean(p?.IDPovincia||p?.IDProvincia||p?.idProvincia);}
async function resolveProvinceId(value){
  const raw=clean(value);
  if(/^\d{1,2}$/.test(raw)) return raw.padStart(2,'0');
  const list=await provinces(), needle=norm(raw);
  const found=list.find(p=>norm(p.Provincia)===needle)||list.find(p=>norm(p.Provincia).includes(needle)||needle.includes(norm(p.Provincia)));
  return getProvinceId(found);
}
function normalizeStation(e){return{
  id:clean(e.IDEESS),marca:clean(e['Rótulo']),municipio:clean(e['Municipio']||e['Localidad']),provincia:clean(e['Provincia']),dir:clean(e['Dirección']),horario:clean(e['Horario']),
  lat:num(e['Latitud']),lng:num(e['Longitud (WGS84)']||e['Longitud_x0020__x0028_WGS84_x0029_']),
  g95:num(e['Precio Gasolina 95 E5']||e['Precio Gasolina 95 E10']),g98:num(e['Precio Gasolina 98 E5']||e['Precio Gasolina 98 E10']),diesel:num(e['Precio Gasoleo A']),dieselPlus:num(e['Precio Gasoleo Premium'])
};}
async function resolveSearch(q){
  const list=await municipalities(), needle=norm(q);
  const matches=list.filter(x=>{const n=norm(x.Municipio),p=norm(x.Provincia);return n===needle||n.startsWith(needle)||n.includes(needle)||p===needle;})
    .sort((a,b)=>(norm(a.Municipio)===needle?0:1)-(norm(b.Municipio)===needle?0:1)||norm(a.Municipio).localeCompare(norm(b.Municipio))).slice(0,8);
  const locations=[];
  for(const x of matches){
    try{
      const data=await ministry(`/EstacionesTerrestres/FiltroMunicipio/${safe(x.IDMunicipio)}`);
      const rows=Array.isArray(data?.ListaEESSPrecio)?data.ListaEESSPrecio:[];
      const ss=rows.map(normalizeStation).filter(s=>s.lat!==null&&s.lng!==null);
      if(!ss.length) continue;
      locations.push({nombre:clean(x.Municipio),provincia:clean(x.Provincia),idProvincia:clean(x.IDProvincia),idMunicipio:clean(x.IDMunicipio),lat:ss.reduce((a,s)=>a+s.lat,0)/ss.length,lng:ss.reduce((a,s)=>a+s.lng,0)/ss.length,n:ss.length});
    }catch(e){console.warn('Municipality lookup failed',x.IDMunicipio,e.message);}
  }
  return locations;
}
async function reverseProvince(lat,lng){
  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=10&addressdetails=1`;
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'GasolinaGo/1.0'},signal:AbortSignal.timeout(8000)});
  if(!r.ok) throw new Error(`Geocodificación HTTP ${r.status}`);
  const a=(await r.json())?.address||{};
  return clean(a.province||a.state_district||a.state);
}
async function provinceStations(value){
  const id=await resolveProvinceId(value);
  if(!id) throw new Error(`No se reconoce la provincia: ${value}`);
  const data=await ministry(`/EstacionesTerrestres/FiltroProvincia/${safe(id)}`);
  const rows=Array.isArray(data?.ListaEESSPrecio)?data.ListaEESSPrecio:[];
  return rows.map(normalizeStation).filter(s=>s.lat!==null&&s.lng!==null&&(s.g95!==null||s.g98!==null||s.diesel!==null||s.dieselPlus!==null));
}
export default async function handler(req,res){
  try{
    const q=params(req), search=clean(q.q);
    if(search){const locations=await resolveSearch(search);res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');return res.status(200).json({locations,total:locations.length});}
    const lat=Number(q.lat),lng=Number(q.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return res.status(400).json({error:'Falta la ubicación (lat/lng).'});
    const radius=Math.min(Math.max(Number(q.radio)||20,5),40);
    let province=clean(q.provincia); if(!province) province=await reverseProvince(lat,lng);
    if(!province) return res.status(400).json({error:'No se ha podido identificar la provincia.'});
    const all=await provinceStations(province);
    const stations=all.map(s=>({...s,dist:distanceKm(lat,lng,s.lat,s.lng)})).filter(s=>s.dist<=radius).sort((a,b)=>a.dist-b.dist).slice(0,600);
    res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({fecha:new Date().toISOString(),total:stations.length,origen:{lat,lng},provincia:province,radio:radius,estaciones:stations});
  }catch(e){console.error('GasolinaGo API error:',e);return res.status(502).json({error:e?.message||'No se han podido obtener los datos oficiales.'});}
}
