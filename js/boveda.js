/*
 * Bóveda: cifra las credenciales de los clientes (contraseña BPS, contraseña gub.uy y códigos gub.uy)
 * en la computadora ANTES de guardarlas. Quedan ilegibles para cualquiera que abra el archivo guardado.
 * - Clave de seguridad: la elige la usuaria (distinta de la de ingreso). Se pide solo para ver o editar
 *   credenciales.
 * - Clave de recuperación: se muestra UNA vez al crear la bóveda. Sirve si se olvida la clave de seguridad.
 *   Si se pierden las dos, las credenciales no se pueden recuperar (el resto de los datos no se afecta).
 * - Técnica: AES-GCM 256 con una clave de datos aleatoria, envuelta con claves derivadas por PBKDF2-SHA256.
 * En esta etapa la bóveda se guarda en el navegador; cuando la página se conecte, va a Firestore.
 */
const b64=buf=>btoa(String.fromCharCode.apply(null,new Uint8Array(buf)));
const deb64=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
const REC_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normRec=s=>(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

const Boveda={
  cfg:null, clave:null, cache:new Map(), _despues:null,
  _ctxGen:0, _ctxSeq:new Map(), _cfgRev:0, _cfgStamp:'', _modalSeq:0, _modalBusy:false, _modalBusyOp:null, _bloquearRun:null,

  _connToken(){ return (Store&&typeof Store._connToken==='number')?Store._connToken:0; },
  _cancelar(msg){ const e=new Error(msg||'cancelada'); e.code='cancelada'; return e; },
  _esCancel(e){ return !!(e&&(e.code==='cancelada'||e.message==='cancelada')); },
  _secStamp(sec){ return sec?canon(sec):''; },
  _nuevaOp(grupo,form){
    const n=(this._ctxSeq.get(grupo)||0)+1;
    this._ctxSeq.set(grupo,n);
    return {grupo,seq:n,gen:this._ctxGen,conn:this._connToken(),cfgPermitidos:new Set([this._cfgStamp]),modalSeq:this._modalSeq,form:form||null,key:this.clave};
  },
  _permitirCfg(op,cfg){ if(op&&op.cfgPermitidos)op.cfgPermitidos.add(cfg?canon(cfg):''); },
  _vigente(op,opt){
    const o=opt||{};
    if(!op)return false;
    if(this._ctxGen!==op.gen)return false;
    if((this._ctxSeq.get(op.grupo)||0)!==op.seq)return false;
    if(o.conn!==false&&this._connToken()!==op.conn)return false;
    if(o.cfg&&op.cfgPermitidos&&!op.cfgPermitidos.has(this._cfgStamp))return false;
    if(o.abierta&&!this.abierta())return false;
    if(o.key&&this.clave!==op.key)return false;
    if(o.modalSeq&&this._modalSeq!==op.modalSeq)return false;
    if(o.modal){
      if(this._modalSeq!==op.modalSeq)return false;
      if(op.form&&(!curForm||curForm.form!==op.form))return false;
      const m=$('#modal');
      if(!m||!m.classList.contains('open'))return false;
    }
    if(o.cliente&&!this._clienteVigente(o.cliente,o.sec))return false;
    return true;
  },
  _asegurar(op,opt){ if(!this._vigente(op,opt))throw this._cancelar('cancelada'); },
  _asegurarOp(op,opt){
    const o=Object.assign({},opt||{});
    if(op&&op.form){
      if(o.modalSeq===undefined)o.modalSeq=true;
      if(o.modal===undefined)o.modal=true;
    }
    this._asegurar(op,o);
  },
  _invalidar(){ this._ctxGen++; this._ctxSeq.clear(); this._modalBusy=false; this._modalBusyOp=null; this._bloquearRun=null; },
  _clienteVigente(c,sec){
    if(!c||!Store||!Store.data||!Array.isArray(Store.data.clientes))return false;
    const actual=Store.data.clientes.find(x=>x&&x.id===c.id);
    if(!actual||actual!==c)return false;
    if(arguments.length>1&&actual._sec!==sec)return false;
    return true;
  },
  setConfig(o){
    const next=o?limpio(o):null;
    const stamp=next?canon(next):'';
    const cambio=stamp!==this._cfgStamp;
    this.cfg=next;
    if(cambio){ this._cfgStamp=stamp; this._cfgRev++; }
  },
  existe(){ return !!this.cfg; },
  abierta(){ return !!this.clave; },
  bloqueado(c){ return !this.abierta()&&!!(c&&c._sec); },
  necesitaPara(clientes){ return !this.abierta()&&(clientes||[]).some(c=>c._sec); },
  pendienteCredsCliente(c){
    if(!c)return false;
    const pl=canon(this._plano(c));
    const vacio=CREDS.every(k=>!c[k]);
    const prev=this.cache.get(c.id);
    if(prev){
      if(prev.pendiente){
        if(vacio)return false;
        return true;
      }
      const secActual=this._secStamp(c._sec);
      if(prev.sec&&secActual&&prev.sec!==secActual){
        if(vacio)return false;
      }
      if(prev.plano!==pl)return true;
      if(!vacio&&!c._sec)return true;
      return false;
    }
    if(vacio)return false;
    if(c._sec)return false;
    return true;
  },
  cerrar(){
    this._invalidar();
    this.clave=null; this.cache.clear();
    this._despues=null;
    if(Store.data&&Store.data.clientes)Store.data.clientes.forEach(c=>{ CREDS.forEach(k=>delete c[k]); });
  },
  async bloquear(){
    if(this._bloquearRun)return this._bloquearRun;
    if(!this.abierta())return true;
    const op=this._nuevaOp('bloquear');
    const run=(async()=>{
      try{
        const ok=await Store._flush();
        if(!this._vigente(op,{conn:true,abierta:true}))return false;
        if(ok===true){ this.cerrar(); closeModal(); renderView(CUR); toast('🔒 Credenciales bloqueadas'); return true; }
        toast('⚠ No se pudo guardar todavía. Las credenciales siguen desbloqueadas.');
        return false;
      }catch(e){
        if(!this._esCancel(e)){ console.error(e); toast('⚠ No se pudo bloquear ahora.'); }
        return false;
      }finally{
        if(this._bloquearRun===run)this._bloquearRun=null;
      }
    })();
    this._bloquearRun=run;
    return run;
  },

  /* ----- criptografía ----- */
  async _kek(secreto,sal,iter){
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(secreto),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:deb64(sal),iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  },
  async _enc(key,bytes){ const iv=crypto.getRandomValues(new Uint8Array(12)); return {iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes))}; },
  async _dec(key,blob){ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64(blob.iv)},key,deb64(blob.ct))); },
  async _importar(raw){ return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},true,['encrypt','decrypt']); },
  async _cifrar(texto){ return this._enc(this.clave,new TextEncoder().encode(texto)); },
  async _descifrar(blob){ return JSON.parse(new TextDecoder().decode(await this._dec(this.clave,blob))); },
  _sal(){ return b64(crypto.getRandomValues(new Uint8Array(16))); },
  _codigoRec(){ const r=crypto.getRandomValues(new Uint8Array(24)); let s=''; r.forEach((b,i)=>{ s+=REC_ABC[b%32]; if(i%4===3&&i<23)s+='-'; }); return s; },

  /* ----- operaciones ----- */
  async crear(clave,opExistente){
    const op=opExistente||this._nuevaOp('vault');
    this._asegurarOp(op,{conn:true,cfg:true});
    const iter=310000, sal=this._sal(), salRec=this._sal();
    const datos=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
    this._asegurarOp(op,{conn:true,cfg:true});
    const raw=new Uint8Array(await crypto.subtle.exportKey('raw',datos)), rec=this._codigoRec();
    this._asegurarOp(op,{conn:true,cfg:true});
    const cfg={v:1,iter,sal,salRec,creada:Date.now(),
      envClave:await this._enc(await this._kek(clave,sal,iter),raw),
      envRec:await this._enc(await this._kek(normRec(rec),salRec,iter),raw)};
    this._permitirCfg(op,cfg);
    // No se puede crear una bóveda encima de otra: las contraseñas guardadas quedarían ilegibles.
    if(MODO_DEMO){
      if(Store.data.boveda)throw new Error('ya-existe');
      this._asegurarOp(op,{conn:true,cfg:true});
      Store.data.boveda=cfg;
      Store._escribir();
    } else {
      // En la nube se comprueba y se escribe en una sola operación, para que no queden dos a la vez.
      const ref=fbDb.doc('config/boveda');
      this._asegurarOp(op,{conn:true,cfg:true});
      await fbDb.runTransaction(async t=>{
        this._asegurarOp(op,{conn:true,cfg:true});
        const s=await t.get(ref);
        this._asegurarOp(op,{conn:true,cfg:true});
        if(s.exists)throw new Error('ya-existe');
        this._asegurarOp(op,{conn:true,cfg:true});
        t.set(ref,cfg);
      });
      this._asegurarOp(op,{conn:true,cfg:true});
    }
    this._asegurarOp(op,{conn:true,cfg:true});
    this.setConfig(cfg); this.clave=datos; this.cache.clear();
    return rec;
  },
  async abrir(clave,opExistente){
    const op=opExistente||this._nuevaOp('vault');
    const cfg=this.cfg;
    if(!cfg)throw new Error('sin-config');
    let raw;
    try{
      raw=await this._dec(await this._kek(clave,cfg.sal,cfg.iter),cfg.envClave);
      this._asegurarOp(op,{conn:true,cfg:true});
    }catch(e){
      if(this._esCancel(e))throw e;
      throw new Error('clave-incorrecta');
    }
    const key=await this._importar(raw);
    this._asegurarOp(op,{conn:true,cfg:true});
    this.clave=key; op.key=key;
    await this.descifrarTodos(op);
  },
  async recuperar(rec,nueva,opExistente){
    const op=opExistente||this._nuevaOp('vault');
    const cfg=this.cfg;
    if(!cfg)throw new Error('sin-config');
    let raw;
    try{
      raw=await this._dec(await this._kek(normRec(rec),cfg.salRec,cfg.iter),cfg.envRec);
      this._asegurarOp(op,{conn:true,cfg:true});
    }catch(e){
      if(this._esCancel(e))throw e;
      throw new Error('rec-incorrecta');
    }
    const sal=this._sal(), envClave=await this._enc(await this._kek(nueva,sal,cfg.iter),raw);
    await this._guardarCfg({sal,envClave},op,cfg);
    const key=await this._importar(raw);
    this._asegurarOp(op,{conn:true,cfg:true});
    this.clave=key; op.key=key;
    await this.descifrarTodos(op);
  },
  async cambiarClave(nueva,opExistente){
    const op=opExistente||this._nuevaOp('vault');
    const cfg=this.cfg;
    if(!cfg||!this.clave)throw new Error('sin-clave');
    const raw=new Uint8Array(await crypto.subtle.exportKey('raw',this.clave)), sal=this._sal();
    this._asegurarOp(op,{conn:true,cfg:true,abierta:true,key:true});
    const envClave=await this._enc(await this._kek(nueva,sal,cfg.iter),raw);
    await this._guardarCfg({sal,envClave},op,cfg);
  },
  async nuevaRecuperacion(opExistente){
    const op=opExistente||this._nuevaOp('vault');
    const cfg=this.cfg;
    if(!cfg||!this.clave)throw new Error('sin-clave');
    const raw=new Uint8Array(await crypto.subtle.exportKey('raw',this.clave)), salRec=this._sal(), rec=this._codigoRec();
    this._asegurarOp(op,{conn:true,cfg:true,abierta:true,key:true});
    const envRec=await this._enc(await this._kek(normRec(rec),salRec,cfg.iter),raw);
    await this._guardarCfg({salRec,envRec},op,cfg);
    return rec;
  },
  async descifrarTodos(opExistente){
    const op=opExistente||this._nuevaOp('descifrar');
    this._asegurarOp(op,{conn:true,abierta:true,key:!!opExistente,cfg:!!opExistente});
    for(const c of (Store.all('clientes')||[])){
      if(!c._sec)continue;
      const sec=c._sec;
      try{
        const pl=await this._descifrar(sec);
        if(!this._vigente(op,{conn:true,abierta:true,key:!!opExistente,cfg:!!opExistente,cliente:c,sec}))continue;
        this._aplicar(c,pl);
      }catch(e){
        if(this._esCancel(e))throw e;
        if(this._vigente(op,{conn:true}))console.error('No se pudo descifrar',c.id,e);
      }
    }
  },
  _aplicar(c,pl){ CREDS.forEach(k=>{ if(pl[k])c[k]=pl[k]; else delete c[k]; }); this.cache.set(c.id,{plano:canon(this._plano(c)),sec:this._secStamp(c._sec),pendiente:false}); },
  // Un cliente que llegó de la nube trae las credenciales cifradas (_sec) y nunca las de verdad.
  // Si la bóveda está abierta hay que volver a ponérselas; si no, en pantalla aparecerían vacías.
  recibido(nuevo,anterior){
    if(!nuevo)return;
    if(!nuevo._sec){ this.cache.delete(nuevo.id); return; }
    if(!this.abierta())return;                  // cerrada: se ve el candado, que es lo correcto
    // Si no cambiaron, se reusa lo que ya estaba descifrado: no hay que volver a descifrar.
    if(anterior&&anterior._sec===nuevo._sec){ CREDS.forEach(k=>{ if(anterior[k])nuevo[k]=anterior[k]; }); return; }
    const op=this._nuevaOp('recibido:'+nuevo.id);
    const sec=nuevo._sec;
    const planoBase=canon(this._plano(nuevo));
    this.cache.set(nuevo.id,{plano:planoBase,sec:this._secStamp(sec),pendiente:true});
    // Cambiaron en otro dispositivo: descifrarlas y volver a dibujar cuando estén.
    this._descifrar(sec)
      .then(pl=>{
        if(!this._vigente(op,{conn:true,abierta:true,cliente:nuevo,sec}))return;
        if(canon(this._plano(nuevo))!==planoBase)return;
        this._aplicar(nuevo,pl);
        if(CUR==='clientes')cambioRemoto();
      })
      .catch(e=>{ if(!this._esCancel(e)&&this._vigente(op,{conn:true}))console.error('No se pudo descifrar',nuevo.id,e); });
  },
  _plano(c){ const o={}; CREDS.forEach(k=>o[k]=c[k]||''); return o; },
  // Guarda la configuración de la bóveda. En la demostración va junto con el resto de los datos;
  // en la página real tiene su propio documento (config/boveda), que la página nunca borra.
  async _guardarCfg(campos,op,cfgBase){
    const base=limpio(cfgBase||this.cfg||{});
    const next=Object.assign({},base,campos);
    this._permitirCfg(op,next);
    this._asegurarOp(op,{conn:true,cfg:true});
    if(MODO_DEMO){
      Store.data.boveda=next;
      Store._escribir();
      this._asegurarOp(op,{conn:true,cfg:true});
      this.setConfig(next);
      return next;
    }
    await fbDb.doc('config/boveda').set(next);
    this._asegurarOp(op,{conn:true,cfg:true});
    this.setConfig(next);
    return next;
  },
  // Antes de guardar: cifra las credenciales que cambiaron (datos.js nunca sube las credenciales en claro).
  async cifrarPendientes(clientes){
    if(!this.clave)return;
    const op=this._nuevaOp('cifrar');
    const key=this.clave;
    op.key=key;
    for(const c of clientes||[]){
      this._asegurar(op,{conn:true,abierta:true,key:true});
      const secRef=c._sec;
      const secStamp=this._secStamp(secRef);
      const pl=canon(this._plano(c)), vacio=CREDS.every(k=>!c[k]), prev=this.cache.get(c.id);
      if(c._sec&&!prev)continue; // todavía no se descifró: no tocar
      if(prev&&prev.pendiente&&vacio)continue;
      if(prev&&prev.sec&&secStamp&&prev.sec!==secStamp&&vacio)continue;
      if(prev?prev.plano===pl:vacio)continue;
      let secNuevo=null;
      if(!vacio)secNuevo=await this._enc(key,new TextEncoder().encode(pl));
      this._asegurar(op,{conn:true,abierta:true,key:true});
      if(!this._clienteVigente(c,secRef))continue;
      const plActual=canon(this._plano(c)), vacioActual=CREDS.every(k=>!c[k]);
      if(plActual!==pl)continue; // hubo edición durante el cifrado: no sobrescribir con estado viejo
      if(vacioActual)delete c._sec; else c._sec=secNuevo;
      this.cache.set(c.id,{plano:plActual,sec:this._secStamp(c._sec),pendiente:false});
    }
  },

  /* ----- ventanas ----- */
  // Pide la clave (o la crea la primera vez) y después ejecuta "despues".
  pedir(despues){
    if(this.abierta()){ if(despues)despues(); return; }
    this._despues=despues||null;
    if(this.existe())this._modalAbrir(); else this._modalCrear();
  },
  modalCerrado(){
    this._modalSeq++;
    this._modalBusy=false;
    this._modalBusyOp=null;
  },
  _modal(titulo,html,form,boton){
    this._modalSeq++;
    this._modalBusy=false;
    this._modalBusyOp=null;
    curForm={form}; $('#modal-title').textContent=titulo; $('#modal-del').style.display='none';
    $('#modal-body').innerHTML=html+'<div class="login-err" id="b-msg" style="text-align:left"></div>';
    const b=$('#modal .modal-foot .btn-primary');
    if(b){ b.textContent=boton; b.disabled=false; }
    $('#modal').classList.add('open'); setTimeout(()=>{ const i=$('#modal-body input'); if(i)i.focus(); },60);
  },
  _enter:' onkeydown="if(event.key===\'Enter\')saveForm()"',
  _campoClave(id,label){ return '<div class="field"><label>'+label+'</label><div class="pf-in-wrap"><input type="password" id="'+id+'" autocomplete="new-password"'+this._enter+'><button class="eye" type="button" onclick="pfEye(this,\''+id+'\')">👁</button></div></div>'; },
  _modalCrear(){
    this._modal('🔐 Crear clave de seguridad',
      '<p class="muted-cell" style="font-size:13px;margin-bottom:14px">Las contraseñas de tus clientes (BPS, gub.uy) se guardan <b>cifradas</b>: nadie más puede leerlas. Elegí una <b>clave de seguridad</b>, distinta de la que usás para entrar. Te la vamos a pedir solo cuando quieras ver o editar credenciales.</p>'
      +this._campoClave('b-c1','Clave de seguridad (mínimo 8 caracteres)')+this._campoClave('b-c2','Repetí la clave'),'boveda-crear','Crear clave');
  },
  _modalAbrir(){
    this._modal('🔒 Credenciales protegidas',
      '<p class="muted-cell" style="font-size:13px;margin-bottom:14px">Escribí tu <b>clave de seguridad</b> para ver y editar las contraseñas de tus clientes.</p>'
      +this._campoClave('b-c1','Clave de seguridad')
      +'<a class="login-forgot" style="display:inline-block;margin-top:2px" onclick="Boveda._modalRec()">¿Olvidaste la clave de seguridad?</a>','boveda-abrir','Desbloquear');
  },
  _modalRec(){
    this._modal('🔑 Recuperar con la clave de recuperación',
      '<p class="muted-cell" style="font-size:13px;margin-bottom:14px">Usá la <b>clave de recuperación</b> que guardaste cuando creaste la clave de seguridad, y elegí una clave de seguridad nueva.</p>'
      +'<div class="field"><label>Clave de recuperación</label><input id="b-rec" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" style="font-family:monospace;text-transform:uppercase"></div>'
      +this._campoClave('b-c1','Nueva clave de seguridad (mínimo 8)')+this._campoClave('b-c2','Repetí la nueva clave'),'boveda-rec','Recuperar');
  },
  modalCambiar(){
    this._modal('🔑 Cambiar clave de seguridad',this._campoClave('b-c1','Nueva clave de seguridad (mínimo 8)')+this._campoClave('b-c2','Repetí la nueva clave'),'boveda-cambiar','Cambiar');
  },
  _modalCodigo(rec,pendiente){
    this._modal('📝 Guardá tu clave de recuperación',
      '<p style="font-size:13.5px;margin-bottom:12px">Si algún día olvidás la clave de seguridad, esta es la <b>única forma</b> de volver a ver las credenciales. <b>Se muestra una sola vez.</b></p>'
      +'<div class="rec-code" id="b-code">'+esc(rec)+'</div>'
      +'<div style="text-align:center;margin:10px 0 14px"><button class="btn btn-sm" type="button" data-boveda-copy-rec="1">⧉ Copiar</button></div>'
      +'<p class="muted-cell" style="font-size:12px;margin-bottom:12px">Anotala en papel o en un gestor de contraseñas. No la guardes en esta página ni la mandes por mail o WhatsApp.</p>'
      +(pendiente?'<div class="muted-cell" style="font-size:12px;color:#9a6a00;margin-bottom:12px">'+esc(pendiente)+'</div>':'')
      +'<label class="chkline"><input type="checkbox" id="b-ok"> Ya la guardé en un lugar seguro</label>','boveda-codigo','Listo');
  },
  copiarCodigoRecuperacion(btn){
    const op=this._nuevaOp('modal-copy-rec',curForm&&curForm.form||null);
    if(!this._vigente(op,{modal:true,conn:false,cfg:false}))return Promise.resolve(false);
    const code=document.getElementById('b-code');
    if(!code)return Promise.resolve(false);
    return cliCopy(code.textContent,{isValid:()=>this._vigente(op,{modal:true,conn:false,cfg:false})&&(!btn||btn.isConnected)});
  },
  async guardarModal(){
    const form=curForm&&curForm.form;
    if(!form||!/^boveda-/.test(form))return;
    if(this._modalBusy)return;
    const op=this._nuevaOp('modal:'+form,form);
    this._modalBusy=true;
    this._modalBusyOp=op;
    const liberarBusy=()=>{
      if(this._modalBusyOp!==op)return;
      this._modalBusy=false;
      this._modalBusyOp=null;
    };
    const v=id=>{ const e=document.getElementById(id); return e?e.value:''; }, msg=t=>{ const e=$('#b-msg'); if(e)e.textContent=t; };
    const seguro=t=>{ if(this._vigente(op,{modal:true,conn:false,cfg:false}))msg(t); };
    const dos=()=>{ const a=v('b-c1'),b=v('b-c2'); if(a.length<8){seguro('La clave tiene que tener al menos 8 caracteres');return null;} if(a!==b){seguro('Las dos claves no coinciden');return null;} return a; };
    if(form==='boveda-codigo'){ if(!$('#b-ok').checked){seguro('Marcá la casilla cuando la hayas guardado'); liberarBusy(); return;} liberarBusy(); return this._terminar(op); }
    const btn=$('#modal .modal-foot .btn-primary'), txt=btn?btn.textContent:'Guardar';
    try{
      if(btn){ btn.disabled=true; btn.textContent='Procesando…'; }
      msg('');
      if(form==='boveda-crear'){
        const c=dos(); if(!c)return;
        const rec=await this.crear(c,op);
        this._asegurar(op,{modal:true,conn:true});
        const ok=await Store._flush();
        this._asegurar(op,{modal:true,conn:true});
        if(ok===true){ this._modalCodigo(rec); return; }
        this._modalCodigo(rec,'La bóveda se creó, pero el guardado final de credenciales quedó pendiente por conexión. Conservá este código y reintentá guardar cuando vuelva la conexión.');
        return;
      }
      if(form==='boveda-abrir'){ await this.abrir(v('b-c1'),op); this._asegurar(op,{modal:true,conn:true,cfg:true,abierta:true}); toast('🔓 Credenciales desbloqueadas'); return this._terminar(op); }
      if(form==='boveda-rec'){
        if(normRec(v('b-rec')).length!==24){seguro('La clave de recuperación tiene 24 letras y números');return;}
        const c=dos(); if(!c)return;
        await this.recuperar(v('b-rec'),c,op);
        this._permitirCfg(op,this.cfg);
        this._asegurar(op,{modal:true,conn:true,cfg:true,abierta:true});
        toast('✓ Clave de seguridad nueva guardada');
        return this._terminar(op);
      }
      if(form==='boveda-cambiar'){
        const c=dos(); if(!c)return;
        await this.cambiarClave(c,op);
        this._permitirCfg(op,this.cfg);
        this._asegurar(op,{modal:true,conn:true,cfg:true,abierta:true});
        closeModal();
        toast('✓ Clave de seguridad cambiada');
        return;
      }
    }catch(e){
      if(this._esCancel(e))return;
      const m={'clave-incorrecta':'Clave de seguridad incorrecta','rec-incorrecta':'La clave de recuperación no es correcta','ya-existe':'La clave de seguridad ya fue creada en otro dispositivo. Cerrá y volvé a intentar.'}[e.message];
      seguro(m||'No se pudo completar ('+(e.code||e.message)+'). Revisá la conexión.'); if(!m)console.error(e);
    }finally{
      liberarBusy();
      if(btn&&this._vigente(op,{modal:true,conn:false,cfg:false})&&btn.textContent==='Procesando…'){ btn.disabled=false; btn.textContent=txt; }
    }
  },
  _terminar(op){
    if(op&&!this._vigente(op,{modal:true,conn:true,cfg:true}))return false;
    closeModal();
    const f=this._despues;
    this._despues=null;
    renderView(CUR);
    if(f)f();
    return true;
  },
  async generarRecuperacion(){
    const form=curForm&&curForm.form||null;
    const op=this._nuevaOp('modal-generar',form);
    try{
      const rec=await this.nuevaRecuperacion(op);
      this._asegurar(op,{conn:true,abierta:true,modalSeq:true});
      if(form&&(!curForm||curForm.form!==form))throw this._cancelar('cancelada');
      this._modalCodigo(rec);
    }catch(e){
      if(this._esCancel(e))return;
      console.error(e);
      toast('No se pudo generar la clave de recuperación');
    }
  }
};
