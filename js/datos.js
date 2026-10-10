/*
 * Capa de datos. Es el ÚNICO archivo que sabe dónde se guardan los datos: el resto de la página
 * solo usa Store.data, y no se entera de si está en la nube o en el navegador.
 *
 * - PÁGINA REAL: cada registro (cliente, declaración, tarea, gasto, cuota, honorario, fila de
 *   grilla…) es un **documento propio** en Firestore. Al guardar se suben SOLO los documentos que
 *   cambiaron, y los cambios hechos en otro dispositivo (el celular, la tablet) llegan solos.
 * - MODO_DEMO: todo en el navegador (localStorage), con datos de ejemplo inventados.
 *
 * Las contraseñas de los clientes NUNCA se suben en claro: se cifran antes (ver boveda.js).
 */
const CLI_TIPOS_DEF=['Persona física','Empresa','Otro'];
const EMP_TIPOS_DEF=['Ind. y Comercio','Pequeña empresa','Unipersonal'];
// Listas de registros: cada elemento es un documento propio (colección/id).
const COLS_LISTA=['clientes','dj','tareas','notes','cal','sueldos','honCli','honMov','gastos','cuotas','impuestos'];
// Todo lo que vive en la nube: lo de arriba, más las grillas y la configuración.
const COLS_NUBE=COLS_LISTA.concat(['grillas','config']);
// Datos sensibles: se guardan solo cifrados, nunca en claro.
const CREDS=['passBps','passGub','codGub'];
// Documentos que escribe otro proceso (el respaldo de Wydan, la bóveda): la página los lee, pero
// nunca los sube ni los borra.
const SOLO_LECTURA=['config/gcal','config/boveda'];
// Lo que NO va adentro de config/general: o es una colección, o tiene su propio documento.
const FUERA_DE_CONFIG=['grids','gcalEvents','boveda','pass','askPass'];
// La nota adhesiva con la que arranca la demostración.
const NOTA_BIENVENIDA='💚 ¡Bienvenida, Laura!\n\nEsta página está hecha para bruy. Probá todo con confianza: los datos son de ejemplo.\n\n— Equipo Wydan';
const PANEL_DEF=()=>({venc:true,tareas:true,estado:false,vistas:true,gastos:false,vencimientos:false,notas:true,calendario:true,kpis:['tareasPend','tareasVenc'],order:PANEL_ORDER_DEF.slice(),widths:Object.assign({},PANEL_WIDTHS_DEF)});

// Texto estable de un objeto (claves ordenadas): sirve para saber si un documento cambió.
function canon(v){
  if(Array.isArray(v))return '['+v.map(canon).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
  return JSON.stringify(v===undefined?null:v);
}
const limpio=o=>JSON.parse(JSON.stringify(o));
const porOrden=(a,b)=>((a._t||0)-(b._t||0))||String(a.id).localeCompare(String(b.id));

