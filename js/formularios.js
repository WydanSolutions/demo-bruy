/*
 * Formularios (ventana modal): alta/edición, perfil y seguridad.
 * Los campos de cliente se autocompletan con Info. Clientes; si el nombre no existe, se crea.
 */
/* ===== FORMULARIOS ===== */
const FORMS={
  cliente:{col:'clientes',title:'Cliente',fields:[
    {k:'nombre',l:'Nombre / Razón social',t:'text',req:true},
    {k:'tipo',l:'Tipo',t:'clitipo'},
    {k:'rut',l:'RUT',t:'text',half:true},{k:'bps',l:'BPS',t:'text',half:true},
    {k:'ci',l:'CI',t:'text',half:true},{k:'fnac',l:'Fecha nac.',t:'date',half:true},
    {k:'passBps',l:'Contraseña BPS',t:'text',half:true},{k:'passGub',l:'Contraseña gub.uy',t:'text',half:true},
    {k:'codGub',l:'Códigos gub.uy',t:'text'},
    {k:'whatsapp',l:'WhatsApp',t:'text',half:true},{k:'correo',l:'Correo',t:'text',half:true},
    {k:'direccion',l:'Dirección',t:'text',half:true},{k:'fosmetal',l:'Otros',t:'text',half:true},
    {k:'otros',l:'Observaciones',t:'textarea'},{k:'notas',l:'Notas',t:'textarea'} ]},
  dj:{col:'dj',title:'Declaración',fields:[
    {k:'clienteId',l:'Cliente',t:'cliinput',req:true},
    {k:'tipoDj',l:'Tipo de DJ',t:'text',half:true},{k:'estado',l:'Estado',t:'select',opts:['Pendiente','En proceso','Presentada'],half:true},
    {k:'venc',l:'Vencimiento',t:'date',half:true},{k:'presentada',l:'Presentada (fecha)',t:'date',half:true},
    {k:'importe',l:'Importe',t:'text',half:true},{k:'medio',l:'Medio de pago',t:'datalist',list:'dl-medio',half:true},
    {k:'fechaPago',l:'Fecha de pago',t:'date'},
    {k:'notas',l:'Notas',t:'textarea'} ]},
  tarea:{col:'tareas',title:'Tarea extra',fields:[
    {k:'tarea',l:'Tarea',t:'datalist',list:'dl-tareas',req:true},
    {k:'clienteId',l:'Cliente (opcional)',t:'cliinput'},
    {k:'etiqueta',l:'Etiqueta',t:'datalist',list:'dl-etq',half:true},{k:'urgencia',l:'Urgencia',t:'select',opts:['Baja','Media','Alta'],half:true},
    {k:'plazo',l:'Plazo / entrega',t:'date',half:true},{k:'estado',l:'Estado',t:'select',opts:['Pendiente','En proceso','Hecha'],half:true},
    {k:'info',l:'Info / detalle de la tarea',t:'textarea'} ]},
};
let curForm={form:null,id:null};
function sesBloqueadaEdicion(){
  if(typeof Sesion!=='undefined'&&Sesion.uiBloqueada){ toast('Esperá: se está cerrando la sesión'); return true; }
  return false;
}
function pedirBovedaYReabrirCliente(id){
  const cliId=id||'';
  const ses=(typeof Sesion!=='undefined')?Sesion.gen:0;
  Boveda.pedir(function(){
    if(typeof Sesion!=='undefined'&&Sesion.gen!==ses)return;
    if(cliId)openForm('cliente',cliId);
    else openForm('cliente');
  });
}

/* Ventana chica para pedir UN texto (el nombre de un tipo, por ejemplo).
   Reemplaza al prompt() del navegador: esa ventanita gris no se parece en nada al resto de
   la página y en varios celulares se porta mal, igual que pasaba con las listas desplegables.
   Uso: pedirTexto('Título','Etiqueta', valorInicial, 'Texto del botón', function(valor){ ... }) */
