/*
 * Configuración (se abre desde ⋯ arriba a la derecha): sincronización con Google Calendar y año fiscal.
 */
/* ===== CONFIG ===== */
function renderConfig(){
  const g=Store.data.gcal||{}, anio=+Store.data.anioFiscal||0, now=new Date().getFullYear();
  const porServidor=gcalEsModoServidor();
  const txtIntro=porServidor
    ? 'La página publicada se sincroniza con Google Calendar desde un proceso del servidor (aprox. cada 1 hora). Acá guardás la <b>URL secreta en formato iCal</b> para ese proceso.'
    : 'En demostración y entorno local se usa una sincronización simulada con datos ficticios. Pegá una <b>URL iCal</b> de ejemplo para validar el flujo sin consultar calendarios reales.';
  const txtAuto=porServidor
    ? 'Habilitar sincronización automática del servidor (aprox. cada 1 hora)'
    : 'Sincronizar automáticamente cada 15 minutos (simulada en demo/local)';
  const btnSync=porServidor
    ? ''
    : '<button class="btn btn-sm" onclick="gcalSync(true)">🔄 Probar sincronización simulada</button>';
  const txtEstado=porServidor
    ? 'Última sincronización confirmada por el servidor: '
    : 'Última sincronización simulada: ';
  const txtNota=porServidor
    ? '<div class="muted-cell" style="font-size:12px;margin-top:8px">La sincronización inmediata no se hace desde el navegador: los eventos y la fecha de actualización llegan por Firestore cuando corre el proceso del servidor.</div>'
    : '<div class="muted-cell" style="font-size:12px;margin-top:8px">En demo/local no se consulta Google Calendar real: se valida el flujo con eventos ficticios.</div>';
  let yo='<option value="">Automático ('+now+')</option>';for(let y=now+2;y>=2024;y--)yo+='<option'+(y===anio?' selected':'')+'>'+y+'</option>';
  let h='<div class="view-head"><div><h2>⚙ Configuración</h2><div class="sub">Opciones generales de la página</div></div></div>';
  h+='<div class="gridw" style="grid-template-columns:repeat(auto-fit,minmax(360px,1fr))">'
    +'<div class="card"><div class="card-head"><h3>📅 Sincronización con Google Calendar</h3></div><div class="card-body">'
    +'<p class="muted-cell" style="font-size:13px;margin:6px 0 14px">'+txtIntro+'</p>'
    +'<div class="field"><label>URL iCal de Google Calendar</label><input id="gcal-url" value="'+esc(g.url||'')+'" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off"></div>'
    +'<label class="chkline" style="margin-bottom:14px"><input type="checkbox" id="gcal-auto" '+(g.auto!==false?'checked':'')+'> '+txtAuto+'</label>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" onclick="gcalGuardar()">💾 Guardar</button>'+btnSync+'<button class="btn btn-sm" onclick="gcalAyuda()">❓ Cómo obtener la URL</button></div>'
    +'<div class="muted-cell" style="font-size:12px;margin-top:12px">'+txtEstado+'<b>'+(g.last?new Date(g.last).toLocaleString('es-UY'):'nunca')+'</b></div>'
    +txtNota
    +(g.msg?'<div style="font-size:12px;margin-top:6px;color:var(--amber)">'+esc(g.msg)+'</div>':'')
    +'</div></div>'
    +'<div class="card"><div class="card-head"><h3>🗓 Año fiscal</h3></div><div class="card-body">'
    +'<p class="muted-cell" style="font-size:13px;margin:6px 0 12px">Es el año que se abre por defecto en Declaraciones, Sueldos, Honorarios, Empresas y el Panel. En "Automático" se usa el año actual.</p>'
    +'<select class="ysel" onchange="cfgSetAnio(this.value)">'+yo+'</select></div></div></div>'+vencCfgCard();
  $('#view-config').innerHTML=h;
}
function cfgSetAnio(v){ Store.data.anioFiscal=v?+v:''; Store.save(); declAnio=null; honAnio=null; sldAnio=anioActivo(); toast(v?'Año fiscal: '+v:'Año fiscal automático'); renderConfig(); }

