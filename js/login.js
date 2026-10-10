/*
 * Ingreso y salida.
 * - PÁGINA REAL: Firebase Authentication con correo y contraseña. Si se olvida la contraseña,
 *   Firebase manda un correo con un enlace para crear una nueva: nosotros nunca vemos ni
 *   guardamos la contraseña de nadie.
 * - MODO_DEMO: la clave 1234, que sirve solo para mostrar cómo se ve la pantalla de bloqueo.
 */
const CLAVE_DEMO='1234';
function loginMsg(t,ok){ const e=$('#login-err'); if(!e)return; e.style.color=ok?'var(--green)':''; e.textContent=t||''; }

// Estado de sesión y operaciones asíncronas para evitar cruces entre callbacks viejos y nuevos.
const Sesion={
  gen:0, uid:null, authOp:0,
  loginOp:0, resetOp:0,
  logoutSeq:0, logoutRun:null, logoutCtx:null,
  uiBloqueada:false,
  storeReadyUid:null,
  storeLoad:null
};

function sesMarcarAuth(user){
  Sesion.gen++;
  Sesion.uid=user&&user.uid?user.uid:null;
  Sesion.authOp++;
  if(!user){ Sesion.storeReadyUid=null; Sesion.storeLoad=null; }
  return {gen:Sesion.gen,uid:Sesion.uid,auth:Sesion.authOp};
}
function sesCtxActual(){
  return {gen:Sesion.gen,uid:Sesion.uid,auth:Sesion.authOp};
}
function sesTomarAuth(user,reusarSiEquivale){
  const uid=user&&user.uid?user.uid:null;
  if(reusarSiEquivale&&Sesion.uid===uid)return sesCtxActual();
  return sesMarcarAuth(user);
}
function sesAuthVigente(ctx){
  return !!ctx&&Sesion.gen===ctx.gen&&Sesion.uid===ctx.uid&&Sesion.authOp===ctx.auth;
}
function sesBloquearInteraccion(on){
  const b=!!on;
  Sesion.uiBloqueada=b;
  const app=$('#app');
  if(app){
    app.style.pointerEvents=b?'none':'';
    app.style.userSelect=b?'none':'';
    app.setAttribute('aria-busy',b?'true':'false');
  }
  const m=$('#modal');
  if(m)m.style.pointerEvents=b?'none':'';
}

// Limpieza de DOM sensible al salir o perder autenticación. Mantiene estructura y eventos.
function limpiarDomSesion(){
  const vaciar=id=>{ const e=document.getElementById(id); if(e)e.innerHTML=''; };
  ['view-panel','view-decl','view-tareas','view-empresas','view-sprof','view-sueldos','view-clientes','view-cal','view-config'].forEach(vaciar);
  vaciar('fin-tabs'); vaciar('view-hon'); vaciar('view-gastos'); vaciar('view-imp');

  const dd=document.getElementById('dd');
  if(dd){ dd.classList.remove('open'); dd.innerHTML=''; }

  const dlc=document.getElementById('dl-clientes'); if(dlc)dlc.innerHTML='';
  const dlg=document.getElementById('dl-gastocats'); if(dlg)dlg.innerHTML='';
  const dlp=document.getElementById('dl-proveedores'); if(dlp)dlp.innerHTML='';

  const terr=document.getElementById('toast');
  if(terr){ terr.classList.remove('show'); terr.textContent=''; if(terr._t)clearTimeout(terr._t); terr._t=null; }

  if(typeof closeModal==='function')closeModal();
  const mb=document.getElementById('modal-body'); if(mb)mb.innerHTML='';
  const mt=document.getElementById('modal-title'); if(mt)mt.textContent='Nuevo';

  const pw=document.getElementById('login-pass'); if(pw)pw.value='';
  const em=document.getElementById('login-err'); if(em){ em.textContent=''; em.style.color=''; }
  const bm=document.getElementById('b-msg'); if(bm)bm.textContent='';

  ['b-c1','b-c2','b-rec','perfil-av'].forEach(function(id){
    const el=document.getElementById(id);
    if(!el)return;
    if('value' in el)el.value='';
    if(id==='perfil-av')el.innerHTML='M';
  });

  const n=document.getElementById('brand-name'); if(n)n.textContent='Laura Cabrera';
  const s=document.getElementById('brand-sub'); if(s)s.textContent='Contadora Pública';
  const a1=document.getElementById('hdr-av'); if(a1)a1.innerHTML='M';
  const a2=document.getElementById('menu-av'); if(a2)a2.innerHTML='M';

  if(typeof _perfilFoto!=='undefined')_perfilFoto=undefined;
  if(typeof _textoLuego!=='undefined')_textoLuego=null;
  if(typeof cliSel!=='undefined')cliSel=null;
  if(typeof cliView!=='undefined')cliView='panel';
  if(typeof _clq!=='undefined')_clq='';
  if(typeof _clt!=='undefined')_clt='';
  if(typeof _clarch!=='undefined')_clarch='act';
  if(typeof CUR!=='undefined')CUR='panel';
}

