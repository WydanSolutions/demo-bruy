/*
 * Sección: Tareas extras.
 */
/* ===== TAREAS EXTRAS ===== */
function renderTareas(){
  let h='<div class="view-head"><div><h2>Tareas Extras</h2><div class="sub">Certificados, flujos de fondos y trabajos puntuales</div></div><button class="btn btn-primary" onclick="openForm(\'tarea\')">+ Nueva tarea</button></div>';
  h+='<div class="toolbar"><div class="search"><input id="ta-q" placeholder="Buscar tarea, cliente o etiqueta…" oninput="renderTareasTable()"></div>'
    +'<select class="filt" id="ta-e" onchange="renderTareasTable()"><option value="">Todos los estados</option><option>Pendiente</option><option>En proceso</option><option>Hecha</option></select>'
    +'<select class="filt" id="ta-u" onchange="renderTareasTable()"><option value="">Toda urgencia</option><option>Alta</option><option>Media</option><option>Baja</option></select></div>'
    +'<div class="table-wrap" id="ta-table"></div>';
  $('#view-tareas').innerHTML=h; renderTareasTable();
}
function renderTareasTable(){
  const q=($('#ta-q')&&$('#ta-q').value.toLowerCase())||'', fe=($('#ta-e')&&$('#ta-e').value)||'', fu=($('#ta-u')&&$('#ta-u').value)||'';
  let rows=Store.all('tareas').slice().sort((a,b)=>{const dn=(a.estado==='Hecha')-(b.estado==='Hecha');if(dn)return dn;const u=urgRank(b.urgencia)-urgRank(a.urgencia);if(u)return u;return (a.plazo||'zzz').localeCompare(b.plazo||'zzz');});
  rows=rows.filter(t=>{ if(fe&&t.estado!==fe)return false; if(fu&&(t.urgencia||'')!==fu)return false; if(q&&!((t.tarea||'').toLowerCase().includes(q)||cliName(t.clienteId).toLowerCase().includes(q)||(t.etiqueta||'').toLowerCase().includes(q)))return false; return true; });
  const body=rows.length?rows.map(t=>{const done=t.estado==='Hecha'||t.hecho;const dd=!done&&t.plazo?daysTo(t.plazo):null;let plz=fDate(t.plazo);if(dd!==null)plz+=' <span style="color:'+vencColor(dd)+';font-size:11.5px;font-weight:700">('+(dd<0?'vencido':dd===0?'hoy':dd+'d')+')</span>';const info=t.info?'<div class="muted-cell" style="font-size:11.5px;margin-top:3px;white-space:normal;max-width:320px">'+esc(t.info)+'</div>':'';
    return '<tr'+(done?' style="opacity:.55"':'')+'>'
    +'<td style="width:34px;text-align:center"><span class="chk '+(done?'on':'')+'" onclick="toggleTarea(\''+t.id+'\')">'+(done?'✓':'')+'</span></td>'
    +'<td><div class="cli-name"'+(done?' style="text-decoration:line-through"':'')+'>'+esc(t.tarea)+'</div>'+info+'</td>'
    +'<td class="muted-cell">'+(t.clienteId?esc(cliName(t.clienteId)):'—')+'</td>'
    +'<td>'+(t.etiqueta?'<span class="tag">'+esc(t.etiqueta)+'</span>':'<span class="muted-cell">—</span>')+'</td>'
    +'<td>'+urgPill(t.urgencia)+'</td><td>'+plz+'</td>'
    +'<td>'+clkEst('tareas',t.id,t.estado,['Pendiente','En proceso','Hecha'])+'</td>'
    +'<td>'+actions('tarea',t.id)+'</td></tr>';}).join('') : emptyRow(8,'No hay tareas. Usá "+ Nueva tarea".');
  $('#ta-table').innerHTML='<table><thead><tr><th>Hecha</th><th>Tarea</th><th>Cliente</th><th>Etiqueta</th><th>Urgencia</th><th>Plazo</th><th>Estado</th><th></th></tr></thead><tbody>'+body+'</tbody></table>';
}
function toggleTarea(id){const o=Store.get('tareas',id);const done=o.estado==='Hecha';o.estado=done?'Pendiente':'Hecha';o.hecho=!done;Store.upsert('tareas',o);renderTareasTable();updateBadges();}
