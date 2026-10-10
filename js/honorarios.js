/*
 * Sección: Honorarios. Vista mensual (detalle de cobro de cada cliente) y anual (grilla por mes).
 * - IVA 22%: solo cuando la fila tiene N° de factura.
 * - Estado: Pagado (tiene fecha de pago) · Atrasado (venció el plazo sin pago) · Pendiente.
 * - Fecha de factura y mes corriente / mes vencido: ver honorarios-factura.js (oct. 2026).
 * Datos: honCli = clientes con su honorario mensual (y si facturan a mes vencido) · honMov = lo registrado
 * cada mes de trabajo (factura, fecha de factura, recibo, pago…).
 */
/* ===== HONORARIOS ===== */
var honAnio=null, honMes=new Date().getMonth(), honVista='mensual', honQ='', honArch=false;
const IVA=0.22, HON_EST={pag:'Pagado',pen:'Pendiente',atr:'Atrasado'};
function honYear(){return honAnio||anioActivo();}
function setHonAnio(y){honAnio=y;renderHon();}
function setHonVista(v){honVista=v;renderHon();}
function setHonMes(m){honMes=m;renderHon();}
/* Datos de ejemplo (inventados): la cartera de honorarios del año, facturada y cobrada mes a mes.
   A propósito quedan casos distintos, que son los que se ven en la vida real:
   un cliente que factura a mes vencido, uno que entró en marzo, uno que debe y uno archivado. */