/* ===== Google Calendar (lectura del calendario en formato iCal) ===== */
var _gcalTimer=null, _gcalOp=0;
function gcalEsModoServidor(){ return !MODO_DEMO&&!MODO_LOCAL; }
function gcalSesionGen(){ return (typeof Sesion==='object'&&Sesion&&typeof Sesion.gen==='number')?Sesion.gen:0; }
function gcalNuevaOp(){ _gcalOp++; return {id:_gcalOp,gen:gcalSesionGen()}; }
function gcalOpVigente(op){ return !!op&&op.id===_gcalOp&&op.gen===gcalSesionGen(); }
function gcalValidarUrl(raw){
  const txt=(raw||'').trim();
  if(!txt)return {ok:true,url:''};
  let u=null;
  try{ u=new URL(txt); }
  catch(e){ return {ok:false,msg:'La URL no es válida'}; }
  if(u.protocol!=='https:')return {ok:false,msg:'La URL iCal tiene que empezar con https://'};
  if(u.username||u.password)return {ok:false,msg:'La URL iCal no puede incluir usuario o contraseña incrustados'};
  if(String(u.hostname||'').toLowerCase()!=='calendar.google.com')return {ok:false,msg:'La URL iCal debe ser de calendar.google.com'};
  if(u.port&&u.port!=='443')return {ok:false,msg:'La URL iCal no puede usar puertos personalizados'};
  if(u.search||u.hash)return {ok:false,msg:'La URL iCal no puede tener parámetros ni anclas'};
  if(!/^\/calendar\/ical\/[^/]+\/[^/]+\/basic\.ics$/.test(u.pathname))return {ok:false,msg:'La ruta iCal no coincide con el formato esperado'};
  return {ok:true,url:u.toString()};
}
function gcalEventosFicticios(){
  const hoy=new Date();
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const a=new Date(hoy.getTime()); a.setDate(a.getDate()+2);
  const b=new Date(hoy.getTime()); b.setDate(b.getDate()+7);
  const c=new Date(hoy.getTime()); c.setDate(c.getDate()+14);
  return [
    {fecha:iso(a),titulo:'Revisión de agenda (simulada)'},
    {fecha:iso(b),titulo:'Vencimiento de ejemplo (simulado)'},
    {fecha:iso(c),titulo:'Recordatorio de control (simulado)'}
  ];
}
async function gcalGuardar(){
  const chk=gcalValidarUrl(($('#gcal-url').value||''));
  if(!chk.ok){ toast(chk.msg); return false; }
  if(!Store.data.gcal)Store.data.gcal={url:'',auto:true,last:0,msg:''};
  const g=Store.data.gcal;
  g.url=chk.url;
  g.auto=$('#gcal-auto').checked;
  g.msg='';

  const op=gcalNuevaOp();
  Store.save();

  let ok=false;
  try{ ok=await Store._flush(true); }
  catch(e){ ok=false; }
  if(!gcalOpVigente(op))return false;

  if(ok===true){
    gcalProgramar();
    if(CUR==='config')renderConfig();
    toast('Configuración guardada');
    return true;
  }

  g.msg='No se pudo guardar todavía. Revisá la conexión y reintentá.';
  if(CUR==='config')renderConfig();
  toast('No se pudo guardar todavía');
  return false;
}
function gcalProgramar(){
  clearInterval(_gcalTimer); _gcalTimer=null;
  if(gcalEsModoServidor())return;
  const g=Store.data.gcal;
  if(g&&g.url&&g.auto!==false)_gcalTimer=setInterval(function(){ gcalSync(false); },15*60*1000);
}
async function gcalSync(manual){
  const g=Store.data.gcal;
  if(!g||!g.url){ if(manual)toast('Primero pegá la URL y tocá Guardar'); return false; }

  if(gcalEsModoServidor()){
    if(manual)toast('La sincronización real la hace el servidor (aprox. cada 1 hora).');
    if(CUR==='config')renderConfig();
    return false;
  }

  const op=gcalNuevaOp();
  try{
    const evs=gcalEventosFicticios();
    if(!gcalOpVigente(op))return false;
    Store.data.gcalEvents=evs;
    g.last=Date.now();
    g.msg='';
    Store.save();
    if(manual)toast('✓ '+evs.length+' eventos simulados');
    if(CUR==='config')renderConfig();
    if(CUR==='cal'||CUR==='panel')calRefresh();
    return true;
  }catch(e){
    if(!gcalOpVigente(op))return false;
    g.msg='No se pudo actualizar la vista simulada de Google Calendar.';
    if(manual)toast('No se pudo sincronizar');
    if(CUR==='config')renderConfig();
    return false;
  }
}
// Lee el archivo iCal y devuelve [{fecha:'AAAA-MM-DD', titulo}] (eventos de día completo o con hora).
function parseIcs(txt){ const out=[]; txt=txt.replace(/\r?\n[ \t]/g,''); txt.split('BEGIN:VEVENT').slice(1).forEach(function(b){ const d=(b.match(/\nDTSTART[^:]*:(\d{8})/)||[])[1]; if(!d)return; const s=((b.match(/\nSUMMARY[^:]*:(.*)/)||[])[1]||'(sin título)').replace(/\\,/g,',').replace(/\\n/g,' ').trim(); out.push({fecha:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),titulo:s}); }); return out; }
function gcalAyuda(){ curForm={form:'noop'}; $('#modal-title').textContent='Cómo obtener la URL iCal'; $('#modal-del').style.display='none';
  $('#modal-body').innerHTML='<ol style="padding-left:18px;line-height:1.9;font-size:13.5px"><li>Abrí <b>Google Calendar</b> en la computadora.</li><li>A la izquierda, pasá el mouse sobre tu calendario → <b>⋮</b> → <b>Configuración y uso compartido</b>.</li><li>Bajá hasta <b>Integrar el calendario</b>.</li><li>Copiá la <b>Dirección secreta en formato iCal</b>.</li><li>Pegala acá y tocá <b>Guardar</b>.</li></ol><div class="muted-cell" style="font-size:12px;margin-top:10px">⚠ Esa dirección es secreta: quien la tenga puede ver tu calendario. No la compartas por mail ni en capturas.</div>';
  $('#modal').classList.add('open'); }

