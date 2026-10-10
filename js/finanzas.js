/*
 * Sección: Finanzas. Es una pestaña que adentro tiene tres: Honorarios, Gastos e Impuestos.
 * Cada una sigue viviendo en su propio archivo (honorarios.js, gastos.js, impuestos.js): acá solo
 * está la barra de arriba que cambia de una a otra.
 */
/* ===== FINANZAS ===== */
const FIN_TABS=[
  {id:'hon',    ico:'💲', label:'Honorarios', render:function(){ renderHon(); }},
  {id:'gastos', ico:'🧾', label:'Gastos',     render:function(){ renderGastos(); }},
  {id:'imp',    ico:'🏛', label:'Impuestos',  render:function(){ renderImpuestos(); }},
];
var finTab='hon';

function setFinTab(id){ finTab=id; renderFinanzas(); }

/* Permite que desde cualquier lado se llame a la subpestaña por su nombre: switchView('gastos'). */
function finEsSub(id){ return FIN_TABS.some(function(t){ return t.id===id; }); }

function renderFinanzas(){
  if(!finEsSub(finTab))finTab='hon';
  $('#fin-tabs').innerHTML=FIN_TABS.map(function(t){
    return '<button class="sld-tab'+(t.id===finTab?' active':'')+'" onclick="setFinTab(\''+t.id+'\')">'
      +'<span style="margin-right:6px">'+t.ico+'</span>'+t.label+finBadge(t.id)+'</button>';
  }).join('');
  FIN_TABS.forEach(function(t){
    var el=document.getElementById('view-'+t.id);
    if(el)el.classList.toggle('fin-on',t.id===finTab);
  });
  var activa=FIN_TABS.find(function(t){ return t.id===finTab; });
  if(activa)activa.render();
}

/* Un contador rojo en «Impuestos» cuando hay algo vencido sin pagar. */
function finBadge(id){
  if(id!=='imp')return '';
  var n=impVencidos().length;
  return n?'<span class="sld-badge fin-alerta">'+n+'</span>':'';
}