function seedHon(){
  var yy=new Date().getFullYear(), mm=new Date().getMonth();
  var f=function(m,d){ var t=new Date(yy,m,d); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
  // cliente · importe mensual · medio · desde qué mes · particularidades
  var cli=[
    {id:'h1',clienteId:'c1',importe:3200,medio:'BROU'},
    {id:'h2',clienteId:'c2',importe:8900,medio:'Itaú'},
    {id:'h3',clienteId:'c3',importe:12400,medio:'Transferencia',facturacion:'vencido'},
    {id:'h4',clienteId:'c5',importe:2800,medio:'Efectivo'},
    {id:'h5',clienteId:'c6',importe:4500,medio:'BROU'},
    {id:'h6',clienteId:'c7',importe:7600,medio:'Transferencia'},
    {id:'h7',clienteId:'c8',importe:5400,medio:'Santander'},
    {id:'h8',clienteId:'c9',importe:6200,medio:'Transferencia'},
    {id:'h9',clienteId:'c10',importe:4100,medio:'Efectivo'},
    {id:'h10',clienteId:'c11',importe:9800,medio:'Itaú'},
    {id:'h11',clienteId:'c13',importe:11200,medio:'BROU'},
    {id:'h12',clienteId:'c15',importe:7900,medio:'Transferencia'},
    {id:'h13',clienteId:'c17',importe:14500,medio:'Itaú'},
    {id:'h14',clienteId:'c18',importe:5600,medio:'Efectivo'},
    {id:'h15',clienteId:'c14',importe:2600,medio:'Efectivo',archivado:true},
  ];
  // Ojo: la página cobra el honorario mensual TODO el año. Si a un cliente se le saltean meses,
  // esos meses le aparecen como deuda. Por eso todos facturan desde enero.
  var debe=['h9'];                // Gomería Ruta 5: hace tres meses que no paga
  // La mitad paga antes de fin de mes y la otra mitad a principio del mes siguiente, como pasa
  // de verdad: así «Cobrado en el mes» tiene algo apenas empieza el mes.
  var cobraSig=['h1','h5','h7','h9','h11','h13'];
  var mov=[], nf=1000;
  cli.forEach(function(r){
    if(r.archivado)return;
    var vencido=(r.facturacion==='vencido'), sig=cobraSig.indexOf(r.id)>=0;
    for(var m=0;m<=mm;m++){
      // El mes en curso todavía no se facturó, salvo tres clientes que pagan por adelantado.
      if(m===mm&&['h2','h10','h13'].indexOf(r.id)<0)continue;
      var mFac=vencido?m+1:m, dFac=vencido?3:26;
      var mCob=(vencido||sig)?m+1:m, dCob=vencido?12:(sig?5:28);
      var mv={id:'hm'+r.id+'-'+m,rowId:r.id,anio:yy,mes:m,
        factura:'A-'+(++nf),fFac:f(mFac,dFac),recibo:'','fecha':f(mCob,dCob),medio:r.medio};
      // Los que deben: las últimas facturas quedan sin cobrar.
      if(debe.indexOf(r.id)>=0&&m>=mm-3)mv.fecha='';
      // Lo del mes en curso está facturado pero todavía no cobrado.
      if(m===mm)mv.fecha='';
      mov.push(mv);
    }
  });
  // Nada de cobros ni facturas con fecha posterior a hoy: quedan pendientes.
  var hoyIso=today();
  mov.forEach(function(mv){ if(mv.fecha>hoyIso)mv.fecha=''; if(mv.fFac>hoyIso){ mv.fFac=''; mv.factura=''; } });
  return {cli:cli,mov:mov};
}
function honRows(){var q=honQ.toLowerCase();return Store.all('honCli').filter(function(r){return !!r.archivado===honArch&&(!q||cliNameOr(r.clienteId).toLowerCase().includes(q));}).sort(function(a,b){return cliNameOr(a.clienteId).localeCompare(cliNameOr(b.clienteId));});}
function honMovOf(rowId,y,m){return Store.all('honMov').find(function(x){return x.rowId===rowId&&x.anio===y&&x.mes===m;});}
// Cálculo de un mes para una fila: importe, IVA, total y estado.
function honCalc(r,y,m){
  var mv=honMovOf(r.id,y,m)||{};
  var imp=honNum(mv.importe!=null&&mv.importe!==''?mv.importe:r.importe);
  if(imp===null)return {mv:mv,imp:null};
  var iva=mv.factura?Math.round(imp*IVA*100)/100:0;
  // Atrasado: pasó el plazo (fin del mes del trabajo, o del siguiente si factura a mes vencido) sin cobrar.
  var vencio=new Date()>honPlazoCobro(r,y,m);
  return {mv:mv,imp:imp,iva:iva,tot:imp+iva,est:mv.fecha?'pag':vencio?'atr':'pen'};
}
// Guarda un dato del mes y actualiza solo los números (sin redibujar la tabla, para no cortar lo que se está escribiendo).
function honSet(rowId,f,v){var y=honYear(),m=honMes,mv=honMovOf(rowId,y,m);if(!mv){mv={id:'hm'+Date.now()+Math.floor(Math.random()*999),rowId:rowId,anio:y,mes:m};Store.data.honMov.push(mv);}mv[f]=v;
  // Al escribir el N° de factura, la fecha de factura se completa sola (en el mes siguiente si es a mes vencido).
  if(f==='factura'&&v&&!mv.fFac)mv.fFac=honFFacSugerida(Store.get('honCli',rowId),y,m);
  Store.save();honRefresh();}
function honRefresh(){
  var y=honYear(), m=honMes, list=[];
  honRows().forEach(function(r){
    var c=honCalc(r,y,m); list.push(c);
    var tr=document.querySelector('#hon-body tr[data-row="'+r.id+'"]'); if(!tr)return;
    tr.querySelector('.h-iva').textContent=c.iva?money(c.iva):'—';
    tr.querySelector('.h-tot').innerHTML='<b>'+(c.imp===null?'—':money(c.tot))+'</b>';
    tr.querySelector('.h-est').innerHTML=honEstHtml(c);
    var ff=tr.querySelector('.h-ffac'); if(ff&&document.activeElement&&!ff.contains(document.activeElement))ff.innerHTML=honFFacCelda(r,c.mv,y,m);
  });
  var k=document.getElementById('hon-kpis'); if(k)k.innerHTML=honKpisMes(list,y,m);
  var t=document.getElementById('hon-totrow'); if(t)t.outerHTML=honTotRow(list,m);
}
function renderHon(){
  var y=honYear();
  var h='<div class="view-head"><div><h2>Honorarios <span style="color:var(--muted);font-weight:400">'+y+'</span></h2></div><span class="sld-top">'+yearSelect(y,'setHonAnio')
    +'<span class="gseg"><button class="gv'+(honVista==='mensual'?' active':'')+'" onclick="setHonVista(\'mensual\')">▦ Mensual</button><button class="gv'+(honVista==='anual'?' active':'')+'" onclick="setHonVista(\'anual\')">▤ Anual</button></span>'
    +'<span class="glegend"><span class="lg"><i style="background:var(--green)"></i>Pagado</span><span class="lg"><i style="background:var(--amber)"></i>Pendiente</span><span class="lg"><i style="background:var(--red)"></i>Atrasado</span></span>'
    +expBtns('hon')+'<button class="btn btn-sm btn-primary" onclick="honCliForm()">+ Cliente</button></span></div>';
  h+='<div class="toolbar"><div class="search"><input placeholder="Buscar cliente…" value="'+esc(honQ)+'" oninput="honQ=this.value;renderHonBody()"></div><label class="chkline"><input type="checkbox" '+(honArch?'checked':'')+' onchange="honArch=this.checked;renderHonBody()"> Ver archivados</label></div>';
  if(honVista==='mensual') h+='<div class="months">'+MESES.map(function(m,i){return '<button class="mbtn'+(i===honMes?' active':'')+'" onclick="setHonMes('+i+')">'+m.toUpperCase()+'</button>';}).join('')+'</div>';
  h+='<div id="hon-body"></div><div class="hon-foot">💡 Cada mes es el <b>mes del trabajo</b>. El IVA 22% se calcula solo cuando hay N° de factura, y va al mes de la <b>fecha de factura</b> (vacía = el mes del trabajo). «Cobrado» va por la <b>fecha de pago</b>. El estado pasa a <b>Atrasado</b> cuando vence el plazo sin cobrar: fin del mes, o del mes siguiente si el cliente factura a <b>mes vencido</b> (se elige en ✎). En la vista <b>Anual</b>, tocá un mes para verlo o corregirlo sin salir de esa vista. Tocá el nombre para ver la ficha del cliente, y ✎ para cambiar su honorario mensual o archivarlo.</div>';
  $('#view-hon').innerHTML=h; renderHonBody();
}
function kpiM(l,n,f,c){return '<div class="kpi '+c+'"><div class="k-label">'+l+'</div><div class="k-num money">'+n+'</div>'+(f?'<div class="k-foot">'+f+'</div>':'')+'</div>';}
function honKpis(list){
  var total=0,cob=0,nc=0,atr=0,na=0,pend=0;
  list.forEach(function(c){if(c.imp===null)return;total+=c.tot;if(c.est==='pag'){cob+=c.tot;nc++;}else{pend++;if(c.est==='atr'){atr+=c.tot;na++;}}});
  return '<div class="kpis">'+kpiM('Total a cobrar',money(total),'','')+kpiM('Cobrado · '+nc,money(cob),'','k-green')+kpiM('Atrasado · '+na,money(atr),'','k-alerta')+kpiM('Cobrado',(total?Math.round(cob/total*100):0)+'%',pend+' pendiente'+(pend===1?'':'s'),'k-amber')+'</div>';
}
function honEstHtml(c){return c.imp===null?'<span class="muted-cell">—</span>':'<span class="hon-est '+c.est+'">'+HON_EST[c.est]+'</span>';}
function honTotRow(list,m){var t={imp:0,iva:0,tot:0};list.forEach(function(c){if(c.imp!==null){t.imp+=c.imp;t.iva+=c.iva;t.tot+=c.tot;}});return '<tr class="hon-tot" id="hon-totrow"><td>TOTAL · '+MESES_L[m].toUpperCase()+'</td><td class="hon-num">'+money(t.imp)+'</td><td class="hon-num">'+(t.iva?money(t.iva):'—')+'</td><td class="hon-num">'+money(t.tot)+'</td><td colspan="6"></td></tr>';}
function honName(r){return '<div class="name-cell">'+cliLink(r.clienteId,'(cliente borrado)')+honVencidoChip(r)+'<button class="go-cli" title="Honorario mensual, medio de pago y archivar" onclick="honCliForm(\''+r.id+'\')">✎</button></div>';}
function honIn(rowId,f,v,o){o=o||{};var d=o.type==='date';return '<input class="cell-in'+(o.cls?' '+o.cls:'')+'"'+(o.type?' type="'+o.type+'"':'')+(d?DR:'')+(o.list?' list="'+o.list+'" autocomplete="off"':'')+' value="'+esc(v==null?'':v)+'" placeholder="'+(o.ph||'')+'" onchange="'+(d?'if(dateOk(this))':'')+'honSet(\''+rowId+'\',\''+f+'\',this.value)">';}
function renderHonBody(){
  var el=$('#hon-body'); if(!el)return;
  var y=honYear(), rows=honRows();
  if(honVista==='anual'){
    var all=[];
    var body=rows.length?rows.map(function(r){return '<tr class="hon-a"><td>'+honName(r)+'</td>'+[...Array(12).keys()].map(function(m){var c=honCalc(r,y,m);all.push(c);var abrir=' onclick="honMesForm(\''+r.id+'\','+m+')"';if(c.imp===null)return '<td class="muted-cell" style="text-align:center;cursor:pointer" data-tip="'+esc(MESES_L[m]+': sin honorario · tocá para cargarlo')+'"'+abrir+'>·</td>';return '<td class="m '+c.est+'" style="cursor:pointer" data-tip="'+esc(MESES_L[m]+': '+money(c.tot)+' · '+HON_EST[c.est]+(c.mv.fecha?' ('+fDate(c.mv.fecha)+')':'')+' · tocá para ver o editar')+'"'+abrir+'>'+numTxt(Math.round(c.tot))+'</td>';}).join('')+'</tr>';}).join(''):emptyRow(13,honQ?'Ningún cliente coincide con la búsqueda.':'Sin clientes en Honorarios. Usá "+ Cliente".');
    el.innerHTML='<div id="hon-kpis">'+honKpis(all)+'</div><div class="table-wrap"><table style="min-width:1100px"><thead><tr><th>Cliente</th>'+MESES.map(function(m){return '<th style="text-align:right">'+m.toUpperCase()+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
    return;
  }
  var m=honMes, calcs=rows.map(function(r){return honCalc(r,y,m);});
  var body=rows.length?rows.map(function(r,i){var c=calcs[i],mv=c.mv,sin=c.imp===null;
    return '<tr data-row="'+r.id+'"><td>'+honName(r)+'</td>'
      +'<td>'+honIn(r.id,'importe',sin?'':numTxt(c.imp),{cls:'num',ph:'$'})+'</td>'
      +'<td class="hon-num muted-cell h-iva">'+(c.iva?money(c.iva):'—')+'</td>'
      +'<td class="hon-num h-tot"><b>'+(sin?'—':money(c.tot))+'</b></td>'
      +'<td>'+honIn(r.id,'factura',mv.factura,{ph:'+ N°'})+'</td>'
      +'<td class="h-ffac">'+honFFacCelda(r,mv,y,m)+'</td>'
      +'<td>'+honIn(r.id,'recibo',mv.recibo,{ph:'+ recibo'})+'</td>'
      +'<td>'+honIn(r.id,'fecha',mv.fecha,{type:'date'})+'</td>'
      +'<td>'+honIn(r.id,'medio',mv.medio||r.medio,{list:'dl-medio',ph:'—'})+'</td>'
      +'<td class="h-est">'+honEstHtml(c)+'</td></tr>';}).join(''):emptyRow(10,honQ?'Ningún cliente coincide con la búsqueda.':'Sin clientes en Honorarios. Usá "+ Cliente".');
  el.innerHTML='<div id="hon-kpis">'+honKpisMes(calcs,y,m)+'</div><div class="table-wrap"><table style="min-width:1180px"><thead><tr><th>Cliente</th><th style="text-align:right">Honorarios</th><th style="text-align:right">IVA 22%</th><th style="text-align:right">Total</th><th>N° factura</th><th>Fecha factura</th><th>Recibo</th><th>Fecha pago</th><th>Medio</th><th>Estado</th></tr></thead><tbody>'+body+(rows.length?honTotRow(calcs,m):'')+'</tbody></table></div>';
}
/* Alta / edición de un cliente en Honorarios (ventana modal) */
function honCliForm(id){
  var r=id?Store.get('honCli',id):{}; curForm={form:'honcli',id:id||null};
  $('#modal-title').textContent=id?'Honorarios · '+cliNameOr(r.clienteId):'Nuevo cliente en Honorarios'; $('#modal-del').style.display=id?'inline-flex':'none';
  $('#modal-body').innerHTML='<div class="field"><label>Cliente <span class="req">*</span></label><input data-k="nombre" list="dl-clientes" autocomplete="off" value="'+esc(cliNameOr(r.clienteId))+'" placeholder="Empezá a escribir y elegí de la lista…"><div class="muted-cell" style="font-size:11px;margin-top:4px">Si no está en Info. Clientes, se agrega automáticamente.</div></div>'
    +'<div class="field-2"><div class="field"><label>Honorario mensual (sin IVA)</label><input data-k="importe" value="'+esc(numTxt(r.importe))+'" placeholder="Ej: 2.500"></div><div class="field"><label>Medio de pago habitual</label><input data-k="medio" list="dl-medio" autocomplete="off" value="'+esc(r.medio||'')+'"></div></div>'
    +'<div class="field"><label>¿Cuándo factura?</label><select data-k="facturacion"><option value=""'+(honEsVencido(r)?'':' selected')+'>Mes corriente (factura el mismo mes del trabajo)</option><option value="vencido"'+(honEsVencido(r)?' selected':'')+'>Mes vencido (factura el mes siguiente)</option></select>'
    +'<div class="muted-cell" style="font-size:11px;margin-top:4px">A mes vencido, la fecha de factura se sugiere en el mes siguiente y no figura «Atrasado» hasta que termina ese mes.</div></div>'
    +(id?'<label class="chkline"><input type="checkbox" data-k="archivado" '+(r.archivado?'checked':'')+'> Archivado (deja de aparecer en la lista)</label>':'');
  $('#modal').classList.add('open');
}
function honCliSave(){
  var o={}; $('#modal-body').querySelectorAll('[data-k]').forEach(function(el){o[el.dataset.k]=el.type==='checkbox'?el.checked:el.value;});
  if(!(o.nombre||'').trim()){toast('Falta el cliente');return;}
  var cid=ensureCli(o.nombre);
  if(!curForm.id&&Store.all('honCli').some(function(x){return x.clienteId===cid;})){toast('Ese cliente ya está en Honorarios');return;}
  var r=curForm.id?Store.get('honCli',curForm.id):{};
  r.clienteId=cid; r.importe=honNum(o.importe); r.medio=o.medio||''; r.facturacion=o.facturacion==='vencido'?'vencido':''; r.archivado=!!o.archivado;
  Store.upsert('honCli',r); closeModal(); renderHon(); toast('Guardado');
}
function honCliDel(){ if(!confirm('¿Quitar este cliente de Honorarios? También se borran sus cobros registrados.'))return; var id=curForm.id; Store.all('honMov').filter(function(x){return x.rowId===id;}).forEach(function(x){ Store.remove('honMov',x.id); }); Store.remove('honCli',id); closeModal(); renderHon(); toast('Eliminado'); }
function honExpRows(){
  var y=honYear(), rows=honRows();
  if(honVista==='anual') return {title:'Honorarios '+y+' · Anual',cols:['Cliente'].concat(MESES),data:rows.map(function(r){return [cliNameOr(r.clienteId)].concat([...Array(12).keys()].map(function(m){var c=honCalc(r,y,m);return c.imp===null?'':numTxt(c.tot)+' ('+HON_EST[c.est]+')';}));})};
  var m=honMes;
  return {title:'Honorarios · '+MESES_L[m]+' '+y,cols:['Cliente','Facturación','Honorarios','IVA 22%','Total','N° factura','Fecha factura','Recibo','Fecha pago','Medio','Estado'],data:rows.map(function(r){var c=honCalc(r,y,m),mv=c.mv,sin=c.imp===null;return [cliNameOr(r.clienteId),honEsVencido(r)?'Mes vencido':'Mes corriente',sin?'':numTxt(c.imp),c.iva?numTxt(c.iva):'',sin?'':numTxt(c.tot),mv.factura||'',mv.fFac?fDate(mv.fFac):'',mv.recibo||'',mv.fecha?fDate(mv.fecha):'',mv.medio||r.medio||'',sin?'':HON_EST[c.est]];})};
}
