/*
 * Sección: Declaraciones (carpetas).
 * Todo se ve por año (selector arriba a la derecha). Dentro de cada carpeta se filtra y se edita directo en la tabla.
 */
/* ===== DECLARACIONES (carpetas) ===== */
let declFolder=null, declAnio=null, declQ='', declEst='', declTipo='';
function folderName(fid){const f=FOLDERS.find(x=>x.id===fid);return f?f.name:fid;}
function declYear(){return declAnio||anioActivo();}
function setDeclAnio(y){declAnio=y;renderDecl();}
function djsDelAnio(){return Store.all('dj').filter(d=>d.anio===declYear());}
// Tipo de DJ: lo escribe la usuaria en su casillero (no hay tipos predefinidos). El filtro muestra los que ya se escribieron.
function djTipos(){const s={};Store.all('dj').forEach(d=>{if(d.tipoDj)s[d.tipoDj]=1;});return Object.keys(s).sort((a,b)=>a.localeCompare(b));}
function declFiltered(){const q=declQ.toLowerCase();return djsDelAnio().filter(d=>{if(d.folder!==declFolder)return false;if(declEst&&d.estado!==declEst)return false;if(declTipo&&(d.tipoDj||'')!==declTipo)return false;if(q&&!(cliNameOr(d.clienteId).toLowerCase().includes(q)||(d.tipoDj||'').toLowerCase().includes(q)||(d.notas||'').toLowerCase().includes(q)))return false;return true;});}
function renderDecl(){
  const yb=yearSelect(declYear(),'setDeclAnio');
  if(!declFolder){
    let h='<div style="display:flex;justify-content:flex-end">'+yb+'</div><div style="text-align:center;margin:6px 0 26px"><h2 style="font-family:var(--f-display);font-size:30px;color:var(--azul-osc)">Declaraciones '+declYear()+'</h2><div style="color:var(--muted);font-size:14px;margin-top:4px">¿En qué declaración vamos a trabajar hoy?</div></div><div class="folders">';
    h+=FOLDERS.map(f=>{const n=djsDelAnio().filter(d=>d.folder===f.id).length;return '<div class="folder" onclick="openFolder(\''+f.id+'\')"><span class="fdot" style="background:'+f.color+'"></span><div><div class="fname">'+f.name+'</div><div class="fcount">'+n+' registro'+(n===1?'':'s')+'</div></div></div>';}).join('');
    h+='</div>';$('#view-decl').innerHTML=h;return;
  }
  const f=FOLDERS.find(x=>x.id===declFolder), tipos=djTipos();
  let h='<div class="view-head"><div><button class="fback" onclick="closeFolder()">← Declaraciones</button><h2>'+f.ico+' '+f.name+' <span style="color:var(--muted);font-weight:400">'+declYear()+'</span></h2></div><span style="display:flex;gap:8px;align-items:center">'+yb+expBtns('decl',declFolder)+'<button class="btn btn-primary" onclick="openForm(\'dj\')">+ Nueva</button></span></div>';
  h+='<div class="toolbar"><div class="search"><input placeholder="Buscar cliente, tipo o nota…" value="'+esc(declQ)+'" oninput="declQ=this.value;renderDeclTable()"></div>'
    +'<select class="filt" onchange="declEst=this.value;renderDeclTable()"><option value="">Todos los estados</option>'+['Pendiente','En proceso','Presentada'].map(e=>'<option'+(e===declEst?' selected':'')+'>'+e+'</option>').join('')+'</select>'
    +'<select class="filt" onchange="declTipo=this.value;renderDeclTable()"><option value="">Todos los tipos</option>'+tipos.map(t=>'<option'+(t===declTipo?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div>';
  h+='<div class="table-wrap" id="dj-table"></div>';
  $('#view-decl').innerHTML=h; renderDeclTable();
}
function renderDeclTable(){
  const rows=declFiltered();
  const body=rows.length?rows.map(d=>'<tr>'
    +'<td style="width:34px;text-align:center"><span class="chk '+(d.hecho?'on':'')+'" onclick="toggleDjHecho(\''+d.id+'\')">'+(d.hecho?'✓':'')+'</span></td>'
    +'<td><div class="name-cell">'+cliInput(cliNameOr(d.clienteId),'djSetCli(\''+d.id+'\',this.value)')+(d.clienteId?'<button class="go-cli" title="Ver la ficha del cliente" onclick="goCli(\''+d.clienteId+'\')">↗</button>':'')+'</div></td>'
    +'<td style="min-width:170px">'+cellIn('dj',d.id,'tipoDj',d.tipoDj,{ph:'Escribí el tipo de DJ…',cls:'boxed'})+'</td>'
    +'<td>'+cellIn('dj',d.id,'venc',d.venc,{type:'date'})+'</td>'
    +'<td>'+cellIn('dj',d.id,'presentada',d.presentada,{type:'date'})+'</td>'
    +'<td>'+cellIn('dj',d.id,'importe',d.importe,{cls:'num',ph:'$'})+'</td>'
    +'<td>'+cellIn('dj',d.id,'medio',d.medio,{list:'dl-medio'})+'</td>'
    +'<td>'+cellIn('dj',d.id,'fechaPago',d.fechaPago,{type:'date'})+'</td>'
    +'<td>'+clkEst('dj',d.id,d.estado,['Pendiente','En proceso','Presentada'])+'</td>'
    +'<td>'+cellIn('dj',d.id,'notas',d.notas,{ph:'+ nota'})+'</td>'
    +'<td>'+actions('dj',d.id)+'</td></tr>').join('') : emptyRow(11,(declQ||declEst||declTipo)?'Ningún registro coincide con el filtro.':'Sin registros en esta carpeta para '+declYear()+'.');
  $('#dj-table').innerHTML='<table style="min-width:1150px"><thead><tr><th>Hecho</th><th>Cliente</th><th>Tipo de DJ</th><th>Vencimiento</th><th>Presentada</th><th>Importe</th><th>Medio</th><th>Fecha pago</th><th>Estado</th><th>Notas</th><th></th></tr></thead><tbody>'+body+'</tbody></table>';
}
function djSetCli(id,nombre){const d=Store.get('dj',id);if(!d)return;d.clienteId=ensureCli(nombre);Store.upsert('dj',d);renderDeclTable();}
function openFolder(id){declFolder=id;declQ='';declEst='';declTipo='';renderDecl();}
function closeFolder(){declFolder=null;renderDecl();}
function toggleDjHecho(id){const o=Store.get('dj',id);o.hecho=!o.hecho;if(o.hecho){o.estado='Presentada';if(!o.presentada)o.presentada=today();}Store.upsert('dj',o);renderDeclTable();}
