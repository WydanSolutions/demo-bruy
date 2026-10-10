/*
 * Adaptación al celular. Hace dos cosas, las dos chicas, y no cambia nada de lo que se ve en la
 * computadora:
 *  1) Mide la cabecera y se lo avisa al CSS, para que la barra de pestañas quede pegada justo
 *     debajo. En el celular la cabecera es más baja que en la computadora; si el número estuviera
 *     fijo, quedaría un hueco y el contenido se vería cortado al bajar.
 *  2) Mira cada tabla y la marca según cuántas columnas tiene, y le copia a cada celda el título
 *     de su columna. Con eso, en pantalla chica, cada fila se puede mostrar como una ficha
 *     (etiqueta a la izquierda, dato a la derecha) en lugar de obligar a deslizar de costado.
 *     Lo hace solo, cada vez que una sección se vuelve a dibujar.
 */
(function(){

  /* 1) El alto real de la cabecera, para que la barra de pestañas se pegue justo debajo. */
  function medirCabecera(){
    var h=document.querySelector('header');
    if(!h)return;
    var alto=Math.round(h.getBoundingClientRect().height);
    if(alto>0)document.documentElement.style.setProperty('--alto-cabecera',alto+'px');
  }

  /* 2) Tipo de tabla:
   *    t-mini  → pocas columnas: entra entera en el celular.
   *    t-ficha → una lista de registros: cada fila pasa a ser una ficha.
   *    t-ancha → grillas de los 12 meses y sueldos: se deslizan de costado, con la primera
   *              columna siempre a la vista. */
  function marcarTabla(t){
    // Si la sección ya la marcó a mano (por ejemplo, un resumen corto que entra entero), se respeta.
    var yaTiene=['t-mini','t-ficha','t-ancha'].find(function(c){ return t.classList.contains(c); });
    if(yaTiene){ var caja0=t.closest('.table-wrap'); if(caja0){ caja0.classList.toggle('tw-ficha',yaTiene==='t-ficha'); avisarQueSeDesliza(caja0,yaTiene==='t-ancha'); } return yaTiene; }
    var filasTitulo=t.querySelectorAll('thead tr').length;
    var columnas=t.querySelectorAll('thead tr:last-child th').length;
    var clase='t-ancha';
    if(filasTitulo===1&&columnas){ clase = columnas<=3 ? 't-mini' : (columnas<=11 ? 't-ficha' : 't-ancha'); }
    t.classList.remove('t-mini','t-ficha','t-ancha');
    t.classList.add(clase);
    var caja=t.closest('.table-wrap');
    if(caja){
      caja.classList.toggle('tw-ficha',clase==='t-ficha');
      avisarQueSeDesliza(caja,clase==='t-ancha');
    }
  }

  /* En las tablas anchas, un cartelito arriba que avisa que se desliza de costado.
     En la computadora no se ve: lo esconde el CSS. */
  function avisarQueSeDesliza(caja,hace){
    var previo=caja.previousElementSibling;
    var hay=previo&&previo.classList&&previo.classList.contains('tw-aviso');
    if(hace&&!hay){
      var d=document.createElement('div');
      d.className='tw-aviso';
      d.textContent='Deslizá la tabla de costado para ver todas las columnas →';
      caja.parentNode.insertBefore(d,caja);
    }else if(!hace&&hay){ previo.remove(); }
  }

  /* Le copia a cada celda el título de su columna (queda en data-l). */
  function etiquetarFilas(t){
    var titulos=[].map.call(t.querySelectorAll('thead tr:last-child th'),function(x){ return (x.textContent||'').trim(); });
    [].forEach.call(t.querySelectorAll('tbody tr'),function(tr){
      if(tr._etiquetada)return;
      tr._etiquetada=true;
      [].forEach.call(tr.children,function(td,i){
        if(td.colSpan>1)return;
        if(titulos[i])td.setAttribute('data-l',titulos[i]);
      });
    });
  }

  function revisarTablas(){
    [].forEach.call(document.querySelectorAll('main table'),function(t){
      if(!t.tHead)return;
      if(!t._marcada){ t._marcada=true; marcarTabla(t); }
      etiquetarFilas(t);
    });
  }

  /* Se avisa solo cuando una sección se vuelve a dibujar. */
  var pendiente=false;
  function agendar(){
    if(pendiente)return;
    pendiente=true;
    setTimeout(function(){ pendiente=false; revisarTablas(); },0);
  }

  function arrancar(){
    medirCabecera();
    revisarTablas();
    var m=document.querySelector('main');
    if(m&&window.MutationObserver)new MutationObserver(agendar).observe(m,{childList:true,subtree:true});
    window.addEventListener('resize',medirCabecera);
    window.addEventListener('orientationchange',medirCabecera);
    var h=document.querySelector('header');
    if(h&&window.ResizeObserver)new ResizeObserver(medirCabecera).observe(h);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);
  else arrancar();
})();