const Store={
  data:null,
  _synced:new Map(), _timer:null, _retryTimer:null, _saving:false, _unsubs:[],
  _dirtyRev:0, _savedRev:0, _forceReq:0, _forceDone:0,
  _connToken:0, _waitFlush:[], _loop:null, _loopSeq:0, _flushSeq:0,
  _intentRev:0, _localIntents:new Map(), _deleteIntents:new Map(), _cloudState:new Map(),

  /* ===== MODO_DEMO: todo en el navegador ===== */
  load(){
    // Si hay algo guardado en este navegador, se usa. Se rehacen los datos de ejemplo cuando la
    // copia guardada quedó vacía o ilegible, o cuando es de una versión anterior de los ejemplos
    // (ver EJ_VERSION en js/ejemplos.js): una demostración siempre tiene que mostrar lo último.
    try{
      const r=localStorage.getItem(KEY);
      if(r){
        const d=JSON.parse(r);
        const tieneAlgo=['clientes','dj','tareas','gastos','sueldos','honCli'].some(function(k){ return Array.isArray(d[k])&&d[k].length; });
        const alDia=(d.ejVersion===EJ_VERSION);
        if(tieneAlgo&&alDia){ this.data=d; this._fix(); Boveda.setConfig(this.data.boveda||null); return; }
        if(tieneAlgo)console.log('La copia guardada era de una versión anterior de la demostración: se vuelven a cargar los ejemplos.');
      }
    }catch(e){ console.error('No se pudieron leer los datos guardados en este navegador',e); }
    try{ this.data=seed(); }
    catch(e){ console.error('No se pudieron armar los datos de ejemplo',e); this.data={}; }
    this._fix(); Boveda.setConfig(null);
  },
  // Guarda en el navegador. Las credenciales se sacan del texto: solo quedan cifradas, en "_sec".
  _escribir(){
    try{ localStorage.setItem(KEY,JSON.stringify(this.data,function(k,v){ return CREDS.indexOf(k)>=0?undefined:v; })); }
    catch(e){ console.error('No se pudo guardar',e); }
  },

  /* ===== PÁGINA REAL: conectar con Firestore y escuchar los cambios ===== */
  connect(){
    this.disconnect();
    this._connToken++;
    const tok=this._connToken;
    this._dirtyRev=0; this._savedRev=0; this._forceReq=0; this._forceDone=0; this._flushSeq=0;
    this._intentRev=0; this._localIntents.clear(); this._deleteIntents.clear(); this._cloudState.clear();
    this.data={grids:emptyGrids()}; COLS_LISTA.forEach(c=>this.data[c]=[]);
    return new Promise((resolve,reject)=>{
      const pendientes=new Set(COLS_NUBE);
      COLS_NUBE.forEach(col=>{
        const un=fbDb.collection(col).onSnapshot(snap=>{
          if(tok!==this._connToken)return;
          let cambio=false;
          snap.docChanges().forEach(ch=>{
            if(tok!==this._connToken)return;
            if(ch.doc.metadata.hasPendingWrites)return;   // es un cambio nuestro, todavía sin confirmar
            const p=col+'/'+ch.doc.id;
            if(p==='config/boveda'){ Boveda.setConfig(ch.type==='removed'?null:ch.doc.data()); this._cloudState.set(p,{type:ch.type,s:ch.type==='removed'?'':canon(ch.doc.data())}); return; }
            if(ch.type==='removed'){
              this._cloudState.set(p,{type:'removed',s:''});
              if(this._intencionPendiente(p))return;
              this._synced.delete(p);
              cambio=this._quitar(col,ch.doc.id)||cambio;
              return;
            }
            const o=ch.doc.data(), s=canon(o);
            this._cloudState.set(p,{type:'set',s:s,o:limpio(o)});
            if(this._intencionPendiente(p))return;
            const mem=this._docOf(p);
            if(mem&&canon(mem)===s){ this._synced.set(p,s); return; }   // ya lo teníamos igual
            // Si un documento falla, se anota y se sigue con los demás. Y recién se marca como
            // "sincronizado" DESPUÉS de haberlo guardado en memoria: si se marcara antes y fallara,
            // al guardar se creería que el documento sobra y se borraría de la nube.
            try{ this._poner(col,ch.doc.id,o); }
            catch(e){ console.error('No se pudo recibir',p,e); return; }
            this._synced.set(p,s); cambio=true;
          });
          if(tok!==this._connToken)return;
          if(pendientes.has(col)){ pendientes.delete(col); if(!pendientes.size){ this._fix(); resolve(); } }
          else if(cambio) cambioRemoto(150,tok);
        },err=>{
          if(tok!==this._connToken)return;
          console.error('Firestore',col,err);
          if(pendientes.size)reject(err); else avisoGuardado('error');
        });
        this._unsubs.push(un);
      });
    });
  },
  disconnect(){
    const tok=this._connToken;
    this._connToken++;
    this._unsubs.forEach(u=>{try{u();}catch(e){}}); this._unsubs=[];
    this._synced.clear();
    this._cloudState.clear();
    if(this._timer){ clearTimeout(this._timer); this._timer=null; }
    if(this._retryTimer){ clearTimeout(this._retryTimer); this._retryTimer=null; }
    clearTimeout(_remotoTimer); _remotoTimer=null;
    this._resolverEspera(tok,false);
    this._saving=false;
    this._loop=null;
    this._dirtyRev=0; this._savedRev=0; this._forceReq=0; this._forceDone=0; this._flushSeq=0;
    this._localIntents.clear(); this._deleteIntents.clear(); this._intentRev=0;
    if(!MODO_DEMO)this.data=null;
  },

  _nextIntentRev(){ this._intentRev++; return this._intentRev; },
  _intencionPendiente(p){ return this._localIntents.has(p)||this._deleteIntents.has(p); },
  _marcarIntentoUpsert(p,rev){
    const r=rev||this._nextIntentRev();
    this._localIntents.set(p,{op:'upsert',rev:r});
    const del=this._deleteIntents.get(p);
    if(del&&del.rev<=r)this._deleteIntents.delete(p);
    return r;
  },
  _marcarIntentoDelete(p,rev){
    const r=rev||this._nextIntentRev();
    this._deleteIntents.set(p,{op:'delete',rev:r});
    const li=this._localIntents.get(p);
    if(li&&li.rev<=r)this._localIntents.delete(p);
    return r;
  },
  _confirmarIntento(op,p,rev){
    if(op==='set'){
      const li=this._localIntents.get(p);
      if(li&&li.op==='upsert'&&li.rev===rev)this._localIntents.delete(p);
      return;
    }
    const del=this._deleteIntents.get(p);
    if(del&&del.op==='delete'&&del.rev===rev)this._deleteIntents.delete(p);
  },
  _credPendientePath(p,o){
    const ps=(p||'').split('/');
    if(ps[0]!=='clientes')return false;
    if(!Boveda||typeof Boveda.pendienteCredsCliente!=='function')return false;
    let cli=null;
    if(this.data&&Array.isArray(this.data.clientes))cli=this.data.clientes.find(x=>x&&x.id===ps[1])||null;
    if(!cli&&o&&o.id===ps[1])cli=o;
    try{ return !!Boveda.pendienteCredsCliente(cli); }
    catch(e){ return false; }
  },
  _syncIntentosDesdeMemoria(){
    if(!this.data||MODO_DEMO)return;
    const docs=this._docs();
    this._localIntents.forEach((it,p)=>{
      if(it&&it.op==='upsert'&&!docs.has(p))this._localIntents.delete(p);
    });
    docs.forEach((o,p)=>{
      const s=canon(o), synced=this._synced.get(p);
      const credPend=this._credPendientePath(p,o);
      if(synced!==s)this._marcarIntentoUpsert(p);
      else if(credPend){
        const li=this._localIntents.get(p);
        if(!li||li.op!=='upsert')this._marcarIntentoUpsert(p);
      } else {
        const li=this._localIntents.get(p);
        if(li&&li.op==='upsert')this._localIntents.delete(p);
      }
      if(this._deleteIntents.has(p))this._deleteIntents.delete(p);
    });
  },

  _resolverEspera(tok,ok,loopId,uptoSeq){
    const quedan=[];
    this._waitFlush.forEach(w=>{
      if(w.tok!==tok){ quedan.push(w); return; }
      if(loopId!=null&&w.loopId!==loopId){ quedan.push(w); return; }
      if(loopId!=null&&uptoSeq!=null&&w.seq>uptoSeq){ quedan.push(w); return; }
      try{ w.resolve(!!ok); }catch(e){}
    });
    this._waitFlush=quedan;

    if(loopId!=null&&tok===this._connToken){
      const restan=this._waitFlush.filter(w=>w.tok===tok&&w.loopId===loopId);
      if(restan.length){
        const loop=this._arrancarLoop(tok);
        restan.forEach(w=>{ w.loopId=loop.id; });
      }
    }

    return !!ok;
  },
  _programarReintento(tok){
    if(tok!==this._connToken||this._retryTimer)return;
    this._retryTimer=setTimeout(()=>{
      this._retryTimer=null;
      if(tok!==this._connToken)return;
      this._flush(false).then(()=>{});
    },5000);
  },
  _arrancarLoop(tok){
    const loop=this._loop;
    if(loop&&loop.tok===tok){
      if(loop.active)return loop;
      this._loop=null;
    }
    const id=++this._loopSeq;
    const run=this._loopFlush(tok,id)
      .catch(e=>{ if(tok===this._connToken)console.error('Guardar',e); return {ok:false,uptoSeq:this._flushSeq}; })
      .then(info=>{
        if(this._loop&&this._loop.promise===run){ this._loop.active=false; this._loop=null; }
        return this._resolverEspera(tok,!!info.ok,id,info.uptoSeq);
      });
    this._loop={tok,id,promise:run,active:true};
    return this._loop;
  },
  _marcarLoopInactivo(tok,id){
    const loop=this._loop;
    if(loop&&loop.tok===tok&&loop.id===id)loop.active=false;
  },
  async _loopFlush(tok,id){
    while(true){
      const inicioSeq=this._flushSeq;
      if(tok!==this._connToken){ this._marcarLoopInactivo(tok,id); return {ok:false,uptoSeq:inicioSeq}; }
      if(!fbDb||!this.data){ this._marcarLoopInactivo(tok,id); return {ok:false,uptoSeq:inicioSeq}; }
      const forzado=(this._forceDone<this._forceReq);
      if(this._savedRev>=this._dirtyRev&&!forzado&&!this._localIntents.size&&!this._deleteIntents.size){
        if(this._retryTimer){ clearTimeout(this._retryTimer); this._retryTimer=null; }
        if(tok===this._connToken)avisoGuardado('ok');
        this._marcarLoopInactivo(tok,id);
        return {ok:true,uptoSeq:this._flushSeq};
      }
      if(this._timer){ clearTimeout(this._timer); this._timer=null; }

      this._saving=true;
      const objetivo=this._dirtyRev, objetivoForzado=this._forceReq;
      try{
        await Boveda.cifrarPendientes(this.data.clientes);
        if(tok!==this._connToken){ this._marcarLoopInactivo(tok,id); return {ok:false,uptoSeq:inicioSeq}; }
        this._syncIntentosDesdeMemoria();

        const docs=this._docs(), cambios=[];
        docs.forEach((o,p)=>{
          const s=canon(o), synced=this._synced.get(p);
          let li=this._localIntents.get(p);
          if(synced!==s&&!li)li={op:'upsert',rev:this._marcarIntentoUpsert(p)};
          if(synced===s&&(!li||li.op!=='upsert'))return;
          cambios.push({kind:'set',p,o,s,rev:li.rev});
        });
        this._deleteIntents.forEach((it,p)=>{
          if(docs.has(p))return;
          cambios.push({kind:'delete',p,borrar:true,rev:it.rev});
        });

        for(let i=0;i<cambios.length;i+=400){
          const lote=cambios.slice(i,i+400), b=fbDb.batch();
          lote.forEach(c=>{ const ref=fbDb.doc(c.p); if(c.borrar)b.delete(ref); else b.set(ref,c.o); });
          await b.commit();
          if(tok!==this._connToken){ this._marcarLoopInactivo(tok,id); return {ok:false,uptoSeq:inicioSeq}; }
          lote.forEach(c=>{
            if(c.borrar)this._synced.delete(c.p); else this._synced.set(c.p,c.s);
            this._confirmarIntento(c.kind,c.p,c.rev);
          });
        }

        this._savedRev=Math.max(this._savedRev,objetivo);
        this._forceDone=Math.max(this._forceDone,objetivoForzado);
        this._syncIntentosDesdeMemoria();
      }catch(e){
        if(tok!==this._connToken){ this._marcarLoopInactivo(tok,id); return {ok:false,uptoSeq:inicioSeq}; }
        console.error('Guardar',e);
        avisoGuardado('error');
        this._programarReintento(tok);
        this._marcarLoopInactivo(tok,id);
        return {ok:false,uptoSeq:inicioSeq};
      }finally{
        if(tok===this._connToken)this._saving=false;
      }
    }
  },

  // Coloca en Store.data un documento que llegó de la nube.
  _poner(col,id,o){
    const d=this.data;
    if(COLS_LISTA.indexOf(col)>=0){
      const x=Object.assign({},o,{id});
      if(col==='clientes')Boveda.recibido(x,this.get('clientes',id));
      const arr=d[col], i=arr.findIndex(e=>e.id===id);
      if(i>=0)arr[i]=x; else arr.push(x);
      arr.sort(porOrden); return;
    }
    if(col==='grillas'){
      const g=o.gid; if(!d.grids[g])return;
      const r=Object.assign({},o,{id}); delete r.gid;
      const rows=d.grids[g].rows, i=rows.findIndex(e=>e.id===id);
      if(i>=0)rows[i]=r; else rows.push(r);
      rows.sort(porOrden); return;
    }
    if(col==='config'){
      if(id==='general')Object.keys(o).forEach(k=>d[k]=o[k]);
      if(id==='gcal'){ d.gcalEvents=o.eventos||[]; if(CUR==='cal'||CUR==='panel')cambioRemoto(); }
    }
  },
  _quitar(col,id){
    const d=this.data;
    if(COLS_LISTA.indexOf(col)>=0){ const n=d[col].length; d[col]=d[col].filter(e=>e.id!==id); return d[col].length!==n; }
    if(col==='grillas'){ let c=false; Object.keys(d.grids).forEach(g=>{ const n=d.grids[g].rows.length; d.grids[g].rows=d.grids[g].rows.filter(e=>e.id!==id); c=c||n!==d.grids[g].rows.length; }); return c; }
    return false;
  },
  // Cómo se vería en la nube un documento, con lo que hay ahora en memoria (null si no existe).
  _docOf(p){
    const [col,id]=p.split('/'), d=this.data;
    if(COLS_LISTA.indexOf(col)>=0){ const o=(d[col]||[]).find(e=>e.id===id); return o?this._aNube(col,o):null; }
    if(col==='grillas'){ for(const g of ['empresas','sprof']){ const r=((d.grids[g]||{}).rows||[]).find(e=>e.id===id); if(r)return limpio(Object.assign({gid:g},r)); } return null; }
    if(p==='config/general')return this._config();
    return null;
  },
  _aNube(col,o){ const x=Object.assign({},o); delete x.id; if(col==='clientes')CREDS.forEach(k=>delete x[k]); return limpio(x); },
  _config(){ const d=this.data,c={}; Object.keys(d).forEach(k=>{ if(COLS_LISTA.indexOf(k)<0&&FUERA_DE_CONFIG.indexOf(k)<0)c[k]=d[k]; }); return limpio(c); },
  // Todos los documentos que representan el estado actual de la página.
  _docs(){
    const d=this.data, m=new Map(), now=Date.now();
    COLS_LISTA.forEach(c=>(d[c]||[]).forEach(o=>{ if(!o||!o.id)return; if(!o._t)o._t=now; m.set(c+'/'+o.id,this._aNube(c,o)); }));
    ['empresas','sprof'].forEach(g=>((d.grids[g]||{}).rows||[]).forEach(r=>{ if(!r._t)r._t=now; m.set('grillas/'+r.id,limpio(Object.assign({gid:g},r))); }));
    m.set('config/general',this._config());
    return m;
  },

  /* ===== Guardar ===== */
  save(){
    if(this.data&&typeof syncCliList==='function')syncCliList(); // la lista para autocompletar, al día
    if(MODO_DEMO){ this._escribir(); if(Boveda.clave)this._flushDemo(); return; }
    this._syncIntentosDesdeMemoria();
    this._dirtyRev++;
    if(this._timer)clearTimeout(this._timer);
    this._timer=setTimeout(()=>{ this._timer=null; this._flush(false).then(()=>{}); },300);
  },
  // Demostración: cifra lo que haya quedado pendiente y vuelve a escribir en el navegador.
  async _flushDemo(){
    try{ await Boveda.cifrarPendientes(this.data.clientes); }catch(e){ console.error(e); }
    this._escribir();
  },
  // Página real: sube SOLO los documentos que cambiaron, de a lotes.
  async _flush(manual){
    if(MODO_DEMO){ await this._flushDemo(); return true; }
    if(!fbDb||!this.data)return false;

    const seq=++this._flushSeq;
    if(manual!==false)this._forceReq++;

    const tok=this._connToken;
    if(this._timer){ clearTimeout(this._timer); this._timer=null; }
    if(this._retryTimer){ clearTimeout(this._retryTimer); this._retryTimer=null; }

    return new Promise(resolve=>{
      const loop=this._arrancarLoop(tok);
      this._waitFlush.push({tok,loopId:loop.id,seq,resolve});
    });
  },
  pendiente(){
    return !MODO_DEMO&&(
      this._savedRev<this._dirtyRev
      ||this._forceDone<this._forceReq
      ||this._localIntents.size>0
      ||this._deleteIntents.size>0
      ||!!this._timer
      ||this._saving
      ||!!this._retryTimer
    );
  },

  /* Completa lo que falte: una base recién creada, o datos de una versión anterior de la página. */
  _fix(){
    const d=this.data;
    COLS_LISTA.forEach(k=>{ if(!Array.isArray(d[k]))d[k]=[]; });
    if(!d.grids)d.grids=emptyGrids();
    ['empresas','sprof'].forEach(g=>{ if(!d.grids[g])d.grids[g]={rows:[]}; });
    if(!Array.isArray(d.sldSubs)||!d.sldSubs.length)d.sldSubs=defaultSubs();
    if(!Array.isArray(d.sldHidden))d.sldHidden=[];
    if(!d.sldColsCfg||typeof d.sldColsCfg!=='object')d.sldColsCfg={};
    if(!Array.isArray(d.empTipos))d.empTipos=EMP_TIPOS_DEF.slice();
    if(!Array.isArray(d.gastoCats)||!d.gastoCats.length)d.gastoCats=GASTO_CATS_DEF.slice();
    if(!Array.isArray(d.cliTipos)){ d.cliTipos=CLI_TIPOS_DEF.slice(); d.clientes.forEach(c=>{ if(c.tipo&&d.cliTipos.indexOf(c.tipo)<0)d.cliTipos.push(c.tipo); }); }
    if(!d.panel)d.panel=PANEL_DEF();
    if(!d.gcal)d.gcal={url:'',auto:true,last:0};
    if(typeof vencCfg==='function')vencCfg(); // deja lista la configuración de impuestos
    d.gastos.forEach(function(g){ if(g.conIva){ if(!g.ivaModo)g.ivaModo='incluido'; if(!g.ivaDed)g.ivaDed=100; } });
    // SOLO EN LA DEMOSTRACIÓN: si una sección quedó sin ejemplos (porque esa persona la abrió con
    // una versión anterior), se vuelven a cargar. En la página real NUNCA se siembra nada.
    if(MODO_DEMO&&!d.gastos.length&&typeof seedGastos==='function'){ d.gastos=seedGastos(); d.cuotas=seedCuotas(d.gastos); }
    if(MODO_DEMO&&!d.impuestos.length&&typeof seedImpuestos==='function')d.impuestos=seedImpuestos();
    if(MODO_DEMO){
      var bv=d.notes.find(function(n){ return n.id==='n1'; });
      var esNuestra=bv&&(/^Esta es una demostración/.test(bv.text||'')||/—\s*Equipo Wydan\s*$/.test(bv.text||''));
      if(esNuestra&&bv.text!==NOTA_BIENVENIDA)bv.text=NOTA_BIENVENIDA;
    }
    // Cada declaración pertenece a un año y puede tener un tipo.
    d.dj.forEach(x=>{ if(!x.anio)x.anio=x.venc?+x.venc.slice(0,4):new Date().getFullYear(); if(x.tipoDj===undefined)x.tipoDj=''; });
    // Vincular por nombre las filas de Empresas / Serv. Profesionales / Sueldos con la ficha del cliente.
    ['empresas','sprof'].forEach(g=>{ (d.grids[g]&&d.grids[g].rows||[]).forEach(r=>{ if(!r.clienteId){ const c=d.clientes.find(x=>(x.nombre||'').trim().toLowerCase()===(r.nombre||'').trim().toLowerCase()); if(c)r.clienteId=c.id; } }); });
    (d.sueldos||[]).forEach(r=>{ if(!r.clienteId&&r.empresa){ const c=d.clientes.find(x=>(x.nombre||'').trim().toLowerCase()===r.empresa.trim().toLowerCase()); if(c)r.clienteId=c.id; } });
  },

  all(c){ return this.data[c]||[]; },
  get(c,id){ return this.all(c).find(x=>x.id===id); },
  upsert(c,o){
    if(!o.id){ o.id=c[0]+Date.now()+Math.floor(Math.random()*999); o._t=Date.now(); this.data[c].push(o); }
    else {
      const i=this.data[c].findIndex(x=>x.id===o.id);
      if(i>=0)this.data[c][i]=o;
      else this.data[c].push(o);
    }
    if(!MODO_DEMO)this._marcarIntentoUpsert(c+'/'+o.id);
    this.save();
    return o;
  },
  remove(c,id){
    const habia=this.all(c).some(x=>x.id===id);
    this.data[c]=this.all(c).filter(x=>x.id!==id);
    if(!MODO_DEMO&&habia)this._marcarIntentoDelete(c+'/'+id);
    this.save();
  },
  removeGridRow(gid,id){
    if(gid!=='empresas'&&gid!=='sprof')return;
    const rows=((this.data.grids||{})[gid]||{}).rows||[];
    const habia=rows.some(x=>x.id===id);
    this.data.grids[gid].rows=rows.filter(x=>x.id!==id);
    if(!MODO_DEMO&&habia)this._marcarIntentoDelete('grillas/'+id);
    this.save();
  }
};

