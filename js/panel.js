/*
 * Sección: Panel (inicio).
 */
/* ===== PANEL ===== */
function panelTasks(){return Store.all('tareas').filter(t=>!t.hecho&&t.estado!=='Hecha');}
var KPI_DEFS={
  tareasPend:{label:'Tareas pendientes',foot:'abiertas',cls:'k-amber',calc:function(){return panelTasks().length;}},
  tareasVenc:{label:'Tareas vencidas',foot:'pasó el plazo',cls:'k-alerta',calc:function(){return panelTasks().filter(function(t){return t.plazo&&daysTo(t.plazo)<0;}).length;}},
  sueldosPend:{label:'Sueldos del mes',foot:'sin enviar',cls:'',calc:function(){var mm=new Date().getMonth(),yy=anioActivo();return Store.all('sueldos').filter(function(r){return r.mes===mm&&r.anio===yy&&r.estado!=='Enviado';}).length;}},
  djPend:{label:'DJ del año',foot:'pendientes',cls:'',calc:function(){return Store.all('dj').filter(function(d){return d.anio===anioActivo()&&d.estado!=='Presentada';}).length;}},
  clientesAct:{label:'Clientes activos',foot:'en cartera',cls:'k-green',calc:function(){return Store.all('clientes').filter(function(c){return !c.archivado;}).length;}},
  gastosPend:{label:'Gastos sin pagar',foot:'este mes',cls:'k-amber',calc:function(){var n=new Date();return gstFilasMes(n.getFullYear(),n.getMonth()).filter(function(f){return !f.pagado;}).length;}},
  impVenc:{label:'Impuestos vencidos',foot:'sin pagar',cls:'k-alerta',calc:function(){return impVencidos().length;}}
};
var KPI_ORDER=['tareasPend','tareasVenc','sueldosPend','djPend','clientesAct','gastosPend','impVenc'];
function pkpi(k){var on=(Store.data.panel.kpis||[]).indexOf(k)>=0;return '<label><input type="checkbox" '+(on?'checked':'')+' onchange="panelKpi(\''+k+'\',this.checked)"> '+KPI_DEFS[k].label+'</label>';}
function panelKpi(k,on){var a=(Store.data.panel.kpis||[]).filter(function(x){return x!==k;});if(on)a.push(k);Store.data.panel.kpis=a;Store.save();renderPanel();}
// Nombre con el que saluda el Panel (sale de "Mi perfil").
function nombreSaludo(){ var pf=Store.data.perfil||{}; return (pf.nombre||'Laura Cabrera').trim().split(/[ ]+/).slice(0,2).join(' '); }
function greeting(){var h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';}
function panelLayout(l){Store.data.panel.layout=l;Store.save();renderPanel();}
function panelKpisHtml(P){var sel=(P.kpis||[]).filter(function(k){return KPI_DEFS[k];});if(!sel.length)return '';return '<div class="kpis" style="grid-template-columns:repeat('+Math.min(sel.length,4)+',1fr)">'+sel.map(function(k){var d=KPI_DEFS[k];return kpi(d.label,d.calc(),d.foot,d.cls);}).join('')+'</div>';}
var _pbDrag=null;
function pbDragStart(e){_pbDrag=e.currentTarget.getAttribute('data-b');e.currentTarget.classList.add('dragging');}
function pbDragEnd(e){e.currentTarget.classList.remove('dragging');document.querySelectorAll('.pblock').forEach(function(x){x.classList.remove('over');});}
function pbDragOver(e){e.preventDefault();e.currentTarget.classList.add('over');}
function pbDrop(e){e.preventDefault();var target=e.currentTarget.getAttribute('data-b');document.querySelectorAll('.pblock').forEach(function(x){x.classList.remove('over');});if(!_pbDrag||_pbDrag===target)return;var o=Store.data.panel.order.slice();var from=o.indexOf(_pbDrag),to=o.indexOf(target);if(from<0||to<0)return;o.splice(from,1);o.splice(to,0,_pbDrag);Store.data.panel.order=o;Store.save();renderPanel();}
// El alto de cada bloque se ajusta solo al contenido; el ancho se cambia arrastrando su borde derecho.
function packBlocks(){var grid=document.getElementById('pblocks');if(!grid)return;var rowH=10,gap=16;grid.querySelectorAll('.pblock').forEach(function(b){var c=b.querySelector('.pblock-c');var h=c?c.getBoundingClientRect().height:b.getBoundingClientRect().height;if(!h)return;var span=Math.max(1,Math.ceil((h+gap)/(rowH+gap)));b.style.gridRowEnd='span '+span;});}
window.addEventListener('resize',function(){if(typeof CUR!=='undefined'&&CUR==='panel')packBlocks();});
function panelResetGrid(){Store.data.panel.order=PANEL_ORDER_DEF.slice();Store.data.panel.widths=Object.assign({},PANEL_WIDTHS_DEF);Store.save();renderPanel();}
// Ancho de un bloque en columnas (de 12). Los anchos posibles "encajan" en ¼, ⅓, ½, ⅔, ¾ o completo.
var PB_SNAP=[3,4,6,8,9,12];
function pbSpan(k){var w=(Store.data.panel.widths||{})[k];if(typeof w==='string')w={'full':12,'3/4':9,'2/3':8,'1/2':6,'1/3':4,'1/4':3}[w];return PB_SNAP.indexOf(w)>=0?w:12;}
function pbResizeStart(e,k){
  e.preventDefault(); e.stopPropagation();
  var blk=e.currentTarget.parentNode, grid=document.getElementById('pblocks'), left=blk.getBoundingClientRect().left, col=(grid.getBoundingClientRect().width+16)/12, span=pbSpan(k);
  blk.setAttribute('draggable','false'); blk.classList.add('resizing');
  function mv(ev){var s=Math.round((ev.clientX-left+16)/col);s=PB_SNAP.reduce(function(a,b){return Math.abs(b-s)<Math.abs(a-s)?b:a;});if(s!==span){span=s;blk.style.gridColumn='span '+s;packBlocks();}}
  function up(){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);if(!Store.data.panel.widths)Store.data.panel.widths={};Store.data.panel.widths[k]=span;Store.save();renderPanel();}
  document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
}
function renderPanel(){
  const P=Store.data.panel; if(!P.kpis)P.kpis=['tareasPend','tareasVenc'];
  if(!Array.isArray(P.order)||!P.order.length) P.order=PANEL_ORDER_DEF.slice();
  ['kpis','tareas','estado','vistas','gastos','vencimientos','notas','calendario'].forEach(function(k){if(P.order.indexOf(k)<0)P.order.push(k);});
  const now=new Date();
  const fecha=now.toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  // Botón "Personalizar panel": fijo al costado derecho, a mitad de altura de la pantalla.
  const cfg='<button class="pxgear-fix" onclick="panelCfg(event)" title="Personalizar panel">⚙</button><div class="pxcfg side" id="pxcfg" onclick="event.stopPropagation()">'
    +'<div class="pt">Secciones</div>'+pchk('tareas','Tareas pendientes')+pchk('estado','Estado de las DJ')+pchk('vistas','Vistas operativas')+pchk('gastos','Gastos del mes')+pchk('vencimientos','Próximos vencimientos')+pchk('calendario','Calendario (mini)')+pchk('notas','Notas adhesivas')
    +'<div class="pt" style="margin-top:10px">Indicadores</div>'+KPI_ORDER.map(pkpi).join('')
    +'<div class="pxcfg-note" style="font-size:11px;color:var(--muted);margin-top:10px">Arrastrá ⠿ para cambiar un bloque de lugar, y su borde derecho para cambiar el ancho (así podés poner bloques uno al lado del otro).</div>'
    +'<button class="btn-ghost btn-sm" style="margin-top:6px" onclick="panelResetGrid()">↺ Volver al orden por defecto</button></div>';
  const blocks={kpis:panelKpisHtml(P),tareas:(P.tareas!==false)?wTareas():'',estado:(P.estado!==false)?wEstado():'',vistas:(P.vistas!==false)?wVistas():'',gastos:(P.gastos===true)?wGastos():'',vencimientos:(P.vencimientos===true)?wVencimientos():'',notas:(P.notas===true)?wNotas():'',calendario:(P.calendario===true)?wMiniCal():''};
  const top='<div class="hero"><div class="hero-in"><div><div class="hero-g">'+greeting()+', '+nombreSaludo()+'</div><div class="hero-d">'+fecha+'</div></div><img class="hero-logo" src="'+MONOGRAMA+'" alt=""></div></div>';
  let list=P.order.map(function(k){var c=blocks[k];if(!c)return '';return '<div class="pblock" draggable="true" data-b="'+k+'" style="grid-column:span '+pbSpan(k)+'" ondragstart="pbDragStart(event)" ondragover="pbDragOver(event)" ondrop="pbDrop(event)" ondragend="pbDragEnd(event)"><span class="pdrag" title="Arrastrar para mover">⠿</span><span class="presize" title="Arrastrá para cambiar el ancho" onmousedown="pbResizeStart(event,\''+k+'\')"></span><div class="pblock-c">'+c+'</div></div>';}).join('');
  $('#view-panel').innerHTML=top+cfg+'<div id="pblocks">'+list+'</div>';
  requestAnimationFrame(packBlocks); setTimeout(packBlocks,350);
}
function calRefresh(){ if(CUR==='panel')renderPanel(); else renderCal(); }