let _textoLuego=null;
function pedirTexto(titulo,label,valor,boton,alGuardar){
  if(sesBloqueadaEdicion())return;
  _textoLuego=alGuardar; curForm={form:'texto'};
  $('#modal-title').textContent=titulo;
  $('#modal-del').style.display='none';
  $('#modal-body').innerHTML='<div class="field"><label>'+esc(label)+'</label>'
    +'<input type="text" id="texto-uno" value="'+esc(valor||'')+'" onkeydown="if(event.key===\'Enter\')saveForm()"></div>';
  const b=$('#modal .modal-foot .btn-primary'); if(b)b.textContent=boton||'Guardar';
  $('#modal').classList.add('open');
  setTimeout(function(){ const i=document.getElementById('texto-uno'); if(i){ i.focus(); i.select(); } },60);
}
function openForm(form,id){
  if(sesBloqueadaEdicion())return;
  if(form.startsWith('grid:')){ openGridRow(form.split(':')[1],id); return; }
  const cfg=FORMS[form]; curForm={form,id:id||null,folder:declFolder};
  const o=id?Object.assign({},Store.get(cfg.col,id)):{};
  $('#modal-title').textContent=(id?'Editar · ':'Nuevo · ')+cfg.title; $('#modal-del').style.display=id?'inline-flex':'none';
  let html='';
  for(let i=0;i<cfg.fields.length;i++){const f=cfg.fields[i];
    if(f.half&&cfg.fields[i+1]&&cfg.fields[i+1].half){html+='<div class="field-2">'+fieldHtml(f,o)+fieldHtml(cfg.fields[i+1],o)+'</div>';i++;}
    else html+=fieldHtml(f,o);}
  $('#modal-body').innerHTML=html; $('#modal').classList.add('open');
}
function fieldHtml(f,o){
  // Credenciales cifradas: si la bóveda está cerrada no se muestran (se desbloquean con la clave de seguridad).
  // Sin la bóveda abierta tampoco se pueden cargar credenciales nuevas (no se podrían cifrar y se perderían).
  if(CREDS.indexOf(f.k)>=0&&!Boveda.abierta()){
    if(f.k!=='passBps')return '';
    var cliId=o.id?esc(o.id):'';
    return Boveda.existe()
      ?'<div class="field cred-lock">🔒 Credenciales protegidas <button class="btn btn-sm" type="button" data-boveda-reopen="1" data-cli-id="'+cliId+'">🔓 Desbloquear para verlas o editarlas</button></div>'
      :'<div class="field cred-lock">🔐 Para guardar contraseñas de clientes, primero creá tu clave de seguridad <button class="btn btn-sm" type="button" data-boveda-reopen="1" data-cli-id="'+cliId+'">Crear clave</button></div>';
  }
  const v=o[f.k]!==undefined?o[f.k]:''; const lab='<label>'+f.l+(f.req?' <span class="req">*</span>':'')+'</label>';
  let inp='';
  if(f.t==='textarea')inp='<textarea data-k="'+f.k+'">'+esc(v)+'</textarea>';
  else if(f.t==='select')inp='<select data-k="'+f.k+'">'+f.opts.map(x=>'<option'+(x===v?' selected':'')+'>'+x+'</option>').join('')+'</select>';
  else if(f.t==='cliinput'){const nm=f.k==='clienteId'?cliNameOr(v):(cliNameOr(o.clienteId)||v);inp='<input data-k="'+f.k+'" list="dl-clientes" autocomplete="off" value="'+esc(nm)+'" placeholder="Empezá a escribir y elegí de la lista…">';}
  // Tipo de cliente: lista con los tipos existentes (se puede cambiar libremente) + opción para agregar uno nuevo.
  else if(f.t==='clitipo'){const ts=cliTipos().slice();if(v&&ts.indexOf(v)<0)ts.push(v);inp='<select data-k="'+f.k+'" onchange="document.getElementById(\'tipo-nuevo\').classList.toggle(\'hidden\',this.value!==\'__nuevo\')"><option value="">— Sin tipo —</option>'+ts.map(x=>'<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(x)+'</option>').join('')+'<option value="__nuevo">➕ Agregar un tipo nuevo…</option></select><input id="tipo-nuevo" class="hidden" style="margin-top:6px" placeholder="Nombre del tipo nuevo (ej: SAS)"><div class="muted-cell" style="font-size:11px;margin-top:4px">Para cambiar el nombre de un tipo o borrarlo: botón «⚙ Tipos» en Info. Clientes.</div>';}
  else if(f.t==='datalist')inp='<input data-k="'+f.k+'" list="'+f.list+'" value="'+esc(v)+'" autocomplete="off">';
  else if(f.t==='date')inp='<input type="date"'+(f.k==='fnac'?DR_NAC:DR)+' data-k="'+f.k+'" value="'+esc(v)+'">';
  else if(f.t==='check')return '<div class="field"><label style="font-weight:400;display:flex;align-items:center;gap:8px"><input type="checkbox" data-k="'+f.k+'" '+(v?'checked':'')+' style="width:auto"> '+f.checkLabel+'</label></div>';
  else inp='<input type="text" data-k="'+f.k+'" value="'+esc(v)+'">';
  return '<div class="field">'+lab+inp+'</div>';
}
function saveForm(){
  if(sesBloqueadaEdicion())return;
  if(curForm.form==='noop'){closeModal();return;}
  if(curForm.form==='texto'){
    var _ti=document.getElementById('texto-uno'), _tv=_ti?(_ti.value||'').trim():'';
    if(!_tv){ toast('Escribí un nombre'); if(_ti)_ti.focus(); return; }
    var _tf=_textoLuego; _textoLuego=null; closeModal(); if(_tf)_tf(_tv); return;
  }
  if(curForm.form&&curForm.form.startsWith('boveda-')){Boveda.guardarModal();return;}
  if(!modalDatesOk())return;
  if(curForm.form==='honcli'){honCliSave();return;}
  if(curForm.form==='honmes'){honMesSave();return;}   // un mes suelto, desde la vista anual de Honorarios
  if(curForm.form==='gasto'){gastoSave();return;}
  if(curForm.form==='note'){var tx=document.getElementById('note-ta').value.trim();if(!tx){toast('Escribí algo en la nota');return;}var nn=curForm.id?Store.get('notes',curForm.id):{id:'n'+Date.now(),date:today()};nn.text=tx;nn.color=_noteColor;if(!curForm.id){Store.data.notes.push(nn);}Store.save();closeModal();renderPanel();toast('Nota guardada');return;}
  // Celda de Empresas / Serv. Profesionales. Ojo: guardar el gid ANTES de closeModal() (que borra curForm);
  // antes se perdía y la tabla no se redibujaba hasta cambiar de pestaña (el "delay" del ✈ Enviado).
  if(curForm.form==='cell'){var cgid=curForm.gid,g=gridRow(cgid,curForm.rid);if(g){var cc={};$('#modal-body').querySelectorAll('[data-k]').forEach(function(e){cc[e.dataset.k]=e.type==='checkbox'?e.checked:e.value;});if(cc.enviado&&cc.estado!=='na')cc.estado='done';if(cc.estado==='done'&&!cc.fecha&&!cc.etiqueta)cc.fecha=today();if(cc.enviado&&!cc.fechaEnvio)cc.fechaEnvio=today();g.cells[ck(curForm.mi)]=cc;Store.save();}closeModal();renderGrid(cgid);toast('Guardado');return;}
  if(curForm.form==='perfil'){var po={};$('#modal-body').querySelectorAll('[data-k]').forEach(function(e){po[e.dataset.k]=e.value;});po.foto=(_perfilFoto!==undefined)?_perfilFoto:((Store.data.perfil&&Store.data.perfil.foto)||'');Store.data.perfil=po;Store.data.brand={name:po.nombre,sub:po.profesion};Store.save();applyBrand();applyAvatar();closeModal();toast('Perfil guardado');return;}
  // grilla (Empresas / Serv. Profesionales)
  if(curForm.form&&curForm.form.startsWith('grid:')){
    const gid=curForm.gid; const o={}; $('#modal-body').querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.value);
    o.nombre=(o.nombre||'').trim(); if(!o.nombre){toast('Falta el nombre');return;}
    if(gid==='empresas'&&o.tipo&&(Store.data.empTipos||[]).indexOf(o.tipo)<0){Store.data.empTipos.push(o.tipo);}
    const cid=ensureCli(o.nombre,GRID_META[gid].cliTipo), arr=Store.data.grids[gid].rows;
    if(curForm.id){const r=arr.find(x=>x.id===curForm.id);r.nombre=o.nombre;r.clienteId=cid;if(o.tipo!==undefined)r.tipo=o.tipo;}
    else arr.push({id:'g'+Date.now(),nombre:o.nombre,clienteId:cid,tipo:o.tipo||'',cells:{}});
    Store.save(); closeModal(); renderGrid(gid); toast('Guardado'); return;
  }
  // calendario
  if(curForm.form==='cal'){const o={};$('#modal-body').querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.value);if(!o.titulo||!o.fecha){toast('Completá título y fecha');return;}Store.data.cal.push({id:'ev'+Date.now(),titulo:o.titulo,fecha:o.fecha});Store.save();closeModal();renderCal();toast('Evento agregado');return;}
  // entidades
  const cfg=FORMS[curForm.form]; const o=curForm.id?Object.assign({},Store.get(cfg.col,curForm.id)):{};
  $('#modal-body').querySelectorAll('[data-k]').forEach(el=>{o[el.dataset.k]=el.type==='checkbox'?el.checked:el.value;});
  let err=null;cfg.fields.filter(f=>f.req).forEach(f=>{if(!(o[f.k]||'').toString().trim())err=err||f.l;});
  if(err){toast('Falta: '+err);return;}
  cfg.fields.forEach(f=>{
    if(f.t==='cliinput'){const nm=(o[f.k]||'').trim(); if(f.k==='clienteId')o.clienteId=nm?ensureCli(nm):''; else {o[f.k]=nm;o.clienteId=nm?ensureCli(nm,f.cliTipo):'';}}
    if(f.t==='clitipo'){if(o[f.k]==='__nuevo'){const nv=document.getElementById('tipo-nuevo');o[f.k]=nv?(nv.value||'').trim():'';}cliTipoAddName(o[f.k]);}
  });
  if(curForm.form==='dj'&&!curForm.id){o.folder=curForm.folder||declFolder||'sp';o.anio=declYear();}
  const eraEdicion=!!curForm.id;
  Store.upsert(cfg.col,o); closeModal(); renderView(CUR); updateBadges(); toast(eraEdicion?'Cambios guardados':'Creado');
}
function deleteCurrent(){
  if(sesBloqueadaEdicion())return;
  if(curForm.form==='honcli'){honCliDel();return;}
  if(curForm.form==='gasto'){gastoDel();return;}
  if(curForm.form==='note'){if(confirm('¿Eliminar esta nota?')){delNote(curForm.id);closeModal();}return;}
  if(curForm.form&&curForm.form.startsWith('grid:')){const gid=curForm.gid;if(confirm('¿Eliminar esta fila?')){Store.removeGridRow(gid,curForm.id);closeModal();renderGrid(gid);toast('Eliminado');}return;}
  const cfg=FORMS[curForm.form];if(confirm('¿Eliminar este registro?')){Store.remove(cfg.col,curForm.id);closeModal();renderView(CUR);updateBadges();toast('Eliminado');}
}
function quickDel(kind,id){
  if(sesBloqueadaEdicion())return;
  if(kind.startsWith('grid:')){const gid=kind.split(':')[1];if(confirm('¿Eliminar esta fila?')){Store.removeGridRow(gid,id);renderGrid(gid);toast('Eliminado');}return;}
  const cfg=FORMS[kind];if(confirm('¿Eliminar este registro?')){Store.remove(cfg.col,id);renderView(CUR);updateBadges();toast('Eliminado');}
}
function closeModal(){
  $('#modal').classList.remove('open');
  curForm={form:null,id:null};
  _textoLuego=null;
  _perfilFoto=undefined;
  var b=$('#modal .modal-foot .btn-primary');
  if(b){b.textContent='Guardar';b.disabled=false;}
  var c=$('#modal-cancel');
  if(c)c.style.display='';
  var t=$('#modal-title');
  if(t)t.textContent='Nuevo';
  var mb=$('#modal-body');
  if(mb)mb.innerHTML='';
  if(typeof Boveda!=='undefined'&&Boveda&&typeof Boveda.modalCerrado==='function')Boveda.modalCerrado();
}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});

