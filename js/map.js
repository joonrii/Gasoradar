(() => {
  let map=null, cluster=null;
  const SPAIN_BOUNDS=[[35.9,-9.5],[43.9,3.4]];
  function clusterIcon(c){const n=c.getChildCount();let size=42;if(n>=100)size=58;else if(n>=25)size=50;else if(n>=10)size=46;return L.divIcon({html:`<div class="cluster-icon" style="width:${size}px;height:${size}px"><span>${n}</span></div>`,className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]})}
  function init(){
    if(map)return map;
    map=L.map('map',{zoomControl:false,minZoom:5,maxZoom:18,preferCanvas:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    cluster=L.markerClusterGroup({maxClusterRadius:48,disableClusteringAtZoom:14,showCoverageOnHover:false,spiderfyOnMaxZoom:true,removeOutsideVisibleBounds:true,animate:true,chunkedLoading:true,chunkInterval:120,chunkDelay:20,iconCreateFunction:clusterIcon});
    map.addLayer(cluster); return map;
  }
  function invalidate(){if(map)setTimeout(()=>map.invalidateSize(),50);}
  function setView(lat,lng,zoom){init().setView([Number(lat),Number(lng)],zoom);}
  function fitBounds(bounds,options){if(map&&bounds.length)map.fitBounds(L.latLngBounds(bounds).pad(.08),options||{});}
  function fitSpain(){init().fitBounds(SPAIN_BOUNDS,{padding:[30,30]});}
  function clear(){if(cluster)cluster.clearLayers();}
  function addMarker(marker){if(cluster)cluster.addLayer(marker);}
  function markerFor(station,fuel,onClick){
    const raw=Number(station[fuel]);
    const value=Number.isFinite(raw)&&raw>0?raw.toFixed(3).replace('.',',')+' €':'—';
    const lat=Number(station.lat),lng=Number(station.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    const icon=L.divIcon({html:`<div class="price-marker"><span>${value}</span></div>`,className:'',iconSize:[50,50],iconAnchor:[25,25],popupAnchor:[0,-25]});
    const marker=L.marker([lat,lng],{icon,keyboard:true});
    marker.on('click',()=>onClick(station)); return marker;
  }
  function destroy(){if(map){map.remove();map=null;cluster=null;}}
  window.GasolinaGoMap={init,invalidate,setView,fitBounds,fitSpain,clear,addMarker,markerFor,destroy};
})();