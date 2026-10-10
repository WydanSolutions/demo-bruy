/*
 * Arranque de la aplicación. Tiene que ser el ÚLTIMO script de index.html.
 * - PÁGINA REAL: espera a que ella ingrese con su correo, conecta con Firebase y recién ahí dibuja
 *   la página. Nada se muestra antes de saber quién entró.
 * - MODO_DEMO: carga los datos de ejemplo del navegador y abre con la pantalla de presentación.
 */
function renderAll(){ buildNav(); renderView(CUR); updateBadges(); }

// Deja la página lista para mostrarse (con los datos ya cargados).
function prepararApp(){
  sldAnio=anioActivo(); syncCliList(); buildNav(); applyBrand(); applyAvatar(); aplicarAcento();
  CUR='panel'; switchView('panel'); updateBadges();
  // La sincronización con Google Calendar, en la página real, la hace el proceso de Wydan
  // (Apps Script) y llega sola por Firestore: el navegador no puede leerlo directo.
  if(MODO_DEMO){
    gcalProgramar();
    if(Store.data.gcal&&Store.data.gcal.url&&Store.data.gcal.auto!==false)gcalSync(false);
  }
}

(function(){
  document.body.classList.add(MODO_DEMO?'demo':'real');

  // Para que Chrome ofrezca «Instalar aplicación». No guarda copias de nada (ver sw.js).
  if(!MODO_DEMO&&'serviceWorker'in navigator){
    window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }

  /* ----- DEMOSTRACIÓN ----- */
  if(MODO_DEMO){
    Store.load();
    prepararApp();
    mostrarBienvenida(); // lo primero que se ve: la presentación de Wydan
    return;
  }

  /* ----- PÁGINA REAL ----- */
  // En la página real no va la pantalla de presentación ni el botón «⇦ Inicio»: es una herramienta
  // de trabajo, se entra directo.
  document.querySelectorAll('.demo-only').forEach(function(e){ e.remove(); });
  var bv=document.getElementById('bienvenida'); if(bv)bv.remove();
  document.body.classList.add('cargando');
  try{ const em=localStorage.getItem('bruy_email'); if(em)$('#login-email').value=em; }catch(e){}

  fbInit();
  fbAuth.onAuthStateChanged(async function(user){
    const authCtx=sesTomarAuth(user,true);

    if(!user){
      sesBloquearInteraccion(false);
      Store.disconnect();
      Boveda.cerrar();
      Boveda.setConfig(null);
      limpiarDomSesion();
      mostrarLogin(); document.body.classList.remove('cargando'); return;
    }

    // Si se está resolviendo un logout de este mismo usuario, no reiniciar cargas desde callbacks duplicados.
    if(Sesion.logoutCtx&&Sesion.logoutCtx.uid===user.uid)return;

    // Doble control: aunque alguien consiguiera una cuenta, si el correo no está en la lista no entra.
    // (La protección de verdad está en firestore.rules: sin eso, no puede leer ni un dato.)
    if(USUARIOS_PERMITIDOS.indexOf((user.email||'').toLowerCase())<0){
      if(sesAuthVigente(authCtx))loginMsg('Correo o contraseña incorrectos');
      if(fbAuth.currentUser&&fbAuth.currentUser.uid===user.uid)fbAuth.signOut();
      return;
    }

    // Evento duplicado de la misma sesión: no reconectar ni destruir estado ya cargado.
    if(Sesion.storeReadyUid===user.uid&&Store.data){
      if(sesAuthVigente(authCtx)){ loginMsg(''); mostrarApp(); document.body.classList.remove('cargando'); }
      return;
    }

    // Carga en curso de esta misma sesión: dejar correr solo una.
    if(Sesion.storeLoad&&Sesion.storeLoad.uid===user.uid&&sesAuthVigente(Sesion.storeLoad.ctx))return;

    const load={uid:user.uid,ctx:authCtx};
    Sesion.storeLoad=load;
    loginMsg('Cargando tus datos…',true);
    try{
      await Store.connect();
      if(!sesAuthVigente(authCtx))return;
      Sesion.storeReadyUid=user.uid;
      prepararApp();
      mostrarApp();
      loginMsg('');
      sesBloquearInteraccion(false);
    }
    catch(e){
      if(!sesAuthVigente(authCtx))return;
      console.error(e);
      loginMsg('No se pudieron cargar los datos ('+(e.code||'error')+'). Probá de nuevo.');
      if(fbAuth.currentUser&&fbAuth.currentUser.uid===user.uid)fbAuth.signOut();
    }
    finally{
      if(Sesion.storeLoad===load)Sesion.storeLoad=null;
      if(sesAuthVigente(authCtx))document.body.classList.remove('cargando');
    }
  });
})();