let _formDelegacionLista=false;
function formInitDelegacion(){
  if(_formDelegacionLista)return;
  _formDelegacionLista=true;

  const modalBody=document.getElementById('modal-body');
  if(modalBody){
    modalBody.addEventListener('click',function(ev){
      const cp=ev.target&&ev.target.closest?ev.target.closest('[data-boveda-copy-rec="1"]'):null;
      if(cp&&modalBody.contains(cp)){
        ev.preventDefault();
        if(typeof Boveda!=='undefined'&&Boveda&&typeof Boveda.copiarCodigoRecuperacion==='function')Boveda.copiarCodigoRecuperacion(cp);
        return;
      }
      const btn=ev.target&&ev.target.closest?ev.target.closest('[data-boveda-reopen="1"]'):null;
      if(!btn||!modalBody.contains(btn))return;
      ev.preventDefault();
      pedirBovedaYReabrirCliente(btn.getAttribute('data-cli-id')||'');
    });
  }

  const dd=document.getElementById('dd');
  if(dd){
    dd.addEventListener('click',function(ev){
      const btn=ev.target&&ev.target.closest?ev.target.closest('button[data-dd-status]'):null;
      if(!btn||!dd.contains(btn))return;
      const col=dd.getAttribute('data-col')||'';
      const id=dd.getAttribute('data-id')||'';
      const est=btn.getAttribute('data-dd-status')||'';
      setStatus(col,id,est);
    });
  }
}
formInitDelegacion();