/* Un cambio llegó desde otro dispositivo: se redibuja, salvo que se esté escribiendo. */
var _remotoTimer=null;
function cambioRemoto(espera,tok){
  const esperado=(tok==null?Store._connToken:tok);
  clearTimeout(_remotoTimer);
  _remotoTimer=setTimeout(function(){
    if(esperado!==Store._connToken)return;
    const a=document.activeElement, escribiendo=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if(escribiendo||$('#modal').classList.contains('open')){ cambioRemoto(1500,esperado); return; }
    if(!Store.data||$('#app').classList.contains('hidden'))return;
    syncCliList(); renderView(CUR); updateBadges();
  },espera||150);
}
function avisoGuardado(estado){
  if(estado==='error'){ if(!avisoGuardado._err)toast('⚠ No se pudo guardar. Revisá la conexión a internet: se reintenta solo.'); avisoGuardado._err=true; }
  else if(avisoGuardado._err){ avisoGuardado._err=false; toast('✓ Cambios guardados'); }
}
// Avisar si se cierra la página con cambios sin subir.
window.addEventListener('beforeunload',function(e){ if(Store.pendiente()){ e.preventDefault(); e.returnValue=''; } });

function emptyGrids(){ return {empresas:{rows:[]},sprof:{rows:[]},sueldos:{rows:[]}}; }

/* ===== DATOS DE EJEMPLO — SOLO PARA LA DEMOSTRACIÓN. TODOS INVENTADOS. =====
   El contenido está en js/ejemplos.js (clientes, declaraciones, tareas, grillas, agenda y notas)
   y en el archivo de cada sección (seedGastos, seedSueldos, seedHon, seedImpuestos). Acá solo se
   arma el conjunto. */
function seed(){
  const gastos=seedGastos();
  const h=seedHon();
  const g=ejGrids();
  return {ejVersion:EJ_VERSION,
    clientes:ejClientes(),dj:ejDeclaraciones(),tareas:ejTareas(),grids:g,cal:ejCalendario(),
    notes:ejNotas(),gastos:gastos,cuotas:seedCuotas(gastos),impuestos:seedImpuestos(),
    gastoCats:GASTO_CATS_DEF.slice(),sueldos:seedSueldos(),sldSubs:defaultSubs(),sldHidden:[],
    empTipos:EMP_TIPOS_DEF.concat(['CEDE','No CEDE']),cliTipos:CLI_TIPOS_DEF.slice(),
    honCli:h.cli,honMov:h.mov,gcal:{url:'',auto:true,last:0},panel:PANEL_DEF()};
}
