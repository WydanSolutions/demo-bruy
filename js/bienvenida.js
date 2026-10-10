/*
 * Pantalla de bienvenida de la demostración (lo primero que se ve al abrir el link).
 * Es la presentación de WYDAN: logo, el nombre de la clienta, una frase pensada para ella,
 * una vista previa de la página y el botón para entrar.
 *
 * PARA OTRO CLIENTE: se cambian estas tres constantes y listo.
 */
const BV_NOMBRE = 'Laura Cabrera';
// El renglón del rol se escribe en mayúsculas. Lo que vaya en <b class="marca"> no: sirve para
// las marcas que se escriben siempre en minúscula, como «bruy».
const BV_ROL    = '<b class="marca">bruy</b> · Contadora Pública';
const BV_FRASE  = 'Bienvenida, Laura. Esto no es una plantilla: lo armamos con el logo y los colores '
                + 'de bruy. Entrá, tocá todo con confianza y decinos qué le cambiarías.';

// Dibujo en miniatura de la pantalla de trabajo (es una maqueta a escala, no la pantalla real).
// Usa las mismas variables de color que la página, así nunca queda desactualizada.
function miniApp(){
  var rep=function(html,n){ var s=''; while(n-->0)s+=html; return s; };
  return '<div class="bv-prev">'
    +'<div class="mini-app">'
    +'<div class="mini-top"><span class="mini-mark"></span><span class="mini-name"></span></div>'
    +'<div class="mini-nav"><span class="mini-tab on"></span>'+rep('<span class="mini-tab"></span>',4)+'</div>'
    +'<div class="mini-body">'
    +'<div class="mini-kpis">'+rep('<span class="mini-kpi"></span>',3)+'</div>'
    +'<div class="mini-tb"><div class="mini-th"></div>'+rep('<div class="mini-tr"></div>',4)+'</div>'
    +'</div></div></div>';
}
function renderBienvenida(){
  $('#bv-nombre').textContent=BV_NOMBRE;
  $('#bv-rol').innerHTML=BV_ROL;
  $('#bv-frase').textContent=BV_FRASE;
  $('#bv-vista').innerHTML=miniApp();
}
function mostrarBienvenida(){
  renderBienvenida();
  $('#login').classList.add('hidden'); $('#app').classList.add('hidden');
  $('#bienvenida').classList.remove('hidden');
}
// Entra a la demostración: sigue el ingreso normal.
function entrarDemo(){
  $('#bienvenida').classList.add('hidden');
  if(Store.data.askPass===false){ mostrarApp(); renderPanel(); return; }
  mostrarLogin();
  var i=$('#login-pass'); if(i){ i.value=''; setTimeout(function(){i.focus();},80); }
}