/* status dropdown */
function ddStatus(ev,col,id,opts){
  ev.stopPropagation();
  const dd=$('#dd');
  dd.setAttribute('data-col',col||'');
  dd.setAttribute('data-id',id||'');
  dd.innerHTML=(opts||[]).map(o=>'<button type="button" data-dd-status="'+esc(o)+'">'+esc(o)+'</button>').join('');
  const r=ev.target.getBoundingClientRect();
  dd.style.left=Math.min(r.left,window.innerWidth-165)+'px';
  dd.style.top=(r.bottom+4)+'px';
  dd.classList.add('open');
}
function setStatus(col,id,e){const o=Store.get(col,id);if(!o)return;o.estado=e;if(col==='dj'){o.hecho=(e==='Presentada');if(e==='Presentada'&&!o.presentada)o.presentada=today();}if(col==='tareas')o.hecho=(e==='Hecha');Store.upsert(col,o);closeDD();renderView(CUR);updateBadges();}
function closeDD(){const dd=$('#dd');dd.classList.remove('open');dd.removeAttribute('data-col');dd.removeAttribute('data-id');const p=$('#pxcfg');if(p)p.classList.remove('open');}
document.addEventListener('click',closeDD);

/* menú ⋯, perfil y seguridad */
function hdrMenu(e){e.stopPropagation();$('#hdr-menu').classList.toggle('open');}
function closeHdr(){const m=$('#hdr-menu');if(m)m.classList.remove('open');}
document.addEventListener('click',()=>{const m=$('#hdr-menu');if(m)m.classList.remove('open');});
function applyBrand(){var b=Store.data.brand;if(b){var n=document.getElementById('brand-name'),s=document.getElementById('brand-sub');if(n&&b.name)n.textContent=b.name;if(s&&b.sub)s.textContent=b.sub;}applyAvatar();}
function avatarSrcSeguro(foto){
  if(typeof foto!=='string')return '';
  var src=foto.trim();
  // La política actual admite solo data URL JPEG base64 generado por canvas en perfilFoto().
  if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(src))return '';
  return src;
}
function avatarInner(foto){var src=avatarSrcSeguro(foto);return src?'<img src="'+src+'" alt="">':'L';}
function applyAvatar(){var f=(Store.data.perfil&&Store.data.perfil.foto)||'';['hdr-av','menu-av'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=avatarInner(f);});}
var _perfilFoto;
var _perfilFotoOp=0;
function perfilFoto(input){
  var file=input.files[0];
  if(!file)return;
  var op=(curForm&&curForm.form==='perfil')?curForm._perfilOp:null;
  var ses=(typeof Sesion!=='undefined')?Sesion.gen:0;
  var vigente=function(){
    if(!op)return false;
    if(!curForm||curForm.form!=='perfil'||curForm._perfilOp!==op)return false;
    if(typeof Sesion!=='undefined'&&Sesion.gen!==ses)return false;
    var m=document.getElementById('modal');
    return !!(m&&m.classList.contains('open'));
  };
  var r=new FileReader();
  r.onload=function(){
    if(!vigente())return;
    var img=new Image();
    img.onload=function(){
      if(!vigente())return;
      var c=document.createElement('canvas');var S=160;c.width=S;c.height=S;var ctx=c.getContext('2d');var m=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S);
      _perfilFoto=c.toDataURL('image/jpeg',0.85);
      var pv=document.getElementById('perfil-av');if(pv)pv.innerHTML=avatarInner(_perfilFoto);
    };
    img.src=r.result;
  };
  r.readAsDataURL(file);
}
function miPerfil(){
  if(sesBloqueadaEdicion())return;
  var pf=Store.data.perfil||{};
  curForm={form:'perfil',_perfilOp:++_perfilFotoOp};
  $('#modal-title').textContent='Mi perfil';$('#modal-del').style.display='none';_perfilFoto=undefined;
  $('#modal-body').innerHTML='<div class="mcenter"><label class="mavatar mavatar-up" id="perfil-av" title="Cambiar foto">'+avatarInner(pf.foto)+'<input type="file" accept="image/*" onchange="perfilFoto(this)"></label><div class="muted-cell" style="font-size:11px;margin-top:8px">Tocá la foto para cambiarla</div></div><div class="field"><label>Nombre</label><input data-k="nombre" value="'+esc(pf.nombre||'Laura Cabrera')+'"></div><div class="field"><label>Profesión</label><input data-k="profesion" value="'+esc(pf.profesion||'Contadora Pública')+'"></div><div class="field-2"><div class="field"><label>Correo</label><input data-k="correo" value="'+esc(pf.correo||'')+'"></div><div class="field"><label>Teléfono</label><input data-k="tel" value="'+esc(pf.tel||'')+'"></div></div><div class="muted-cell" style="font-size:12px">El nombre y la profesión se muestran en el encabezado.</div>';
  $('#modal').classList.add('open');
}
// Seguridad: "pedir contraseña al abrir" es de cada dispositivo (PC, celular); la clave de seguridad cifra las credenciales.
function seguridad(){
  if(sesBloqueadaEdicion())return;
  curForm={form:'noop'};$('#modal-title').textContent='Seguridad';$('#modal-del').style.display='none';
  var ask=pedirClaveAlAbrir(), h='<div class="srow"><div><div style="font-weight:700;font-size:13.5px">Pedir contraseña al abrir</div><div class="muted-cell" style="font-size:12px">En este dispositivo: al cerrar la página hay que volver a ingresar</div></div><label class="switch"><input type="checkbox" '+(ask?'checked':'')+' onchange="segAsk(this)"><span class="sl"></span></label></div>';
  var bt=Boveda.existe()
      ?'<button class="btn btn-sm" onclick="Boveda.pedir(function(){Boveda.modalCambiar()})">🔑 Cambiar clave</button><button class="btn btn-sm" onclick="Boveda.pedir(function(){Boveda.generarRecuperacion()})">📝 Nueva clave de recuperación</button>'+(Boveda.abierta()?'<button class="btn btn-sm" onclick="Boveda.bloquear()">🔒 Bloquear ahora</button>':'')
    :'<button class="btn btn-sm btn-primary" onclick="Boveda.pedir()">🔐 Crear clave de seguridad</button>';
  h+='<div class="srow" style="flex-direction:column;align-items:stretch"><div><div style="font-weight:700;font-size:13.5px">Clave de seguridad de credenciales '+(Boveda.existe()?(Boveda.abierta()?'<span class="pill st-done">🔓 desbloqueada</span>':'<span class="pill st-pend">🔒 bloqueada</span>'):'')+'</div><div class="muted-cell" style="font-size:12px">Cifra las contraseñas BPS y gub.uy de tus clientes. Es distinta de la contraseña de ingreso.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'+bt+'</div></div>';
  h+='<div class="muted-cell" style="font-size:12px;margin-top:14px">Si olvidás la contraseña de ingreso, usá «¿Olvidaste tu contraseña?» en la pantalla de ingreso.</div>';
  $('#modal-body').innerHTML=h;$('#modal').classList.add('open');
}
function segAsk(v){
  var el=v&&v.tagName?v:null;
  var pref=!!(el?el.checked:v);
  if(MODO_DEMO){
    Store.data.askPass=pref;
    Store.save();
    toast(pref?'Pedirá contraseña al abrir':'No pedirá contraseña en este dispositivo');
    return;
  }
  var ok=true;
  try{
    if(pref)localStorage.removeItem('bruy_askPass');
    else localStorage.setItem('bruy_askPass','no');
  }catch(e){ ok=false; }
  var efectiva=pedirClaveAlAbrir();
  if(el)el.checked=efectiva;
  if(!ok){
    toast('⚠ No se pudo guardar la preferencia en este dispositivo');
    return;
  }
  if(efectiva!==pref){
    toast('⚠ La preferencia no quedó aplicada en este dispositivo');
    return;
  }
  toast(efectiva?'Pedirá contraseña al abrir':'No pedirá contraseña en este dispositivo');
}
