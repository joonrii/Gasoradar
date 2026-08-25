(() => {
  const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=p=>p==null?'—':Number(p).toFixed(3).replace('.',',')+' €';
  function render(stations,fuel,onSelect){
    const valid=stations.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))&&Number.isFinite(Number(s[fuel]))&&Number(s[fuel])>0).sort((a,b)=>Number(a[fuel])-Number(b[fuel]));
    $('count').textContent=valid.length+' est.';
    $('stationList').innerHTML=valid.slice(0,30).map(s=>'<div class="station" data-id="'+esc(s.id)+'"><div class="station-main"><div class="station-name">'+esc(s.marca||'Gasolinera')+'</div><div class="station-meta">'+esc(s.municipio||s.dir||'')+(s.dist!=null?' · '+Number(s.dist).toFixed(1)+' km':'')+'</div></div><div class="price">'+fmt(s[fuel])+'</div></div>').join('')||'<div class="station-meta" style="padding:10px">No hay precios disponibles.</div>';
    [...$('stationList').querySelectorAll('.station')].forEach(el=>el.addEventListener('click',()=>{const s=stations.find(x=>String(x.id)===String(el.dataset.id));if(s)onSelect(s)}));
    return valid;
  }
  function showDetail(s){$('detailName').textContent=s.marca||'Gasolinera';$('detailAddress').textContent=[s.dir,s.municipio,s.provincia].filter(Boolean).join(', ');$('detailPrices').innerHTML='<div class="pricebox">95<b>'+fmt(s.g95)+'</b></div><div class="pricebox">98<b>'+fmt(s.g98)+'</b></div><div class="pricebox">Diésel<b>'+fmt(s.diesel)+'</b></div>';$('directions').href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(s.lat+','+s.lng);$('detail').classList.add('open');}
  window.GasolinaGoStations={render,showDetail,fmt};
})();