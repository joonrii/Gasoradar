(() => {
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&#38;','<':'&#60;','>':'&#62;','"':'&#34;',"'":'&#39;'}[m]));
  let stations=[],fuel='g95',radius=10,current=null,loadToken=0;
  const SPAIN_CENTER=[40.2,-3.7];
  function openMap(){ $('home').classList.add('hidden');$('app').classList.remove('hidden');GasolinaGoMap.init();GasolinaGoMap.invalidate(); }
  function setStatus(html){$('stationList').innerHTML=html;}
  async function loadArea(lat,lng,label,province,explore=false){
    const token=++loadToken;$('homeError').textContent='';openMap();$('place').textContent=label||'Cerca de ti';setStatus('<div class="station-meta" style="padding:10px">Buscando gasolineras…</div>');$('detail').classList.remove('open');
    current={lat,lng,label,province,explore};
    if(explore)GasolinaGoMap.fitSpain();else GasolinaGoMap.setView(lat,lng,12);
    try{
      const qs=new URLSearchParams({lat:String(lat),lng:String(lng),radio:String(radius)});if(province&&!explore)qs.set('provincia',province);if(explore)qs.set('explore','1');
      const r=await fetch('/api/precios?'+qs.toString(),{cache:'no-store'});const data=await r.json();if(token!==loadToken)return;if(!r.ok)throw new Error(data.error||'No se pudieron cargar los precios');
      stations=Array.isArray(data.estaciones)?data.estaciones:[];render();
      const valid=stations.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));
      if(valid.length&&!explore)GasolinaGoMap.fitBounds(valid.map(s=>[s.lat,s.lng]),{maxZoom:13});
      if(!stations.length)setStatus('<div class="station-meta" style="padding:10px">No hay gasolineras disponibles en esta zona.</div>');
    }catch(e){if(token!==loadToken)return;setStatus('<div class="station-meta" style="padding:10px;color:var(--red)">'+esc(e.message||'No se pudieron cargar las gasolineras.')+'</div>');}
  }
  function render(){
    GasolinaGoMap.clear();
    const valid=GasolinaGoStations.render(stations,fuel,s=>selectStation(s));
    valid.forEach(s=>{const marker=GasolinaGoMap.markerFor(s,fuel,selectStation);if(marker)GasolinaGoMap.addMarker(marker);});
  }
  function selectStation(s){GasolinaGoMap.setView(Number(s.lat),Number(s.lng),16);GasolinaGoStations.showDetail(s);}
  function selectSuggestion(i){const x=GasolinaGoSearch.getResults()[i];if(!x)return;$('searchInput').value=x.nombre;GasolinaGoSearch.hide();loadArea(Number(x.lat),Number(x.lng),x.nombre+' · '+x.provincia,x.provincia,false);}
  function useLocation(){if(!navigator.geolocation){$('homeError').textContent='Tu navegador no permite obtener la ubicación.';return;}$('homeError').textContent='Obteniendo tu ubicación…';navigator.geolocation.getCurrentPosition(p=>loadArea(p.coords.latitude,p.coords.longitude,'Cerca de ti','',false),()=>{$('homeError').textContent='No hemos podido obtener tu ubicación. Puedes buscar una ciudad.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});}
  function changeRadius(value){radius=Number(value);document.querySelectorAll('.radius').forEach(b=>b.classList.toggle('on',Number(b.dataset.radius)===radius));if(current&&!current.explore)loadArea(current.lat,current.lng,current.label,current.province,false);}
  function init(){
    GasolinaGoSearch.init(selectSuggestion);$('useLocation').addEventListener('click',useLocation);$('explore').addEventListener('click',()=>loadArea(SPAIN_CENTER[0],SPAIN_CENTER[1],'España','',true));
    $('back').addEventListener('click',()=>{$('app').classList.add('hidden');$('home').classList.remove('hidden');GasolinaGoMap.destroy();current=null;stations=[];loadToken++;});$('closeDetail').addEventListener('click',()=>$('detail').classList.remove('open'));$('myLocation').addEventListener('click',useLocation);
    document.querySelectorAll('.fuel').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.fuel').forEach(x=>x.classList.remove('on'));b.classList.add('on');fuel=b.dataset.fuel;render();}));
    document.querySelectorAll('.radius').forEach(b=>b.addEventListener('click',()=>changeRadius(b.dataset.radius)));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.GasolinaGoApp={loadArea};
})();