// "Pedir contraseña al abrir" es una preferencia de cada dispositivo, no se guarda en la nube.
function pedirClaveAlAbrir(){
  if(MODO_DEMO)return Store.data&&Store.data.askPass!==false;
  try{ return localStorage.getItem('bruy_askPass')!=='no'; }catch(e){ return true; }
}

// Traduce los códigos de Firebase a algo que se entienda.
function errorAuth(err){
  const c=(err&&err.code)||'';
  if(/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c))return 'Correo o contraseña incorrectos';
  if(/too-many-requests/.test(c))return 'Demasiados intentos. Esperá unos minutos o usá «¿Olvidaste tu contraseña?»';
  if(/network/.test(c))return 'Sin conexión a internet';
  if(/invalid-email/.test(c))return 'El correo no es válido';
  if(/user-disabled/.test(c))return 'Este usuario está deshabilitado';
  return 'No se pudo ingresar ('+c+')';
}

function doLogin(){
  if(Sesion.logoutRun){ loginMsg('Esperá: hay un cierre de sesión en curso'); return; }
  if(MODO_DEMO){
    const p=$('#login-pass').value, real=(Store.data&&Store.data.pass)||CLAVE_DEMO;
    if(p!==real){ loginMsg('Contraseña incorrecta (probá '+CLAVE_DEMO+')'); $('#login-pass').value=''; return; }
    loginMsg(''); mostrarApp(); if(typeof renderAll==='function')renderAll(); else renderPanel(); return;
  }
  const email=($('#login-email').value||'').trim().toLowerCase(), pass=$('#login-pass').value, btn=$('#login-btn');
  if(!email||!pass){ loginMsg('Escribí tu correo y tu contraseña'); return; }
  // Mismo mensaje para un correo que no tiene acceso que para una contraseña equivocada: así no se
  // le puede averiguar a la página qué correos existen.
  if(USUARIOS_PERMITIDOS.indexOf(email)<0){ loginMsg('Correo o contraseña incorrectos'); return; }
  const op=++Sesion.loginOp;
  loginMsg('Ingresando…',true); btn.disabled=true;
  const P=firebase.auth.Auth.Persistence;
  fbAuth.setPersistence(pedirClaveAlAbrir()?P.SESSION:P.LOCAL)
    .then(function(){ if(op!==Sesion.loginOp)throw new Error('op-cancelada'); return fbAuth.signInWithEmailAndPassword(email,pass); })
    .then(function(){
      if(op!==Sesion.loginOp)return;
      try{ localStorage.setItem('bruy_email',email); }catch(e){}
      $('#login-pass').value='';
    })
    .catch(function(err){
      if(op!==Sesion.loginOp)return;
      if(err&&err.message==='op-cancelada')return;
      loginMsg(errorAuth(err));
    })
    .finally(function(){ if(op===Sesion.loginOp)btn.disabled=false; });
}

