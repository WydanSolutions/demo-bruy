/*
 * Sección: Información de clientes.
 * Los tipos de cliente se pueden agregar, renombrar y borrar (botón "⚙ Tipos").
 */
/* ===== CLIENTES (expediente) ===== */
var cliView='panel', cliSel=null, cliShow={}, _clarch='act';
var _clq='', _clt='';
const CLI_CRED_MAP={pb:'passBps',pg:'passGub',cg:'codGub'};
let _cliCopySeq=0, _cliUiDelegado=false;

function setCliView(v){ cliView=v; renderCliBody(); }
function selectCli(id){ cliSel=id; cliShow={}; renderCliBody(); }
function cliArchive(id){var c=Store.get('clientes',id);if(!c)return;c.archivado=!c.archivado;Store.upsert('clientes',c);toast(c.archivado?'Cliente archivado':'Cliente reactivado');renderClientes();}
function setCliArch(v){_clarch=v;cliSel=null;renderCliBody();}
function cliShowToggle(k){ cliShow[k]=!cliShow[k]; renderCliBody(); }
function _cliCredKey(k){ return Object.prototype.hasOwnProperty.call(CLI_CRED_MAP,k)?CLI_CRED_MAP[k]:null; }
function _cliCtxVigente(btn,id,key,ses){
  const root=document.getElementById('view-clientes');
  if(!root||!btn||!btn.isConnected||!root.contains(btn))return false;
  if(typeof Sesion!=='undefined'&&Sesion.gen!==ses)return false;
  if(!Boveda||typeof Boveda.abierta!=='function'||!Boveda.abierta())return false;
  const campo=_cliCredKey(key);
  if(!campo)return false;
  const cli=Store.get('clientes',id);
  if(!cli)return false;
  if(Boveda.bloqueado&&Boveda.bloqueado(cli))return false;
  return true;
}
async function cliCopy(txt,opt){
  const cfg=(opt&&typeof opt==='object')?opt:{};
  const val=(txt==null)?'':String(txt);
  const isValid=(typeof cfg.isValid==='function')?cfg.isValid:function(){ return true; };
  const seq=++_cliCopySeq;
  if(!isValid())return false;

  let writeText=null;
  try{ writeText=navigator&&navigator.clipboard&&navigator.clipboard.writeText; }
  catch(e){ writeText=null; }
  if(typeof writeText!=='function'){
    if(isValid())toast('No se pudo copiar');
    return false;
  }

  let p;
  try{ p=writeText.call(navigator.clipboard,val); }
  catch(e){
    if(isValid())toast('No se pudo copiar');
    return false;
  }

  try{ await p; }
  catch(e){
    if(isValid())toast('No se pudo copiar');
    return false;
  }

  if(seq!==_cliCopySeq)return true;
  if(isValid())toast('Copiado');
  return true;
}

function cliInitDelegacion(){
  if(_cliUiDelegado)return;
  _cliUiDelegado=true;
  const root=document.getElementById('view-clientes');
  if(!root)return;

  root.addEventListener('click',async function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('[data-cli-action]'):null;
    if(!btn||!root.contains(btn))return;
    const act=btn.getAttribute('data-cli-action')||'';
    const id=btn.getAttribute('data-cli-id')||'';

    if(act==='select'){ selectCli(id); return; }
    if(act==='archive'){ cliArchive(id); return; }
    if(act==='edit'){ openForm('cliente',id); return; }
    if(act==='cred-toggle'){
      const key=btn.getAttribute('data-cred-key')||'';
      if(!_cliCredKey(key))return;
      cliShowToggle(key);
      return;
    }
    if(act==='cred-copy'){
      const key=btn.getAttribute('data-cred-key')||'';
      const campo=_cliCredKey(key);
      const ses=(typeof Sesion!=='undefined')?Sesion.gen:0;
      if(!_cliCtxVigente(btn,id,key,ses))return;
      const cli=Store.get('clientes',id);
      if(!cli)return;
      const valor=cli[campo];
      if(!valor)return;
      await cliCopy(valor,{isValid:function(){ return _cliCtxVigente(btn,id,key,ses); }});
    }
  });
}

