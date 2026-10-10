/*
 * Menú de navegación entre secciones.
 * "Configuración" no está en el menú de pestañas: se abre desde ⋯ (arriba a la derecha).
 */
/* ===== NAV ===== */
const NAV=[
  {id:'panel',ico:'▦',label:'Panel'},
  {id:'decl',ico:'📄',label:'Declaraciones'},
  {id:'tareas',ico:'🗂',label:'Tareas Extras',badge:'tareas'},
  {id:'empresas',ico:'🏢',label:'Empresas'},
  {id:'sprof',ico:'📋',label:'Serv. Profesionales'},
  {id:'sueldos',ico:'💼',label:'Sueldos'},
  {id:'clientes',ico:'👥',label:'Info. Clientes'},
  {id:'finanzas',ico:'💲',label:'Finanzas'},
  {id:'cal',ico:'📅',label:'Calendario'},
];
function buildNav(){ $('#nav').innerHTML=NAV.map(n=>'<button class="nav-btn'+(n.id==='panel'?' active':'')+'" data-v="'+n.id+'" onclick="switchView(\''+n.id+'\')"><span>'+n.ico+'</span>'+n.label+'<span class="badge" id="badge-'+n.id+'" style="display:none"></span></button>').join(''); }
let CUR='panel';
function switchView(id){
  // Honorarios, Gastos e Impuestos viven adentro de la pestaña Finanzas.
  if(typeof finEsSub==='function'&&finEsSub(id)){ finTab=id; id='finanzas'; }
  CUR=id; document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); $('#view-'+id).classList.add('active'); document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===id)); window.scrollTo({top:0,behavior:'smooth'}); renderView(id); }
function updateBadges(){ const t=Store.all('tareas').filter(x=>!x.hecho&&x.estado!=='Hecha').length; const b=$('#badge-tareas'); if(b){if(t>0){b.textContent=t;b.style.display='';}else b.style.display='none';} }
function renderView(id){ syncCliList(); ({panel:renderPanel,decl:renderDecl,tareas:renderTareas,empresas:()=>renderGrid('empresas'),sprof:()=>renderGrid('sprof'),sueldos:renderSueldos,clientes:renderClientes,finanzas:renderFinanzas,cal:renderCal,config:renderConfig}[id]||(()=>{}))(); }