function wMiniCal(){
  var ev=calEventsMap();
  return '<div class="card"><div class="card-head"><h3>Calendario</h3><div style="display:flex;gap:8px;align-items:center">'+calViewSeg()+'<button class="btn btn-sm" onclick="switchView(\'cal\')">Abrir →</button></div></div><div class="card-body"><div class="cal-head" style="margin-bottom:10px"><button onclick="calNavG(-1)">‹</button><div class="cal-title" style="font-size:15px;min-width:130px">'+calTitleG()+'</div><button onclick="calNavG(1)">›</button><button onclick="calToday()" style="width:auto;padding:0 10px;font-size:11px;font-weight:700">Hoy</button></div>'+calBody(ev,true)+'</div></div>';
}
function pchk(k,l){const P=Store.data.panel;const on=(k==='notas'||k==='vencimientos'||k==='gastos')?P[k]===true:P[k]!==false;return '<label><input type="checkbox" '+(on?'checked':'')+' onchange="panelSet(\''+k+'\',this.checked)"> '+l+'</label>';}
function panelSet(k,v){Store.data.panel[k]=v;Store.save();renderPanel();}
function panelCfg(e){e.stopPropagation();$('#pxcfg').classList.toggle('open');}
function kpi(l,n,f,c){return '<div class="kpi '+c+'"><div class="k-label">'+l+'</div><div class="k-num">'+n+'</div><div class="k-foot">'+f+'</div></div>';}
function wVenc(){
  const items=[];
  Store.all('dj').filter(d=>d.estado!=='Presentada'&&d.venc).forEach(d=>items.push({t:cliName(d.clienteId),s:folderName(d.folder),iso:d.venc,urg:''}));
  panelTasks().filter(t=>t.plazo).forEach(t=>items.push({t:t.tarea,s:t.clienteId?cliName(t.clienteId):'Tarea',iso:t.plazo,urg:t.urgencia}));
  const near=items.filter(i=>{const dd=daysTo(i.iso);return dd!==null&&dd<=30;}).sort((a,b)=>a.iso.localeCompare(b.iso)).slice(0,8);
  let b=near.map(i=>{const dd=daysTo(i.iso),p=i.iso.split('-');return '<div class="vrow"><div class="vdate" style="'+(dd<0?'background:var(--red-l);color:var(--red)':dd<=3?'background:var(--acento-l);color:var(--acento)':'')+'"><div class="d">'+p[2]+'</div><div class="m">'+MESES[+p[1]-1]+'</div></div><div class="vmain"><div class="vt">'+esc(i.t)+'</div><div class="vs">'+esc(i.s)+'</div></div><span class="vd" style="color:'+vencColor(dd)+'">'+(dd<0?'vencido':dd===0?'hoy':dd+'d')+'</span></div>';}).join('');
  if(!near.length) b='<div class="empty"><div class="e-ico">📅</div><p>Sin vencimientos en 30 días.</p></div>';
  return '<div class="card"><div class="card-head"><h3>Próximos vencimientos</h3><span class="csub">30 días</span></div><div class="card-body">'+b+'</div></div>';
}
function wEstado(){
  const yy=anioActivo();
  const djs=Store.all('dj').filter(d=>d.anio===yy),c={'Pendiente':0,'En proceso':0,'Presentada':0};djs.forEach(d=>{if(c[d.estado]!==undefined)c[d.estado]++;});const tot=djs.length||1;
  const bar=(l,n,col)=>'<div class="bar-row"><span class="bl">'+l+'</span><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(n/tot*100)+'%;background:'+col+'"></div></div><span class="bn">'+n+'</span></div>';
  return '<div class="card"><div class="card-head"><h3>Estado de las DJ</h3><span class="csub">'+yy+'</span></div><div class="card-body">'+bar('Pendiente',c['Pendiente'],'var(--amber)')+bar('En proceso',c['En proceso'],'var(--blue)')+bar('Presentada',c['Presentada'],'var(--green)')+'<div style="margin-top:12px;font-size:12px;color:var(--muted);text-align:center">'+djs.length+' declaraciones en '+yy+'</div></div></div>';
}
function wTareas(){
  const order={Alta:3,Media:2,Baja:1};
  const tks=panelTasks().sort((a,b)=>(order[b.urgencia]||0)-(order[a.urgencia]||0)||(a.plazo||'zzz').localeCompare(b.plazo||'zzz')).slice(0,8);
  let b=tks.map(t=>{
    const uc={Alta:'var(--red)',Media:'var(--amber)',Baja:'var(--azul)'}[t.urgencia]||'var(--border)';
    const dd=t.plazo?daysTo(t.plazo):null;
    let box='<div class="vdate" style="visibility:hidden"><div class="d">–</div><div class="m">—</div></div>';
    if(t.plazo){const p=t.plazo.split('-');const st=dd<0?'background:var(--red-l);color:var(--red)':dd<=3?'background:var(--acento-l);color:var(--acento)':'';box='<div class="vdate" style="'+st+'"><div class="d">'+p[2]+'</div><div class="m">'+MESES[+p[1]-1]+'</div></div>';}
    const faltan=dd!==null?'<span class="vd" style="color:'+vencColor(dd)+'">'+(dd<0?'vencida':dd===0?'hoy':'faltan '+dd+'d')+'</span>':'';
    return '<div class="vrow">'+box+'<span class="vdot" style="background:'+uc+'"></span><div class="vmain"><div class="vt">'+esc(t.tarea)+'</div><div class="vs">'+esc(t.clienteId?cliName(t.clienteId):'Sin cliente')+(t.etiqueta?' · '+esc(t.etiqueta):'')+'</div></div>'+faltan+'</div>';
  }).join('');
  if(!tks.length) b='<div class="empty"><div class="e-ico">✅</div><p>No hay tareas pendientes.</p></div>';
  return '<div class="card" style="margin-bottom:18px"><div class="card-head"><h3>Tareas pendientes</h3><button class="btn btn-sm" onclick="switchView(\'tareas\')">Ver todas →</button></div><div class="card-body">'+b+'</div></div>';
}
var vistaMonth=new Date().getMonth();
function setVistaMode(m){Store.data.panel.vistaMode=m;Store.save();renderPanel();}
function setVistaMonth(m){vistaMonth=+m;renderPanel();}
function vistaSimpleCards(){
  const mm=vistaMonth;
  const card=(gid,label)=>{const rows=Store.data.grids[gid].rows;let done=0,pend=0;rows.forEach(r=>{const st=gcell(r,mm).estado;if(st==='done')done++;else if(st==='na'){}else pend++;});const tot=rows.length||1;return '<div class="card" onclick="switchView(\''+gid+'\')" style="cursor:pointer"><div class="card-head"><h3>'+label+'</h3><span class="csub">'+MESES_L[mm]+' →</span></div><div class="card-body"><div style="display:flex;gap:20px"><div><div class="k-num" style="font-size:26px;color:var(--green)">'+done+'</div><div class="k-foot">realizados</div></div><div><div class="k-num" style="font-size:26px;color:var(--amber)">'+pend+'</div><div class="k-foot">pendientes</div></div><div><div class="k-num" style="font-size:26px">'+Math.round(done/tot*100)+'%</div><div class="k-foot">completado</div></div></div></div></div>';};
  return card('empresas','Empresas')+card('sprof','Serv. Profesionales')+sldCard();
}
// Tarjeta de Sueldos: usa los mismos datos que la pestaña Sueldos (mes elegido, año de trabajo).
function sldCard(){
  var mm=vistaMonth,yy=anioActivo();
  var rows=Store.all('sueldos').filter(function(r){return r.mes===mm&&r.anio===yy;});
  var done=rows.filter(function(r){return r.estado==='Enviado';}).length,pend=rows.length-done,tot=rows.length||1;
  return '<div class="card" onclick="sldMes='+mm+';sldAnio='+yy+';switchView(\'sueldos\')" style="cursor:pointer"><div class="card-head"><h3>Sueldos</h3><span class="csub">'+MESES_L[mm]+' →</span></div><div class="card-body"><div style="display:flex;gap:20px"><div><div class="k-num" style="font-size:26px;color:var(--green)">'+done+'</div><div class="k-foot">enviados</div></div><div><div class="k-num" style="font-size:26px;color:var(--amber)">'+pend+'</div><div class="k-foot">pendientes</div></div><div><div class="k-num" style="font-size:26px">'+Math.round(done/tot*100)+'%</div><div class="k-foot">completado</div></div></div></div></div>';
}
function vistaDetallada(){
  const mm=vistaMonth;
  function block(gid,label){
    const rows=Store.data.grids[gid].rows,done=[],pend=[],na=[];
    rows.forEach(r=>{const st=gcell(r,mm).estado;if(st==='done')done.push(r);else if(st==='na')na.push(r);else pend.push(r);});
    const tot=(rows.length-na.length)||1;
    const k='<div class="kpis" style="grid-template-columns:repeat(3,1fr)">'+kpi('Realizados',done.length,MESES_L[mm],'k-green')+kpi('Pendientes',pend.length,'sin registrar','k-amber')+kpi('Completado',Math.round(done.length/tot*100)+'%','del mes','k-alerta')+'</div>';
    const li=(arr,d)=>arr.length?arr.map(r=>'<div class="vrow"><div class="vmain"><div class="vt">'+esc(r.nombre)+'</div>'+(r.tipo?'<div class="vs">'+esc(r.tipo)+'</div>':'')+'</div>'+(d?'<span class="pill st-done">'+(gcell(r,mm).fecha?fDate(gcell(r,mm).fecha).slice(0,5):'✓')+'</span>':'<span class="pill st-pend">sin registrar</span>')+'</div>').join(''):'<div class="empty" style="padding:18px"><p>—</p></div>';
    return '<div class="vd-title">'+label+' <span style="color:var(--muted);font-weight:400;font-size:14px">— '+MESES_L[mm]+'</span></div>'+k+'<div class="grid2"><div class="card"><div class="card-head"><h3>⏳ Pendientes / Sin registrar</h3><span class="csub">'+pend.length+'</span></div><div class="card-body">'+li(pend,false)+'</div></div><div class="card"><div class="card-head"><h3>✅ Realizados</h3><span class="csub">'+done.length+'</span></div><div class="card-body">'+li(done,true)+'</div></div></div>';
  }
  const yy=anioActivo();
  const sr=Store.all('sueldos').filter(r=>r.mes===mm&&r.anio===yy);
  const cnt={};SLD_EST.forEach(e=>cnt[e]=0);sr.forEach(r=>{if(cnt[r.estado]!==undefined)cnt[r.estado]++;});
  const ks='<div class="kpis" style="grid-template-columns:repeat(4,1fr)">'+SLD_EST.map(e=>'<div class="kpi"><div class="k-num" style="font-size:24px;color:'+SLD_COL[e]+'">'+cnt[e]+'</div><div class="k-label" style="margin-top:2px">'+e+'</div></div>').join('')+'</div>';
  const pron=sr.filter(r=>r.estado==='Pronto'),pend2=sr.filter(r=>r.estado==='Pendiente'||r.estado==='En proceso'),env=sr.filter(r=>r.estado==='Enviado');
  const lis=arr=>arr.length?arr.map(r=>'<div class="vrow"><div class="vmain"><div class="vt">'+esc(r.empresa)+'</div><div class="vs">'+esc(r.grupo||'')+(r.cat?' · '+esc(r.cat):'')+'</div></div></div>').join(''):'<div class="empty" style="padding:16px"><p>—</p></div>';
  const chips=env.length?env.map(r=>'<span class="tag" style="margin:3px 4px">✈ '+esc(r.empresa)+(r.avisadoFecha?' '+fDate(r.avisadoFecha).slice(0,5):'')+'</span>').join(''):'<div class="empty" style="padding:12px"><p>—</p></div>';
  const sb='<div class="vd-title">Sueldos <span style="color:var(--muted);font-weight:400;font-size:14px">— '+MESES_L[mm]+'</span></div>'+ks+'<div class="grid2"><div class="card"><div class="card-head"><h3>✅ Prontos para enviar</h3><span class="csub">'+pron.length+'</span></div><div class="card-body">'+lis(pron)+'</div></div><div class="card"><div class="card-head"><h3>⏳ Pendientes / en proceso</h3><span class="csub">'+pend2.length+'</span></div><div class="card-body">'+lis(pend2)+'</div></div></div><div class="card" style="margin-top:14px"><div class="card-head"><h3>✈ Enviados / finalizados</h3><span class="csub">'+env.length+'</span></div><div class="card-body">'+chips+'</div></div>';
  return block('empresas','Empresas')+block('sprof','Serv. Profesionales')+sb;
}
function wVistas(){
  const mode=(Store.data.panel.vistaMode)||'simple';
  let h='<div class="vistas-head"><span style="font-family:var(--f-display);font-size:17px;color:var(--azul-osc)">Vistas operativas</span><span style="display:flex;gap:10px;align-items:center"><select class="filt" onchange="setVistaMonth(this.value)">'+MESES_L.map(function(m,i){return '<option value="'+i+'"'+(i===vistaMonth?' selected':'')+'>'+m+'</option>';}).join('')+'</select><span class="gseg"><button class="gv'+(mode==='simple'?' active':'')+'" onclick="setVistaMode(\'simple\')">Simple</button><button class="gv'+(mode==='detallada'?' active':'')+'" onclick="setVistaMode(\'detallada\')">Detallada</button></span></span></div>';
  h+= mode==='detallada'? vistaDetallada() : ('<div class="gridw">'+vistaSimpleCards()+'</div>');
  return h;
}
// Bloque "Gastos del mes" (⚙ Personalizar panel). Viene apagado: lo prende quien lo quiera.
function wGastos(){
  var n=new Date(), y=n.getFullYear(), m=n.getMonth();
  var filas=gstFilasMes(y,m), t=gstTotales(filas);
  var pend=filas.filter(function(f){return !f.pagado;}).slice(0,3);
  var lista=pend.length
    ? pend.map(function(f){
        return '<div class="pgst-row"><span class="gst-ico">'+gstIco(f.g.cat)+'</span>'
          +'<div class="pgst-t"><b>'+esc(f.g.concepto)+'</b>'+(f.det?'<span class="gst-cuota">'+f.det+'</span>':'')
          +'<span class="pgst-d">vence el '+fDate(f.fecha)+'</span></div>'
          +'<b class="pgst-n">'+money(f.importe)+'</b></div>';
      }).join('')
    : '<div class="pgst-ok">✓ No queda nada por pagar este mes</div>';
  return '<div class="card"><div class="card-head"><h3>Gastos del mes</h3>'
    +'<button class="btn btn-sm btn-primary" onclick="gastoForm()">+ Gasto</button></div>'
    +'<div class="card-body"><div class="kpis kpis-2" style="margin-bottom:14px">'
    +kpiM('Total de '+MESES_L[m],money(t.total),'','')
    +kpiM('Falta pagar',money(t.pen),t.nPen?(t.nPen+' sin pagar'):'todo al día',t.pen?'k-amber':'k-green')
    +'</div>'+lista
    +(filas.length>pend.length&&pend.length?'<button class="btn btn-sm" style="margin-top:12px" onclick="switchView(&quot;gastos&quot;)">Ver todos los gastos →</button>':'')
    +'</div></div>';
}
var NOTE_COLORS=['#fff3bf','#ffd8e4','#d3f0dd','#d6e6fb','#eadcf7','#d3ecec'];
var _noteColor;
function wNotas(){
  var ns=Store.all('notes');
  var body= ns.length? '<div class="notes-grid">'+ns.map(function(n){return '<div class="note2" style="--nc:'+(n.color||'#fff3bf')+'" onclick="noteEdit(\''+n.id+'\')"><button class="note2-x" onclick="event.stopPropagation();delNote(\''+n.id+'\')" title="Eliminar">×</button><div class="note2-t">'+esc(n.text||'').replace(/\n/g,'<br>')+'</div>'+(n.date?'<div class="note2-d">'+fDate(n.date)+'</div>':'')+'</div>';}).join('')+'</div>' : '<div class="notes-empty"><div class="ne-ico">🗒️</div><p>Sin notas todavía.</p><button class="btn btn-primary btn-sm" onclick="noteEdit()">✎ Escribir una nota</button></div>';
  return '<div class="card"><div class="card-head"><h3>Notas adhesivas</h3>'+(ns.length?'<button class="btn btn-sm btn-primary" onclick="noteEdit()">+ Nota</button>':'')+'</div><div class="card-body">'+body+'</div></div>';
}
function noteEdit(id){
  var n=id?Store.get('notes',id):{text:'',color:NOTE_COLORS[0]};
  curForm={form:'note',id:id||null}; _noteColor=n.color||NOTE_COLORS[0];
  $('#modal-title').textContent=id?'Editar nota':'Nueva nota'; $('#modal-del').style.display=id?'inline-flex':'none';
  $('#modal-body').innerHTML='<div class="note-compose" id="note-compose" style="background:'+_noteColor+'"><textarea id="note-ta" placeholder="Escribí acá… ideas, recordatorios, pendientes.">'+esc(n.text||'')+'</textarea></div><div class="note-colors">'+NOTE_COLORS.map(function(c){return '<button class="ncol'+(c===_noteColor?' active':'')+'" data-c="'+c+'" style="background:'+c+'" onclick="noteSetColor(\''+c+'\')"></button>';}).join('')+'</div>';
  $('#modal').classList.add('open');
  setTimeout(function(){var ta=document.getElementById('note-ta');if(ta)ta.focus();},60);
}
function noteSetColor(c){_noteColor=c;var box=document.getElementById('note-compose');if(box)box.style.background=c;document.querySelectorAll('.ncol').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-c')===c);});}
function delNote(id){Store.remove('notes',id);renderPanel();}

/* Bloque «Próximos vencimientos»: los de DGI y BPS que le corresponden, más los feriados cercanos.
   Viene apagado: se prende desde ⚙ Personalizar panel. */
function wVencimientos(){
  var lista=vencProximos(5,true), hoy=today();
  var fer=[];
  [+hoy.slice(0,4),+hoy.slice(0,4)+1].forEach(function(y){
    feriadosDelAnio(y).forEach(function(f){ if(f.iso>=hoy)fer.push(f); });
  });
  fer=fer.sort(function(a,b){return a.iso.localeCompare(b.iso);}).slice(0,2);

  var cuerpo=lista.length
    ? lista.map(function(v){
        var dd=daysTo(v.iso), p=v.iso.split('-');
        var reg=Store.all('impuestos').find(function(x){return x.gid===v.gid&&x.anio===v.anio&&x.mes===v.mes;});
        var pago=reg&&reg.pagado;
        return '<div class="pvenc-row'+(pago?' pagado':'')+'" style="--vc:'+v.grupo.color+'">'
          +'<div class="pvenc-d"><div class="d">'+p[2]+'</div><div class="m">'+MESES[+p[1]-1]+'</div></div>'
          +'<div class="pvenc-t"><b>'+esc(vencTexto(v))+'</b><span>'+esc(v.periodo)+'</span></div>'
          +(pago?'<span class="pvenc-ok">✓ pago</span>'
                :'<span class="pvenc-n" style="color:'+vencColor(dd)+'">'+(dd===0?'hoy':dd===1?'mañana':'en '+dd+' días')+'</span>')
          +'</div>';
      }).join('')
    : '<div class="pgst-ok">Elegí tus vencimientos en ⋯ → Configuración</div>';

  var feriadosHtml=fer.length&&vencCfg().feriados!==false
    ? '<div class="pvenc-fer">'+fer.map(function(f){
        return '<span data-tip="'+(f.laboral?'Feriado laborable':'Feriado no laborable')+'">'+fDate(f.iso).slice(0,5)+' · '+esc(f.nombre)+'</span>';
      }).join('')+'</div>' : '';

  return '<div class="card"><div class="card-head"><h3>Próximos vencimientos</h3>'
    +'<button class="btn btn-sm" onclick="switchView(&quot;imp&quot;)">Impuestos →</button></div>'
    +'<div class="card-body">'+cuerpo+feriadosHtml+'</div></div>';
}
