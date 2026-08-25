(() => {
  const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let stations=[],fuel='g95';
  function openMap(){ $('home').classList.add('hidden');$('app').classList.remove('hidden');GasolinaGoMap.init();GasolinaGoMap.invalidate(); }
  async function loadArea(lat,lng,label,province,explore=false){
    $('homeError').textContent='';openMap();$('place').textContent=label||'Cerca de ti';$('stationList').innerHTML='<div class="station-meta" style="padding:10px">Buscando gasolineras…</div>';
    GasolinaGoMap.setView(lat,lng,explore?6:12);
    try{
      const qs=new URLSearchParams({lat,lng,radio:'20'});if(province)qs.set('provincia',province);if(explore)qs.set('explore','1');
      const r=await fetch('/api/precios?'+qs.toString(),{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudieron cargar los precios');
      stations=Array.isArray(data.estaciones)?data.estaciones:[];render();
      if(stations.length&&!explore){const valid=stations.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));GasolinaGoMap.fitBounds(valid.map(s=>[s.lat,s.lng]),{maxZoom:13});}
      else if(explore)GasolinaGoMap.fitBounds([[35,-10],[44.5,4.5]],{padding:[30,30]});
      if(!stations.length)$('stationList').innerHTML='<div class="station-meta" style="padding:10px">No hay gasolineras disponibles en esta zona.</div>';
    }catch(e){$('stationList').innerHTML='<div class="station-meta" style="padding:10px;color:var(--red)">'+esc(e.message)+'</div>';}
  }
  function render(){
    GasolinaGoMap.clear(); const valid=GasolinaGoStations.render(stations,fuel,s=>{GasolinaGoMap.setView(s.lat,s.lng,16);GasolinaGoStations.showDetail(s)});
    valid.forEach(s=>GasolinaGoMap.addMarker(GasolinaGoMap.markerFor(s,fuel,GasolinaGoStations.showDetail)));
  }
  function selectSuggestion(i){const x=window.GasolinaGoSearch._results?.[i];if(x){$('searchInput').value=x.nombre;GasolinaGoSearch.hide();loadArea(x.lat,x.lng,x.nombre+' · '+x.provincia,x.provincia);}}
  function useLocation(){
    if(!navigator.geolocation){$('homeError').textContent='Tu navegador no permite obtener la ubicación.';return;}
    $('homeError').textContent='Obteniendo tu ubicación…';navigator.geolocation.getCurrentPosition(p=>loadArea(p.coords.latitude,p.coords.longitude,'Cerca de ti',''),()=>{$('homeError').textContent='No hemos podido obtener tu ubicación. Puedes buscar una ciudad.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  }
  function init(){
    GasolinaGoSearch.init((i)=>{const results=GasolinaGoSearch._results||[];const x=results[i];if(!x)return;$('searchInput').value=x.nombre;GasolinaGoSearch.hide();loadArea(x.lat,x.lng,x.nombre+' · '+x.provincia,x.provincia);});
    $('useLocation').addEventListener('click',useLocation);
    $('explore').addEventListener('click',()=>loadArea(40.4168,-3.7038,'España','',true));
    $('back').addEventListener('click',()=>{ $('app').classList.add('hidden');$('home').classList.remove('hidden');GasolinaGoMap.destroy(); });
    $('closeDetail').addEventListener('click',()=>$('detail').classList.remove('open'));
    $('myLocation').addEventListener('click',useLocation);
    document.querySelectorAll('.fuel').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.fuel').forEach(x=>x.classList.remove('on'));b.classList.add('on');fuel=b.dataset.fuel;render();}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.GasolinaGoApp={loadArea};
})();