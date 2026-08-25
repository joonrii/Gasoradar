// GasolinaGo API
// The browser never downloads the national dataset. Search resolves a municipality first;
// map requests then fetch only that province from the Ministry API and cache the result.

const R = 6371;
const MINISTRY = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const UA = 'GasolinaGo/1.0';
let municipalitiesPromise = null;

const num = v => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const clean = v => String(v ?? '').trim();
const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const safe = s => encodeURIComponent(clean(s));

function distanceKm(aLat,aLng,bLat,bLng){
  const dLat=(bLat-aLat)*Math.PI/180;
  const dLng=(bLng-aLng)*Math.PI/180;
  const la1=aLat*Math.PI/180;
  const la2=bLat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return R*2*Math.asin(Math.sqrt(h));
}

function params(req){
  if(req.query && typeof req.query === 'object') return req.query;
  try { return Object.fromEntries(new URL(req.url || '', 'http://localhost').searchParams.entries()); }
  catch { return {}; }
}

async function ministry(pathname){
  const r = await fetch(`${MINISTRY}${pathname}`, {
    headers: { Accept:'application/json', 'User-Agent':UA },
    signal: AbortSignal.timeout(15000)
  });
  if(!r.ok) throw new Error(`Ministerio HTTP ${r.status}`);
  return r.json();
}

async function municipalities(){
  if(!municipalitiesPromise){
    municipalitiesPromise = ministry('/Listados/Municipios/').then(data => Array.isArray(data) ? data : []).catch(err => {
      municipalitiesPromise = null;
      throw err;
    });
  }
  return municipalitiesPromise;
}

function normalizeStation(e){
  return {
    id:clean(e.IDEESS),
    marca:clean(e['Rótulo']),
    municipio:clean(e['Municipio'] || e['Localidad']),
    provincia:clean(e['Provincia']),
    dir:clean(e['Dirección']),
    horario:clean(e['Horario']),
    lat:num(e['Latitud']),
    lng:num(e['Longitud (WGS84)'] || e['Longitud_x0020__x0028_WGS84_x0029_']),
    g95:num(e['Precio Gasolina 95 E5']),
    g98:num(e['Precio Gasolina 98 E5']),
    diesel:num(e['Precio Gasoleo A']),
    dieselPlus:num(e['Precio Gasoleo Premium'])
  };
}

async function resolveSearch(q){
  const list = await municipalities();
  const needle = norm(q);
  const matches = list.filter(x => norm([x.Municipio,x.Provincia].join(' ')).includes(needle)).slice(0,12);
  const locations=[];

  for(const x of matches){
    try{
      const data = await ministry(`/EstacionesTerrestres/FiltroMunicipio/${safe(x.IDMunicipio)}`);
      const stations = (data.ListaEESSPrecio || []).map(normalizeStation).filter(s=>s.lat!==null&&s.lng!==null);
      if(!stations.length) continue;
      const lat=stations.reduce((a,s)=>a+s.lat,0)/stations.length;
      const lng=stations.reduce((a,s)=>a+s.lng,0)/stations.length;
      locations.push({nombre:clean(x.Municipio),provincia:clean(x.Provincia),lat,lng,n:stations.length});
    }catch(err){
      console.warn('Municipality lookup failed',x.IDMunicipio,err.message);
    }
  }
  return locations;
}

async function provinceStations(province){
  const data = await ministry(`/EstacionesTerrestres/FiltroProvincia/${safe(province)}`);
  return (data.ListaEESSPrecio || []).map(normalizeStation)
    .filter(s=>s.lat!==null&&s.lng!==null&&(s.g95||s.g98||s.diesel||s.dieselPlus));
}

export default async function handler(req,res){
  try{
    const q=params(req);
    const search=clean(q.q);

    if(search){
      const locations=await resolveSearch(search);
      res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({locations,total:locations.length});
    }

    const lat=Number(q.lat), lng=Number(q.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){
      return res.status(400).json({error:'Falta la ubicación (lat/lng).'});
    }

    const radius=Math.min(Math.max(Number(q.radio)||20,5),40);
    const province=clean(q.provincia);
    if(!province){
      return res.status(400).json({error:'No se ha podido identificar la provincia. Busca primero tu ciudad.'});
    }

    const all=await provinceStations(province);
    const stations=all.map(s=>({...s,dist:distanceKm(lat,lng,s.lat,s.lng)}))
      .filter(s=>s.dist<=radius)
      .sort((a,b)=>a.dist-b.dist)
      .slice(0,600);

    res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      fecha:new Date().toLocaleString('es-ES',{timeZone:'Europe/Madrid'}),
      total:stations.length,
      origen:{lat,lng},
      provincia,
      radio:radius,
      estaciones:stations
    });
  }catch(err){
    console.error('GasolinaGo API error:',err);
    return res.status(502).json({error:err?.message||'No se han podido obtener los datos oficiales.'});
  }
}
