/*
 * Grillas mensuales: Empresas / Servicios profesionales.
 * El nombre y el tipo se editan directo en la tabla; el nombre queda vinculado a su ficha en Info. Clientes.
 */
/* ===== GRILLAS MENSUALES ===== */
let gridMonth={empresas:new Date().getMonth(),sprof:new Date().getMonth()};
const GRID_META={empresas:{title:'Empresas',tag:'Tipo',hasTag:true,cliTipo:'Empresa'},sprof:{title:'Serv. Profesionales',hasTag:false,cliTipo:'Persona física'}};
// Las celdas se guardan por año y mes ("2026-8"): el año es el año de trabajo (Configuración → Año fiscal).
function ck(mi){return anioActivo()+'-'+mi;}
function gcell(r,mi){return (r.cells||{})[ck(mi)]||{};}
function gridRow(gid,rid){return Store.data.grids[gid].rows.find(x=>x.id===rid);}
// Estado que se muestra en la celda: si ya se envió al cliente, cuenta como realizado.
function cellEst(c){return c.enviado&&c.estado!=='na'?'done':(c.estado||'');}
function renderGrid(gid){
  const meta=GRID_META[gid], rows=Store.data.grids[gid].rows, mSel=gridMonth[gid];
  let done=0,pend=0,na=0;rows.forEach(r=>{const st=cellEst(gcell(r,mSel));if(st==='done')done++;else if(st==='na')na++;else pend++;});
  const tot=(rows.length-na)||1;
  let h='<div class="view-head"><div><h2>'+meta.title+' <span style="color:var(--muted);font-weight:400">'+anioActivo()+'</span></h2></div></div>';
  h+='<div class="gtoolbar"><span class="glegend"><span class="lg"><i style="background:var(--green)"></i>Hecho</span><span class="lg"><i style="background:var(--amber)"></i>Pendiente</span><span class="lg"><i style="background:#c3cad6"></i>N/A</span><span class="lg">✈ Enviado al cliente</span></span>'
    +'<span class="spacer"></span>'+expBtns('grid',gid)+'<button class="btn btn-sm btn-primary" onclick="openGridRow(\''+gid+'\')">+ Agregar fila</button></div>';
  h+='<div class="months"><button class="mbtn'+(mSel===-1?' active':'')+'" onclick="setGridMonth(\''+gid+'\',-1)">Todos</button>'+MESES.map((m,i)=>'<button class="mbtn'+(mSel===i?' active':'')+'" onclick="setGridMonth(\''+gid+'\','+i+')">'+m.toUpperCase()+'</button>').join('')+'</div>';
  if(mSel>=0){
    const kc = meta.hasTag
      ? kpi('Realizados',done,MESES_L[mSel],'k-green')+kpi('Pendientes',pend,'sin registrar','k-amber')+kpi('N/A',na,'no corresponde','')+kpi('Completado',Math.round(done/tot*100)+'%','del mes','k-acento')
      : kpi('Realizados',done,MESES_L[mSel],'k-green')+kpi('Pendientes',pend,'sin registrar','k-amber')+kpi('Completado',Math.round(done/tot*100)+'%','del mes','k-acento');
    h+='<div class="kpis" style="grid-template-columns:repeat('+(meta.hasTag?4:3)+',1fr)">'+kc+'</div>';
  }
  const months = mSel>=0?[mSel]:[...Array(12).keys()];
  let head='<th>Nombre</th>'+(meta.hasTag?'<th>'+meta.tag+'</th>':'')+months.map(i=>'<th style="text-align:center">'+MESES[i].toUpperCase()+'</th>').join('')+'<th></th>';
  let body=rows.length?rows.map(r=>{
    let td='<tr><td><div class="name-cell">'+cliInput(r.nombre,'gridSetName(\''+gid+'\',\''+r.id+'\',this.value)','Nombre…')+(r.clienteId?'<button class="go-cli" title="Ver la ficha del cliente" onclick="goCli(\''+r.clienteId+'\')">↗</button>':'')+'</div></td>';
    if(meta.hasTag) td+='<td><input class="cell-in fit" list="dl-emptipos" autocomplete="off" value="'+esc(r.tipo||'')+'" placeholder="+ tipo" onchange="gridSet(\''+gid+'\',\''+r.id+'\',\'tipo\',this.value)"></td>';
    td+=months.map(i=>{const c=gcell(r,i);const st=cellEst(c);
      let inner='<span class="gcell go-empty">○</span>';
      if(st==='done'){ const f=c.etiqueta?esc(c.etiqueta):(c.fecha?fDate(c.fecha).slice(0,5):'✓'); inner='<span class="gcell go-done"'+(c.comentario?' title="'+esc(c.comentario)+'"':'')+'>'+f+(c.enviado?' ✈':'')+'</span>'; }
      else if(st==='pend') inner='<span class="gcell go-pend">⏳</span>';
      else if(st==='na') inner='<span class="gcell go-na">N/A</span>';
      return '<td style="text-align:center" onclick="openCellEditor(\''+gid+'\',\''+r.id+'\','+i+')">'+inner+'</td>';}).join('');
    td+='<td>'+actions('grid:'+gid,r.id)+'</td></tr>'; return td;
  }).join('') : emptyRow(months.length+(meta.hasTag?3:2),'Sin filas. Usá "+ Agregar fila".');
  h+='<datalist id="dl-emptipos">'+(Store.data.empTipos||[]).map(x=>'<option value="'+esc(x)+'">').join('')+'</datalist>';
  h+='<div class="table-wrap"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  $('#view-'+gid).innerHTML=h;
}
function gridSet(gid,rid,f,v){const r=gridRow(gid,rid);if(!r)return;r[f]=v;if(f==='tipo'&&v&&(Store.data.empTipos||[]).indexOf(v)<0)Store.data.empTipos.push(v);Store.save();}
function gridSetName(gid,rid,v){const r=gridRow(gid,rid);if(!r)return;v=(v||'').trim();if(!v){toast('El nombre no puede quedar vacío');renderGrid(gid);return;}r.nombre=v;r.clienteId=ensureCli(v,GRID_META[gid].cliTipo);Store.save();renderGrid(gid);}
function setGridMonth(gid,m){gridMonth[gid]=m;renderGrid(gid);}
function openCellEditor(gid,rid,mi){
  var r=gridRow(gid,rid); if(!r)return;
  var c=gcell(r,mi); curForm={form:'cell',gid:gid,rid:rid,mi:mi};
  var estMap=[['done','✓ Realizado'],['pend','⏳ Pendiente'],['na','— N/A'],['','○ Sin registrar']];
  var estSelHtml=estMap.map(function(e){return '<option value="'+e[0]+'"'+(cellEst(c)===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('');
  $('#modal-title').textContent=r.nombre+' · '+MESES_L[mi]; $('#modal-del').style.display='none';
  $('#modal-body').innerHTML=
    '<div class="field"><label>Estado</label><select data-k="estado">'+estSelHtml+'</select></div>'
   +'<div class="field"><label>Fecha de realización</label><input type="date"'+DR+' data-k="fecha" value="'+esc(c.fecha||'')+'"></div>'
   +'<div class="field"><label>Etiqueta corta <span style="color:var(--muted);font-weight:400">(opcional, reemplaza la fecha en la celda)</span></label><input data-k="etiqueta" maxlength="12" value="'+esc(c.etiqueta||'')+'" placeholder="Ej: PPGo, Cuotas3, +50%…"></div>'
   +'<div class="field" style="background:var(--azul-claro);border-radius:8px;padding:12px"><label style="display:flex;align-items:center;gap:8px;color:var(--azul-osc)"><input type="checkbox" data-k="enviado" '+(c.enviado?'checked':'')+' style="width:auto" onchange="cellEnviado(this)"> ✈ Enviado al cliente</label><label style="margin-top:8px">Fecha de envío</label><input type="date"'+DR+' data-k="fechaEnvio" value="'+esc(c.fechaEnvio||'')+'"></div>'
   +'<div class="field"><label>Comentario</label><textarea data-k="comentario" placeholder="Ej: hubo excedente IRPF, anticipo, observaciones…">'+esc(c.comentario||'')+'</textarea></div>';
  $('#modal').classList.add('open');
}
// Al marcar "Enviado al cliente" se completa enseguida: queda Realizado y con la fecha de hoy.
function cellEnviado(cb){if(!cb.checked)return;var b=$('#modal-body');var st=b.querySelector('[data-k="estado"]');if(st&&st.value!=='na')st.value='done';['fechaEnvio','fecha'].forEach(function(k){var i=b.querySelector('[data-k="'+k+'"]');if(i&&!i.value)i.value=today();});}
function openGridRow(gid,rid){ const meta=GRID_META[gid]; const r=rid?gridRow(gid,rid):{}; curForm={form:'grid:'+gid,id:rid||null,gid:gid};
  $('#modal-title').textContent=(rid?'Editar':'Nueva fila')+' · '+meta.title; $('#modal-del').style.display=rid?'inline-flex':'none';
  var tipoField='';
  if(meta.hasTag){ tipoField='<div class="field"><label>'+meta.tag+'</label><input data-k="tipo" list="dl-emptipos" value="'+esc(r.tipo||'')+'" autocomplete="off"><div class="muted-cell" style="font-size:11px;margin-top:4px">Elegí uno existente o escribí uno nuevo (queda guardado).</div></div>'; }
  $('#modal-body').innerHTML='<div class="field"><label>Nombre <span class="req">*</span></label><input data-k="nombre" list="dl-clientes" autocomplete="off" value="'+esc(r.nombre||'')+'" placeholder="Empezá a escribir y elegí de la lista…"><div class="muted-cell" style="font-size:11px;margin-top:4px">Si el nombre no está en Info. Clientes, se agrega automáticamente.</div></div>'+tipoField;
  $('#modal').classList.add('open');
}