/* ===== IMPUESTOS: cuáles le corresponden y corregir las fechas ===== */
/* Antes acá había un segundo grupo, «Aportes», donde ella definía obligaciones sin calendario
   (Caja de Profesionales, Fondo de Solidaridad…). Se sacó junto con los cuadros de Impuestos que
   las mostraban; está en el historial de Git por si se retoma. */
function vencCfgGrupo(gid,on){
  var c=vencCfg(), a=c.grupos.filter(function(x){ return x!==gid; });
  if(on)a.push(gid);
  c.grupos=a; Store.save(); renderConfig();
}

function vencCfgCard(){
  var y=anioActivo(), c=vencCfg(), mios=c.grupos.length;
  var h='<div class="card"><div class="card-head"><h3>🏛 Mis impuestos</h3>'
    +'<span class="csub">'+mios+' marcado'+(mios===1?'':'s')+' · '+y+'</span></div><div class="card-body">';
  h+='<p class="muted-cell" style="font-size:13px;margin:2px 0 14px">Tocá el grupo para abrirlo y marcá '
    +'<b>los que te corresponden a vos</b>. Esos son los que aparecen en los avisos y en el Panel. '
    +'Los de DGI y BPS igual se siguen viendo en el Calendario, porque te sirven para tus clientes.</p>';

  h+=vencCfgDesplegable('impuestos','🏛','Impuestos','DGI y BPS, con el calendario del año ya cargado',
      VENC_GRUPOS.map(function(g){ return vencCfgFila(g,y); }).join(''),
      VENC_GRUPOS.filter(function(g){ return vencEsMio(g.id); }).length, VENC_GRUPOS.length,
      '<div class="venc-aviso">⚠ Estas fechas son una <b>ayuda</b>, no la fuente oficial: DGI las corrige durante '
      +'el año por resoluciones nuevas (en '+y+' ya cambió seis, marcadas con *). Revisalas y tocá «Sin revisar» '
      +'para dejarlas confirmadas. <a href="https://www.gub.uy/direccion-general-impositiva/" target="_blank" '
      +'rel="noopener">Ver el calendario en gub.uy →</a></div>'
      +(vencHayAnio(y)?'':'<div class="venc-aviso">Todavía no están las fechas de '+y+'. DGI y BPS publican el '
        +'calendario del año siguiente en diciembre; hasta entonces las podés cargar a mano.</div>'));

  h+='<hr style="border:none;border-top:1px solid var(--border-soft);margin:18px 0 12px">';
  h+='<label class="chkline"><input type="checkbox" onchange="vencToggleFeriados()" '+(c.feriados!==false?'checked':'')
    +'> Mostrar los feriados en el calendario</label>';
  h+='<div class="muted-cell" style="font-size:12px;margin-top:8px">Los feriados también salen de fuentes públicas '
    +'y algunas no coinciden en cuáles son laborables: revisalos antes de usarlos.</div>';
  return h+'</div></div>';
}

