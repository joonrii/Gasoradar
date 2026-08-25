(() => {
  let map=null, cluster=null;
  function init(){
    if(map)return map;
    map=L.map('map',{zoomControl:false,minZoom:5,maxZoom:18});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    cluster=L.markerClusterGroup({maxClusterRadius:55,disableClusteringAtZoom:14,showCoverageOnHover:false,spiderfyOnMaxZoom:true,iconCreateFunction:c=>{const n=c.getChildCount(),size=n>500?62:n>100?54:n>20?46:40;return L.divIcon({html:'<div class="cluster-icon" style="width:'+size+'px;height:'+size+'px">'+n+'</div>',className:'',iconSize:[size,size]})}});
    map.addLayer(cluster); return map;
  }
  function invalidate(){if(map)setTimeout(()=>map.invalidateSize(),50);}
  function setView(lat,lng,zoom){init().setView([lat,lng],zoom);}
  function fitBounds(bounds,options){if(map&&bounds.length)map.fitBounds(L.latLngBounds(bounds).pad(.08),options||{});}
  function clear(){if(cluster)cluster.clearLayers();}
  function addMarker(marker){cluster.addLayer(marker);}
  function markerFor(station,fuel,onClick){const value=Number(station[fuel]).toFixed(3);const icon=L.divIcon({html:'<div class="price-marker"><span>'+value+'</span></div>',className:'',iconSize:[54,54],iconAnchor:[27,27],popupAnchor:[0,-27]});const marker=L.marker([station.lat,station.lng],{icon});marker.on('click',()=>onClick(station));return marker;}
  function destroy(){if(map){map.remove();map=null;cluster=null;}}
  window.GasolinaGoMap={init,invalidate,setView,fitBounds,clear,addMarker,markerFor,destroy};
})();