async function doLogout(){
  if(Sesion.logoutRun)return Sesion.logoutRun;

  if(MODO_DEMO){
    const run=(async()=>{
      sesBloquearInteraccion(true);
      try{
        await Store._flush();
        closeModal();
        Boveda.cerrar();
        limpiarDomSesion();
        mostrarLogin();
        return true;
      }catch(e){
        console.error(e);
        toast('⚠ No se pudo cerrar ahora. Probá de nuevo.');
        return false;
      }finally{
        if(Sesion.logoutRun===run)Sesion.logoutRun=null;
        sesBloquearInteraccion(false);
      }
    })();
    Sesion.logoutRun=run;
    return run;
  }

  const u=fbAuth&&fbAuth.currentUser;
  if(!u){
    Store.disconnect(); Boveda.cerrar(); Boveda.setConfig(null);
    limpiarDomSesion(); mostrarLogin();
    return true;
  }

  const ctx={gen:Sesion.gen,uid:u.uid,auth:Sesion.authOp,seq:++Sesion.logoutSeq};
  Sesion.logoutCtx=ctx;
  const run=(async()=>{
    sesBloquearInteraccion(true);
    try{
      let ok=false;
      toast('Guardando los últimos cambios…');
      ok=await Store._flush(); // siempre forzado en modo real, aunque pendiente() dé false
      // Si cambió la sesión mientras esperábamos, no tocar estado nuevo desde este flujo viejo.
      if(!sesAuthVigente(ctx)||!fbAuth.currentUser||fbAuth.currentUser.uid!==ctx.uid)return false;

      if(ok!==true){
        loginMsg('Quedaron cambios sin guardar. Reintentá «Cerrar sesión».');
        toast('⚠ No se pudo guardar todavía. Las credenciales siguen desbloqueadas.');
        return false;
      }

      // Recién con guardado confirmado: cerrar bóveda y limpiar contenido sensible local.
      closeModal();
      Boveda.cerrar();
      limpiarDomSesion();

      try{
        await fbAuth.signOut();
        return true;
      }catch(e){
        const sigue=!!(fbAuth.currentUser&&fbAuth.currentUser.uid===ctx.uid);
        if(sigue){
          console.error(e);
          loginMsg('No se pudo cerrar sesión. Reintentá.');
          toast('⚠ No se pudo cerrar sesión. Reintentá.');
          mostrarApp();
        }
        return false;
      }
    }catch(e){
      if(!sesAuthVigente(ctx))return false;
      if(fbAuth.currentUser&&fbAuth.currentUser.uid===ctx.uid){
        console.error(e);
        loginMsg('Quedaron cambios sin guardar. Reintentá «Cerrar sesión».');
        toast('⚠ No se pudo guardar todavía. Las credenciales siguen desbloqueadas.');
      }
      return false;
    }finally{
      if(Sesion.logoutRun===run){
        Sesion.logoutRun=null;
        Sesion.logoutCtx=null;
        sesBloquearInteraccion(false);
      }
    }
  })();
  Sesion.logoutRun=run;
  return run;
}

// «¿Olvidaste tu contraseña?»: Firebase manda un correo con un enlace para crear una nueva.
function forgotPass(){
  if(Sesion.logoutRun){ loginMsg('Esperá: hay un cierre de sesión en curso'); return; }
  if(MODO_DEMO){ loginMsg('En la página real te llega un correo con un enlace para crear una contraseña nueva.',true); return; }
  const email=($('#login-email').value||'').trim().toLowerCase();
  if(!email){ loginMsg('Escribí tu correo arriba y volvé a tocar «¿Olvidaste tu contraseña?»'); $('#login-email').focus(); return; }
  const op=++Sesion.resetOp;
  // La respuesta es siempre la misma, exista o no el correo.
  const ok=()=>{ if(op===Sesion.resetOp)loginMsg('Si ese correo tiene acceso, te llegó un mensaje para crear una contraseña nueva. Revisá también la carpeta «Spam».',true); };
  if(USUARIOS_PERMITIDOS.indexOf(email)<0){ ok(); return; }
  fbAuth.sendPasswordResetEmail(email)
    .then(ok)
    .catch(err=>{
      if(op!==Sesion.resetOp)return;
      if(/user-not-found/.test(err.code))ok(); else loginMsg(errorAuth(err));
    });
}

function mostrarLogin(){ $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
function mostrarApp(){ $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); }