/* El grupo se abre al tocarlo. Arranca cerrado, salvo que ella lo haya dejado abierto. */
function vencCfgDesplegable(id,ico,titulo,sub,contenido,marcados,total,intro){
  var abierto=(vencCfg().abiertos||[]).indexOf(id)>=0;
  return '<details class="venc-grupo"'+(abierto?' open':'')+' ontoggle="vencCfgAbrir(\''+id+'\',this.open)">'
    +'<summary><span class="vg-ico">'+ico+'</span><span class="vg-t"><b>'+titulo+'</b><span>'+esc(sub)+'</span></span>'
    +'<span class="vg-n'+(marcados?' on':'')+'">'+marcados+' de '+total+'</span></summary>'
    +'<div class="vg-body">'+(intro||'')+contenido+'</div></details>';
}
function vencCfgAbrir(id,abierto){
  var c=vencCfg();
  if(!Array.isArray(c.abiertos))c.abiertos=[];
  var i=c.abiertos.indexOf(id);
  if(abierto&&i<0)c.abiertos.push(id);
  if(!abierto&&i>=0)c.abiertos.splice(i,1);
  Store.save();
}

/* Una fila de la lista: el casillero, el nombre, y abajo las fechas del año. */
function vencCfgFila(g,y){
  var mio=vencEsMio(g.id), ok=vencConfirmado(g.id,y);
  return '<div class="venc-g'+(mio?' mio':'')+'">'
    +'<label class="venc-g-top"><input type="checkbox" '+(mio?'checked':'')+' onchange="vencCfgGrupo(\''+g.id+'\',this.checked)">'
    +'<i style="background:'+g.color+'"></i><b>'+esc(vencNombre(g))+'</b>'
    +'<span class="venc-ok'+(ok?' on':'')+'" onclick="event.preventDefault();vencConfirmar(\''+g.id+'\','+y+','+(!ok)+')">'
    +(ok?'✓ Revisado':'Sin revisar')+'</span></label>'
    +(g.nota?'<div class="venc-nota">'+esc(g.nota)+'</div>':'')
    +'<div class="venc-meses">'+vencMesesHtml(g,y)+'</div></div>';
}

function vencMesesHtml(g,y){
  var out='';
  for(var m=0;m<12;m++){
    var iso=vencFecha(g.id,y,m);
    var cambio=VENC_CAMBIOS[vencClave(g.id,y,m)];
    var mano=vencCfg().editadas[vencClave(g.id,y,m)];
    if(!iso&&g.tipo!=='mensual'&&!mano)continue;
    out+='<label class="venc-m'+(mano?' mano':'')+(cambio?' cambio':'')+'"'
      +(cambio?' data-tip="Fecha corregida por '+esc(cambio)+'"':'')+'>'
      +'<span>'+MESES[m].toUpperCase()+'</span>'
      +'<input type="date"'+DR+' value="'+(iso||'')+'" onchange="if(dateOk(this))vencSetFecha(\''+g.id+'\','+y+','+m+',this.value)"></label>';
  }
  return out||'<div class="muted-cell" style="font-size:12px">Sin fechas para '+y+'.</div>';
}