function cliInitials(n){ return (n||'?').split(/[ ,]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function renderClientes(){
  cliInitDelegacion();
  const act=Store.all('clientes').filter(function(c){return !c.archivado;}).length;
  const arch=Store.all('clientes').filter(function(c){return c.archivado;}).length;
  let h='<div class="view-head"><div><h2>👥 Información de Clientes</h2><div class="sub">'+act+' activo'+(act===1?'':'s')+' · '+arch+' archivado'+(arch===1?'':'s')+'</div></div><span style="display:flex;gap:8px">'+expBtns('clientes')+'<button class="btn btn-primary" onclick="openForm(\'cliente\')">+ Nuevo cliente</button></span></div>';
  h+='<div class="toolbar"><span class="gseg"><button class="gv'+(cliView==='panel'?' active':'')+'" onclick="setCliView(\'panel\')">🗂 Panel</button><button class="gv'+(cliView==='dir'?' active':'')+'" onclick="setCliView(\'dir\')">▤ Directorio</button></span>'
    +'<div class="search"><input id="cl-q" placeholder="Buscar cliente…" value="'+esc(_clq)+'" oninput="_clq=this.value;renderCliBody()"></div>'
    +'<select class="filt" id="cl-t" onchange="_clt=this.value;renderCliBody()"><option value="">Todos los tipos</option>'+cliTipos().map(x=>'<option'+(x===_clt?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>'
    +cliTiposBtn()
    +'<span class="gseg"><button class="gv'+(_clarch==='act'?' active':'')+'" onclick="setCliArch(\'act\')">Activos</button><button class="gv'+(_clarch==='arch'?' active':'')+'" onclick="setCliArch(\'arch\')">Archivados</button></span></div>';
  h+='<div id="cl-body"></div>';
  $('#view-clientes').innerHTML=h; renderCliBody();
}
function _cliFiltered(){ return Store.all('clientes').slice().sort((a,b)=>a.nombre.localeCompare(b.nombre)).filter(c=>{ if((_clarch==='arch')!==(!!c.archivado))return false; if(_clt&&c.tipo!==_clt)return false; if(_clq&&!c.nombre.toLowerCase().includes(_clq.toLowerCase()))return false; return true;}); }
function renderCliBody(){
  const rows=_cliFiltered();
  if(cliView==='dir'){
    const body=rows.length?rows.map(c=>{const nd=Store.all('dj').filter(d=>d.clienteId===c.id).length;return '<tr><td><div class="cli-name">'+esc(c.nombre)+'</div></td><td>'+(c.tipo?'<span class="tag">'+esc(c.tipo)+'</span>':'—')+'</td><td class="muted-cell">'+esc(c.rut||c.ci||'—')+'</td><td class="muted-cell">'+esc(c.whatsapp||c.correo||'—')+'</td><td class="muted-cell">'+nd+' DJ</td><td>'+actions('cliente',c.id)+'</td></tr>';}).join(''):emptyRow(6,'Sin clientes.');
    $('#cl-body').innerHTML='<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>RUT / CI</th><th>Contacto</th><th>DJ</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>';
    return;
  }
  if(!rows.length){ $('#cl-body').innerHTML='<div class="empty"><div class="e-ico">👥</div><p>Sin clientes.</p></div>'; return; }
  if(!cliSel||!rows.find(r=>r.id===cliSel)) cliSel=rows[0].id;
  const list=rows.map(c=>'<div class="exp-item'+(c.id===cliSel?' active':'')+'" data-cli-action="select" data-cli-id="'+esc(c.id)+'"><span class="exp-av">'+cliInitials(c.nombre)+'</span><div><div class="exp-iname">'+esc(c.nombre)+'</div>'+(c.tipo?'<div class="exp-itag">'+esc(c.tipo)+'</div>':'')+'</div></div>').join('');
  const c=Store.get('clientes',cliSel);
  const F=(l,v)=>'<div class="exp-f"><div class="exp-fl">'+l+'</div><div class="exp-fv">'+(v?esc(v):'—')+'</div></div>';
  const cred=(l,v,k)=>{const shown=cliShow[k];return '<div class="exp-f"><div class="exp-fl">'+l+'</div><div class="cred-row">'+(v?'<span class="cred-v">'+(shown?esc(v):'••••••••')+'</span><button class="cred-b" data-cli-action="cred-toggle" data-cli-id="'+esc(c.id)+'" data-cred-key="'+esc(k)+'" title="Ver">'+(shown?'🙈':'👁')+'</button><button class="cred-b" data-cli-action="cred-copy" data-cli-id="'+esc(c.id)+'" data-cred-key="'+esc(k)+'" title="Copiar">⧉</button>':'<span class="exp-fv">—</span>')+'</div></div>';};
  const wa=c.whatsapp?'<a class="wa-pill" href="https://wa.me/598'+esc(c.whatsapp.replace(/\D/g,''))+'" target="_blank">🟢 '+esc(c.whatsapp)+'</a>':'—';
  const detail='<div class="exp-detail" data-cli-id="'+esc(c.id)+'"><div class="exp-dhead"><span class="exp-av big">'+cliInitials(c.nombre)+'</span><div style="flex:1"><div class="exp-dname">'+esc(c.nombre)+'</div>'+(c.tipo?'<span class="tag">'+esc(c.tipo)+'</span>':'')+'</div><button class="btn btn-sm" data-cli-action="archive" data-cli-id="'+esc(c.id)+'">'+(c.archivado?'♻ Reactivar':'🗄 Archivar')+'</button><button class="btn btn-sm" data-cli-action="edit" data-cli-id="'+esc(c.id)+'">✎ Editar</button></div>'
    +'<div class="exp-sec"><div class="exp-st">🪪 Identificación</div><div class="exp-grid">'+F('RUT',c.rut)+F('BPS',c.bps)+F('CI',c.ci)+F('F. NAC.',c.fnac?fDate(c.fnac):'')+'</div></div>'
    +'<div class="exp-sec"><div class="exp-st">🔑 Credenciales</div>'+(Boveda.bloqueado(c)
      ?'<div class="cred-lock">🔒 Protegidas con tu clave de seguridad <button class="btn btn-sm" onclick="Boveda.pedir()">🔓 Ver credenciales</button></div>'
      :'<div class="exp-grid">'+cred('Contraseña BPS',c.passBps,'pb')+cred('Contraseña gub.uy',c.passGub,'pg')+'</div>'+F('Códigos gub.uy',c.codGub))+'</div>'
    +'<div class="exp-sec"><div class="exp-st">📇 Contacto</div><div class="exp-grid"><div class="exp-f"><div class="exp-fl">WhatsApp</div><div class="exp-fv">'+wa+'</div></div>'+F('Correo',c.correo)+F('Dirección',c.direccion)+F('Otros',c.fosmetal)+'</div>'+(c.otros?F('Observaciones',c.otros):'')+(c.notas?F('Notas',c.notas):'')+'</div></div>';
  $('#cl-body').innerHTML='<div class="exp-wrap"><div class="exp-list">'+list+'</div>'+detail+'</div>';
}

/* ===== Tipos de cliente (editables) ===== */
function cliTipos(){ if(!Array.isArray(Store.data.cliTipos))Store.data.cliTipos=CLI_TIPOS_DEF.slice(); return Store.data.cliTipos; }
function cliTipoAddName(n){ n=(n||'').trim(); if(n&&cliTipos().indexOf(n)<0){cliTipos().push(n);Store.save();} }
function cliTiposBtn(){
  var items=cliTipos().map(function(t,i){var n=Store.all('clientes').filter(function(c){return c.tipo===t;}).length;return '<div class="cfg-row"><span>'+esc(t)+' <span class="muted-cell" style="font-weight:400">('+n+')</span></span><span style="display:flex;gap:2px"><button class="btn-ghost" title="Cambiar el nombre de este tipo" onclick="cliTipoEdit('+i+')">✎ Modificar</button><button class="cfg-x" title="Borrar" onclick="cliTipoDel('+i+')">×</button></span></div>';}).join('');
  return '<span style="position:relative;display:inline-block"><button class="btn btn-sm" onclick="cliTiposMenu(event)">⚙ Tipos</button><div class="pxcfg" id="clitiposcfg" style="min-width:280px;max-height:360px;overflow:auto" onclick="event.stopPropagation()"><div class="pt">Tipos de cliente</div>'+items
    +'<div class="pt" style="margin-top:10px">Agregar tipo</div><div class="colrow"><input id="newtipo" class="col-name" placeholder="Ej: SAS, Cooperativa…" onkeydown="if(event.key===\'Enter\')cliTipoAdd()"><button class="btn btn-sm btn-primary" onclick="cliTipoAdd()">Agregar</button></div>'
    +'<div class="muted-cell" style="font-size:11px;margin-top:6px">Si renombrás un tipo, se actualiza en todos los clientes que lo tienen.</div></div></span>';
}
function cliTiposMenu(e){e.stopPropagation();var el=document.getElementById('clitiposcfg');if(el)el.classList.toggle('open');}
function cliTiposReopen(){var el=document.getElementById('clitiposcfg');if(el)el.classList.add('open');}
function cliTipoAdd(){var i=document.getElementById('newtipo');cliTipoAddName(i&&i.value);renderClientes();cliTiposReopen();}
function cliTipoEdit(i){var old=cliTipos()[i];pedirTexto('Renombrar tipo','Nuevo nombre para «'+old+'»',old,'Guardar',function(v){cliTipoRename(i,v);});}
function cliTipoRename(i,v){v=(v||'').trim();var old=cliTipos()[i];if(!v||v===old){renderClientes();cliTiposReopen();return;}cliTipos()[i]=v;Store.all('clientes').forEach(function(c){if(c.tipo===old)c.tipo=v;});if(_clt===old)_clt=v;Store.save();renderClientes();cliTiposReopen();}
function cliTipoDel(i){var t=cliTipos()[i];var n=Store.all('clientes').filter(function(c){return c.tipo===t;}).length;if(!confirm('¿Borrar el tipo «'+t+'»?'+(n?' '+n+' cliente'+(n===1?'':'s')+' quedarían sin tipo.':'')))return;cliTipos().splice(i,1);Store.all('clientes').forEach(function(c){if(c.tipo===t)c.tipo='';});if(_clt===t)_clt='';Store.save();renderClientes();cliTiposReopen();}
document.addEventListener('click',function(){var s=document.getElementById('clitiposcfg');if(s)s.classList.remove('open');});
