/*
 * Sección: Sueldos (coordinación mensual).
 */
/* ===== SUELDOS (coordinación mensual) ===== */
/* Los últimos tres meses. Los que ya pasaron están enviados y con todo tildado; el mes en curso,
   a medio hacer, que es como se ve la pantalla cualquier día del mes. */
function seedSueldos(){
  var mm=new Date().getMonth(), yy=new Date().getFullYear(), out=[], n=0;
  var f=function(m,d){ var t=new Date(yy,m,d); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
  // empresa · cliente · categoría · grupo del consejo de salarios · nota
  var emp=[
    ['Panadería La Espiga SRL','c2','Panadería','Grupo 1','manda la planilla por WhatsApp el 25'],
    ['Transportes del Norte SA','c3','Transporte de carga','Grupo 13',''],
    ['Ferretería El Clavo SRL','c7','Comercio','Grupo 10',''],
    ['Farmacia Santa Rita','c11','Comercio','Grupo 10','dos empleadas part time'],
    ['Distribuidora Frontera SA','c17','Comercio mayorista','Grupo 10',''],
    ['Clínica Dental Sonrisa','c15','Salud','Grupo 15',''],
    ['Café Las Delicias','c18','Gastronomía','Grupo 12','dos mozas y un cocinero'],
  ];
  var dom=[['Rosana Píriz','','Servicio doméstico','Grupo 21'],['Beatriz Núñez','','Servicio doméstico','Grupo 21']];
  for(var k=2;k>=0;k--){
    var m=mm-k; if(m<0)continue;
    var cerrado=(k>0);                 // los meses anteriores ya están terminados
    emp.forEach(function(e,i){
      var listo=cerrado||i<4;          // en el mes en curso van cuatro hechas y tres en camino
      out.push({id:'sl'+(++n),sub:'sueldos',mes:m,anio:yy,empresa:e[0],clienteId:e[1],
        estado:listo?'Enviado':(i===4?'Pronto':i===5?'En proceso':'Pendiente'),
        prontos:listo,avisado:listo,avisadoFecha:listo?f(m+1,2+(i%3)):'',
        fosmetal:listo,bps:listo,contab:cerrado,control:cerrado,audit:cerrado&&i<3,
        cat:e[2],grupo:e[3],obs:'',nota:e[4]});
    });
    dom.forEach(function(e,i){
      out.push({id:'sd'+(++n),sub:'domesticos',mes:m,anio:yy,empresa:e[0],clienteId:e[1],
        estado:cerrado||i===0?'Enviado':'En proceso',prontos:cerrado||i===0,
        avisado:cerrado||i===0,avisadoFecha:(cerrado||i===0)?f(m+1,1):'',
        fosmetal:cerrado,bps:cerrado,cat:e[2],grupo:e[3],obs:'',nota:''});
    });
  }
  out.push({id:'sr1',sub:'reliq',mes:mm,anio:yy,empresa:'Estancia Los Ceibos',clienteId:'c4',estado:'Pronto',
    empleado:'Licencia no gozada — 2 peones',importe:'38.400',grupo:'Grupo 9',obs:'',nota:''});
  out.push({id:'sr2',sub:'reliq',mes:Math.max(0,mm-1),anio:yy,empresa:'Transportes del Norte SA',clienteId:'c3',estado:'Enviado',
    empleado:'Horas extra de agosto',importe:'12.750',grupo:'Grupo 13',obs:'',nota:''});
  // Nada avisado con fecha futura.
  var hoyIso=today(); out.forEach(function(r){ if(r.avisadoFecha&&r.avisadoFecha>hoyIso){ r.avisadoFecha=''; r.avisado=false; } });
  return out;
}
function defaultSubs(){return [{id:'sueldos',name:'Sueldos'},{id:'domesticos',name:'Servicios Domésticos'},{id:'reliq',name:'Reliquidaciones'}];}
function sldSubsList(){ if(!Store.data.sldSubs||!Store.data.sldSubs.length) Store.data.sldSubs=defaultSubs(); return Store.data.sldSubs; }
function sldAddSub(){ pedirTexto('Tipo nuevo','Nombre del tipo (ej: Profesionales, Rurales…)','','Agregar',function(n){ var id='sub'+Date.now(); sldSubsList().push({id:id,name:n}); Store.save(); sldSub=id; renderSueldos(); toast('Tipo agregado'); }); }
function sldRenameSub(id){ var s=sldSubsList().find(function(x){return x.id===id;}); if(!s)return; pedirTexto('Renombrar tipo','Nombre del tipo',s.name,'Guardar',function(n){ s.name=n; Store.save(); renderSueldos(); toast('Cambios guardados'); }); }
function sldDelSub(id){ if(sldSubsList().length<=1){toast('Debe quedar al menos un tipo');return;} var used=Store.all('sueldos').filter(function(r){return r.sub===id;}); if(!confirm('¿Borrar este tipo'+(used.length?' y sus '+used.length+' filas':'')+'?'))return; Store.data.sldSubs=sldSubsList().filter(function(x){return x.id!==id;}); used.forEach(function(r){ Store.remove('sueldos',r.id); }); if(sldSub===id)sldSub=Store.data.sldSubs[0].id; Store.save(); renderSueldos(); }
function sldExportCsv(){ var rows=sldRows(sldSub); if(!rows.length){toast('Nada para exportar');return;} var cols=['empresa','estado','cat','grupo','obs']; var csv=cols.join(';')+'\n'+rows.map(function(r){return cols.map(function(c){return '"'+String(r[c]||'').replace(/"/g,'""')+'"';}).join(';');}).join('\n'); var b=new Blob([csv],{type:'text/csv'}); var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='sueldos-'+MESES[sldMes]+'-'+sldAnio+'.csv'; a.click(); toast('CSV exportado'); }
var sldQ=''; // texto del buscador de empresas
var sldSub='sueldos', sldMes=new Date().getMonth(), sldAnio=new Date().getFullYear();
var SLD_SUBS=[{id:'sueldos',name:'Sueldos'},{id:'domesticos',name:'Servicios Domésticos'},{id:'reliq',name:'Reliquidaciones'}];
var SLD_EST=['Pendiente','En proceso','Pronto','Enviado'];
var SLD_COL={'Pendiente':'#98a1b0','En proceso':'#a8690a','Pronto':'#2e7d52','Enviado':'#2f6fb0'};
function sldRows(sub){ return Store.all('sueldos').filter(function(r){return r.sub===sub&&r.mes===sldMes&&r.anio===sldAnio;}); }
function sldCount(sub){ return sldRows(sub).length; }
function setSldSub(s){ sldSub=s; renderSueldos(); }
function setSldMes(v){ sldMes=+v; renderSueldos(); }
function setSldAnio(v){ sldAnio=+v; renderSueldos(); }
function sldSet(id,f,v,re){ var r=Store.get('sueldos',id); if(!r)return; r[f]=v; if(f==='avisado'){ r.avisadoFecha=v?(r.avisadoFecha||today()):''; } if(f==='estado'&&v==='Enviado'){ r.avisado=true; if(!r.avisadoFecha)r.avisadoFecha=today(); } Store.save(); if(re)renderSueldos(); }
// Fila nueva: vacía y con el cursor en "Empresa" para elegir el cliente de la lista.
function sldAdd(){ sldQ=''; var nid='s'+Date.now(); Store.data.sueldos.push({id:nid,clienteId:'',sub:sldSub,mes:sldMes,anio:sldAnio,empresa:'',estado:'Pendiente',prontos:false,avisado:false,avisadoFecha:'',fosmetal:false,bps:false,contab:false,control:false,audit:false,empleado:'',importe:'',grupo:'',obs:'',nota:''}); Store.save(); renderSueldos(); var i=document.querySelector('#sld-body tr[data-id="'+nid+'"] .name-cell input'); if(i)i.focus(); }
// Empresa de una fila: se elige de Info. Clientes (si el nombre no existe, se agrega ahí).
function sldSetEmpresa(id,v){ var r=Store.get('sueldos',id); if(!r)return; v=(v||'').trim(); r.clienteId=v?ensureCli(v):''; r.empresa=v?(cliNameOr(r.clienteId)||v):''; Store.save(); renderSldTabla(); }
function sldBuscar(v){ sldQ=v; renderSldTabla(); }
function sldDel(id){ if(confirm('¿Eliminar esta fila?')){ Store.remove('sueldos',id); renderSueldos(); } }
function sldCopiarMesAnterior(){ var pm=sldMes-1, pa=sldAnio; if(pm<0){pm=11;pa--;} var prev=Store.all('sueldos').filter(function(r){return r.sub===sldSub&&r.mes===pm&&r.anio===pa;}); if(!prev.length){toast('No hay filas el mes anterior');return;} prev.forEach(function(r){ Store.data.sueldos.push({id:'s'+Date.now()+Math.floor(Math.random()*999),sub:sldSub,mes:sldMes,anio:sldAnio,empresa:r.empresa,clienteId:r.clienteId||'',estado:'Pendiente',prontos:false,avisado:false,avisadoFecha:'',fosmetal:false,bps:false,contab:false,control:false,audit:false,empleado:r.empleado||'',importe:'',grupo:r.grupo||'',obs:'',nota:r.nota||''}); }); Store.save(); renderSueldos(); toast('Copiado del mes anterior'); }
function chkCell(id,f,on){ return '<td style="text-align:center"><span class="chk '+(on?'on':'')+'" style="margin:0 auto" onclick="sldSet(\''+id+'\',\''+f+'\','+(!on)+',true)">'+(on?'✓':'')+'</span></td>'; }
function estSel(id,v){ var tint={'Pendiente':'#f0f2f6','En proceso':'#fdf1dd','Pronto':'#e8f5ee','Enviado':'#e9f0f9'}[v]||'#fff'; var col=SLD_COL[v]||'#333'; var o=SLD_EST.map(function(e){return '<option style="color:#16202e"'+(e===v?' selected':'')+'>'+e+'</option>';}).join(''); return '<select class="sld-est" style="background:'+tint+';color:'+col+';border-color:'+col+'" onchange="sldSet(\''+id+'\',\'estado\',this.value,true)">'+o+'</select>'; }
function sldColsMenu(e){e.stopPropagation();var el=document.getElementById('sldcolcfg');if(el)el.classList.toggle('open');}
function sldDefaultCols(sub){
  if(sub==='reliq') return [{key:'empleado',label:'Empleado / Concepto',type:'text'},{key:'importe',label:'Importe',type:'text'},{key:'grupo',label:'Grupo',type:'text'},{key:'obs',label:'Observaciones',type:'text'}];
  if(sub==='domesticos') return [{key:'cat',label:'Categoría',type:'text'},{key:'grupo',label:'Grupo',type:'text'},{key:'prontos',label:'Prontos',type:'check'},{key:'fosmetal',label:'Informe',type:'check'},{key:'bps',label:'BPS',type:'check'},{key:'obs',label:'Observaciones',type:'text'}];
  return [{key:'cat',label:'Categoría',type:'text'},{key:'grupo',label:'Grupo',type:'text'},{key:'prontos',label:'Prontos',type:'check'},{key:'fosmetal',label:'Informe',type:'check'},{key:'bps',label:'BPS',type:'check'},{key:'contab',label:'Contab.',type:'check'},{key:'control',label:'Ctrl BPS',type:'check'},{key:'audit',label:'Auditoría',type:'check'},{key:'obs',label:'Observaciones',type:'text'}];
}
function sldCols(){ if(!Store.data.sldColsCfg)Store.data.sldColsCfg={}; if(!Store.data.sldColsCfg[sldSub])Store.data.sldColsCfg[sldSub]=sldDefaultCols(sldSub); return Store.data.sldColsCfg[sldSub]; }
function sldCellFor(r,c){
  if(c.type==='check') return chkCell(r.id,c.key,r[c.key]);
  if(c.type==='aviso') return avCell(r);
  if(c.type==='date') return '<td><input class="sld-in" type="date"'+DR+' value="'+esc(r[c.key]||'')+'" onchange="if(dateOk(this))sldSet(\''+r.id+'\',\''+c.key+'\',this.value,false)"></td>';
  return '<td>'+txtCell(r.id,c.key,r[c.key],'',c.key==='grupo'?'fit':'')+'</td>';
}
function avCell(r){ return '<td style="text-align:center;min-width:120px"><span class="chk '+(r.avisado?'on':'')+'" style="margin:0 auto" onclick="sldSet(\''+r.id+'\',\'avisado\','+(!r.avisado)+',true)">'+(r.avisado?'✓':'')+'</span>'+(r.avisado?'<input class="sld-in" type="date" style="margin-top:4px;font-size:10.5px;padding:3px 5px" value="'+esc(r.avisadoFecha||'')+'" onchange="sldSet(\''+r.id+'\',\'avisadoFecha\',this.value,false)">':'')+'</td>'; }
function sldColRename(i,v){var c=sldCols();c[i].label=(v.trim()||c[i].label);Store.save();renderSueldos();}
function sldColDel(i){if(!confirm('¿Borrar esta columna?'))return;sldCols().splice(i,1);Store.save();renderSueldos();}
function sldColMove(i,d){var c=sldCols();var j=i+d;if(j<0||j>=c.length)return;var tmp=c[i];c[i]=c[j];c[j]=tmp;Store.save();renderSueldos();}
function sldColAdd(){var n=document.getElementById('newcol-n').value.trim();if(!n){toast('Escribí el nombre');return;}var ty=document.getElementById('newcol-t').value;sldCols().push({key:'c'+Date.now(),label:n,type:ty});Store.save();renderSueldos();}
function sldColsReset(){if(!confirm('¿Volver a las columnas por defecto de este tipo?'))return;Store.data.sldColsCfg[sldSub]=sldDefaultCols(sldSub);Store.save();renderSueldos();}
function sldColsBtn(){var cols=sldCols();var items=cols.map(function(c,i){return '<div class="colrow"><input class="col-name" value="'+esc(c.label)+'" onchange="sldColRename('+i+',this.value)"><span class="col-type">'+({text:'texto',check:'✓',date:'fecha',aviso:'✓+fecha'}[c.type]||c.type)+'</span><button class="col-mv" onclick="sldColMove('+i+',-1)" title="Subir">▲</button><button class="col-mv" onclick="sldColMove('+i+',1)" title="Bajar">▼</button><button class="col-x" onclick="sldColDel('+i+')" title="Borrar">×</button></div>';}).join('');var addr='<div class="colrow"><input id="newcol-n" class="col-name" placeholder="Nueva columna…"><select id="newcol-t" class="col-type-sel"><option value="check">✓ Casilla</option><option value="text">Texto</option><option value="date">Fecha</option></select><button class="btn btn-sm btn-primary" onclick="sldColAdd()">Agregar</button></div>';return '<span style="position:relative;display:inline-block"><button class="btn btn-sm" onclick="sldColsMenu(event)">⚙ Columnas</button><div class="pxcfg" id="sldcolcfg" style="min-width:320px;max-height:340px;overflow:auto" onclick="event.stopPropagation()"><div class="pt">Columnas de «'+esc((sldSubsList().find(function(s){return s.id===sldSub;})||{}).name||'')+'»</div>'+items+'<div class="pt" style="margin-top:10px">Agregar columna</div>'+addr+'<button class="btn-ghost btn-sm" style="margin-top:8px" onclick="sldColsReset()">↺ Restablecer por defecto</button></div></span>';}
document.addEventListener('click',function(){var s=document.getElementById('sldcolcfg');if(s)s.classList.remove('open');});
function txtCell(id,f,v,ph,cls){ return '<input class="sld-in'+(cls?' '+cls:'')+'" value="'+esc(v||'')+'" placeholder="'+(ph||'—')+'" onchange="sldSet(\''+id+'\',\''+f+'\',this.value,false)">'; }
function renderSueldos(){
  var rows=sldRows(sldSub);
  var cnt={};SLD_EST.forEach(function(e){cnt[e]=0;});rows.forEach(function(r){if(cnt[r.estado]!==undefined)cnt[r.estado]++;});
  var h='<div class="view-head" style="align-items:flex-start"><div><h2>💼 Sueldos <span style="color:var(--muted);font-weight:400">'+MESES_L[sldMes]+' '+sldAnio+'</span></h2><div class="sub" style="letter-spacing:1px;text-transform:uppercase;font-size:11px">Coordinación mensual de trabajos</div></div>'
    +'<div class="sld-top"><button class="btn btn-sm" onclick="sldCopiarMesAnterior()">⧉ Copiar mes anterior</button><select class="filt" onchange="setSldMes(this.value)">'+MESES_L.map(function(m,i){return '<option value="'+i+'"'+(i===sldMes?' selected':'')+'>'+m+'</option>';}).join('')+'</select>'
    +yearSelect(sldAnio,'setSldAnio')+'</div></div>';
  // subtabs
  h+='<div class="sld-subtabs">'+sldSubsList().map(function(s){return '<button class="sld-tab'+(s.id===sldSub?' active':'')+'" ondblclick="sldRenameSub(\''+s.id+'\')" onclick="setSldSub(\''+s.id+'\')">'+esc(s.name)+' <span class="sld-badge">'+sldCount(s.id)+'</span>'+(sldSubsList().length>1?' <span class="sub-x" onclick="event.stopPropagation();sldDelSub(\''+s.id+'\')">×</span>':'')+'</button>';}).join('')+'<button class="sld-tab sub-add" onclick="sldAddSub()">+ Tipo</button></div><div class="sub-hint">Doble clic en un tipo para renombrar · agregá los que necesites (por rubro, laudo, agrupación…)</div>';
  // toolbar
  h+='<div class="toolbar"><div class="search"><input id="sld-q" placeholder="Buscar empresa…" value="'+esc(sldQ)+'" oninput="sldBuscar(this.value)"></div><span class="glegend">'+SLD_EST.map(function(e){return '<span class="lg"><i style="background:'+SLD_COL[e]+'"></i>'+e+'</span>';}).join('')+'</span><span class="spacer"></span>'+sldColsBtn()+expBtns('sueldos')+'<button class="btn btn-sm btn-primary" onclick="sldAdd()">+ Agregar fila</button></div>';
  // KPIs (5)
  h+='<div class="kpis" style="grid-template-columns:repeat(4,1fr)">'+SLD_EST.map(function(e){return '<div class="kpi" style="--kc:'+SLD_COL[e]+'"><div class="k-num" style="color:'+SLD_COL[e]+'">'+cnt[e]+'</div><div class="k-label" style="margin-top:2px">'+e+'</div></div>';}).join('')+'</div>';
  h+='<div class="table-wrap" id="sld-tabla"></div>';
  h+='<div style="font-size:12px;color:var(--muted);margin-top:12px">Tip: cuando un sueldo queda en estado <b>Pronto</b>, aparece en el Panel para saber qué empresas están listas.</div>';
  $('#view-sueldos').innerHTML=h; renderSldTabla();
}
// Tabla de la carpeta actual (se redibuja sola al buscar, sin tocar el buscador).
function renderSldTabla(){
  var el=document.getElementById('sld-tabla'); if(!el)return;
  var q=sldQ.trim().toLowerCase(), cols=sldCols(), ncol=2+cols.length+1;
  var vis=sldRows(sldSub).filter(function(r){ var n=((r.clienteId&&cliNameOr(r.clienteId))||r.empresa||'').toLowerCase(); return !q||n.includes(q); });
  var head='<th>Empresa</th><th>Estado</th>'+cols.map(function(c){return '<th'+(c.type==='check'||c.type==='aviso'?' style="text-align:center"':'')+'>'+esc(c.label)+'</th>';}).join('')+'<th></th>';
  var body=vis.length?vis.map(function(r){
    var nombre=(r.clienteId&&cliNameOr(r.clienteId))||r.empresa||'';
    return '<tr data-id="'+r.id+'"><td><div class="name-cell">'+cliInput(nombre,'sldSetEmpresa(\''+r.id+'\',this.value)','Elegí o escribí el cliente…')+(r.clienteId?'<button class="go-cli" title="Ver la ficha del cliente" onclick="goCli(\''+r.clienteId+'\')">↗</button>':'')+'</div></td><td>'+estSel(r.id,r.estado)+'</td>'+cols.map(function(c){return sldCellFor(r,c);}).join('')+'<td><button class="btn-ghost" style="color:var(--red)" onclick="sldDel(\''+r.id+'\')">×</button></td></tr>';
  }).join(''):emptyRow(ncol,q?'Ninguna empresa coincide con «'+esc(sldQ)+'».':'Sin filas este mes. Usá "+ Agregar fila" o "Copiar mes anterior".');
  el.innerHTML='<table style="min-width:820px"><thead><tr>'+head+'</tr></thead><tbody id="sld-body">'+body+'</tbody></table>';
}
