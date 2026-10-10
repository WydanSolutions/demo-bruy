/*
 * Modo de funcionamiento. Va PRIMERO de todos los scripts.
 *
 * Esta versión es la DEMOSTRACIÓN: funciona entera dentro del navegador, con datos inventados
 * guardados en la propia computadora o celular de quien la abre. No hay Firebase, no hay
 * servidor, no hay cuentas y no sale ni entra ningún dato.
 *
 * Cuando la clienta cierre, se reemplaza este archivo por el js/firebase-config.js de siempre
 * (el de la página de la Cra. María Lucía Furtado) y el resto del código no cambia: todas las
 * secciones ya saben trabajar de las dos maneras, mirando MODO_DEMO.
 */
const MODO_DEMO = true;

// Solo para que las pantallas que lo consultan (Configuración) sepan si está en esta PC.
const FB_LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
const MODO_LOCAL = FB_LOCAL_HOSTS.indexOf(String(location.hostname || '').toLowerCase()) >= 0;

// En la demostración nadie entra con correo: la lista existe solo para que el código
// compartido con la página real no se rompa.
const USUARIOS_PERMITIDOS = [];
var fbAuth = null, fbDb = null;
function fbInit() { return false; }
