/*
 * Apariencia (se abre desde ⋯ arriba a la derecha): color de acento de la página.
 * Los colores están definidos en :root (css/estilos.css); acá solo se elige cuál se usa.
 */
const ACENTOS=[
  {id:'verde',nombre:'Verde bruy',desc:'El verde del logo, un poco más oscuro para que se lea'},
  {id:'celeste',nombre:'Celeste bruy',desc:'El celeste del logo, más fresco'},
];
function acentoActual(){ return (Store.data&&Store.data.acento==='celeste')?'celeste':'verde'; }
// Se aplica al arrancar y cada vez que se cambia.
function aplicarAcento(){ document.documentElement.setAttribute('data-acento',acentoActual()); }
function setAcento(id){ Store.data.acento=id; Store.save(); aplicarAcento(); apariencia(); renderView(CUR); }

function apOpcion(o,activo,fn,muestra){
  return '<button class="ac-opt'+(activo?' active':'')+'" onclick="'+fn+'(\''+o.id+'\')">'+muestra
    +'<span><span class="ac-n">'+o.nombre+'</span><span class="ac-d">'+o.desc+'</span></span>'
    +(activo?'<span class="ac-ok">✓</span>':'')+'</button>';
}
function apariencia(){
  curForm={form:'noop'};
  $('#modal-title').textContent='Apariencia'; $('#modal-del').style.display='none';
  const aAct=acentoActual();
  const acentos=ACENTOS.map(function(a){ return apOpcion(a,a.id===aAct,'setAcento','<span class="ac-sw" style="background:var(--ac-'+a.id+')"></span>'); }).join('');
  $('#modal-body').innerHTML='<div class="ac-t">Color de acento</div>'
    +'<p class="muted-cell" style="font-size:12.5px;margin-bottom:12px">El azul marino del logo es el color principal. Esto cambia los detalles: la pestaña abierta, los contadores y los avisos.</p>'
    +'<div class="ac-list">'+acentos+'</div>';
  // Los cambios se aplican al tocarlos, así que alcanza con un botón para cerrar.
  $('#modal-cancel').style.display='none';
  $('#modal .modal-foot .btn-primary').textContent='Listo';
  $('#modal').classList.add('open');
}
