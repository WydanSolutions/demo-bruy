/*
 * Lista de opciones propia, para los campos que sugieren lo que ya está cargado
 * (cliente, categoría, proveedor, medio de pago, tipo…).
 *
 * ¿Por qué no la del navegador? Esos campos usaban <datalist>, que en la computadora funciona pero
 * **en el celular casi nunca**: al tocar la flechita no se despliega nada, y si llega a aparecer,
 * el toque no selecciona. Reportado por la usuaria el 01/10/2026.
 *
 * Esta lista está hecha por nosotros, así que se comporta igual en computadora y en celular:
 *   - tocás el campo (o su flechita ▾) y se abren todas las opciones;
 *   - mientras escribís, se van filtrando;
 *   - tocás una y se completa (y se avisa con un evento "change", para que la sección la guarde);
 *   - igual podés escribir algo que no esté en la lista: no es una lista cerrada.
 *
 * No hay que tocar nada en las secciones: este archivo encuentra solo los campos que tienen
 * list="..." y se encarga. Se abre hacia arriba si abajo no hay lugar (con el teclado del celular
 * abierto, abajo casi nunca hay).
 */
(function(){
  var pop=null, campo=null, marcada=-1, todas=false;

  /* Los valores de un <datalist>, en el orden en que están. */
  function opcionesDe(id){
    var dl=document.getElementById(id); if(!dl)return [];
    return [].map.call(dl.querySelectorAll('option'),function(o){ return o.value||o.textContent; })
             .filter(function(v){ return (v||'').trim(); });
  }

  function crearPop(){
    if(pop)return pop;
    pop=document.createElement('div');
    pop.className='lista-pop';
    // Con el mouse: evitar que el campo pierda el foco al hacer clic en una opción.
    pop.addEventListener('mousedown',function(e){ if(e.target.closest('.lista-op'))e.preventDefault(); });
    // Con el dedo: se elige al LEVANTARLO, y solo si no arrastraste. Si no, al apoyar el dedo para
    // desplazar la lista se elegía esa opción y se cerraba todo.
    var apoyo=null;
    pop.addEventListener('pointerdown',function(e){
      var b=e.target.closest('.lista-op');
      apoyo=b?{x:e.clientX,y:e.clientY,op:b}:null;
    });
    pop.addEventListener('pointerup',function(e){
      if(!apoyo)return;
      var a=apoyo; apoyo=null;
      var arrastro=Math.abs(e.clientX-a.x)>8||Math.abs(e.clientY-a.y)>8;
      if(!arrastro&&e.target.closest('.lista-op')===a.op)elegir(a.op.getAttribute('data-v'));
    });
    pop.addEventListener('pointercancel',function(){ apoyo=null; });
    document.body.appendChild(pop);
    return pop;
  }

  function pintar(){
    if(!campo)return;
    var opts=opcionesDe(campo.getAttribute('data-lista'));
    // Al abrirla se ven todas (es lo que se espera al tocar la flechita); al escribir, se filtra.
    var q=todas?'':(campo.value||'').trim().toLowerCase();
    // Primero las que empiezan igual, después las que lo contienen en el medio.
    var empiezan=[], contienen=[];
    opts.forEach(function(v){
      var l=v.toLowerCase();
      if(!q||l.indexOf(q)===0)empiezan.push(v);
      else if(l.indexOf(q)>=0)contienen.push(v);
    });
    var lista=empiezan.concat(contienen);
    if(!lista.length){ cerrar(); return; }
    marcada=-1;
    crearPop().innerHTML=lista.map(function(v,i){
      return '<button type="button" class="lista-op" data-v="'+esc(v)+'" data-i="'+i+'">'+esc(v)+'</button>';
    }).join('');
    ubicar();
  }

  /* Debajo del campo; si abajo no entra (teclado del celular), arriba. */
  function ubicar(){
    if(!pop||!campo)return;
    var desplazada=pop.scrollTop;
    var r=campo.getBoundingClientRect();
    var vv=window.visualViewport, altoVista=vv?vv.height:window.innerHeight;
    if(!pop.classList.contains('abierto')){ pop.style.visibility='hidden'; pop.style.display='block'; pop.style.maxHeight=''; }
    var alto=Math.min(pop.scrollHeight,320);
    var abajo=altoVista-r.bottom, arriba=r.top;
    var haciaArriba=(abajo<alto+12 && arriba>abajo);
    pop.style.maxHeight=Math.max(96,Math.min(alto,(haciaArriba?arriba:abajo)-12))+'px';
    pop.style.width=Math.max(r.width,170)+'px';
    var anchoVista=vv?vv.width:window.innerWidth;
    pop.style.left=Math.max(8,Math.min(r.left,anchoVista-Math.max(r.width,170)-8))+'px';
    pop.style.top=(haciaArriba?(r.top-pop.offsetHeight-4):(r.bottom+4))+'px';
    pop.style.visibility='';
    pop.classList.add('abierto');
    pop.scrollTop=desplazada;
  }

  function abrir(input){
    if(campo===input&&pop&&pop.classList.contains('abierto'))return;
    campo=input; todas=true; pintar();
  }
  function cerrar(){
    if(pop){ pop.classList.remove('abierto'); pop.style.display=''; }
    campo=null; marcada=-1;
  }
  function elegir(v){
    if(!campo)return;
    var c=campo;
    c.value=v;
    cerrar();
    c.dispatchEvent(new Event('input',{bubbles:true}));
    c.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function marcar(d){
    if(!pop)return;
    var ops=pop.querySelectorAll('.lista-op'); if(!ops.length)return;
    marcada=(marcada+d+ops.length+(marcada<0&&d<0?1:0))%ops.length;
    [].forEach.call(ops,function(o,i){ o.classList.toggle('on',i===marcada); });
    if(ops[marcada])ops[marcada].scrollIntoView({block:'nearest'});
  }

  /* Pasa list="x" a data-lista="x" para que el navegador no abra TAMBIÉN la suya. */
  function preparar(raiz){
    (raiz||document).querySelectorAll('input[list]').forEach(function(i){
      i.setAttribute('data-lista',i.getAttribute('list'));
      i.removeAttribute('list');
      i.setAttribute('autocomplete','off');
      i.classList.add('con-lista');
    });
  }

  /* ===== enganches ===== */
  document.addEventListener('focusin',function(e){
    var i=e.target.closest&&e.target.closest('input[data-lista]');
    if(i)abrir(i); else if(!e.target.closest||!e.target.closest('.lista-pop'))cerrar();
  });
  document.addEventListener('input',function(e){
    if(campo&&e.target===campo){ todas=false; pintar(); }
  });
  // Tocar el campo cuando ya tiene el foco vuelve a abrir la lista completa (la flechita ▾).
  document.addEventListener('pointerup',function(e){
    var i=e.target.closest&&e.target.closest('input[data-lista]');
    if(i&&i===campo&&(!pop||!pop.classList.contains('abierto'))){ todas=true; pintar(); }
  });
  document.addEventListener('keydown',function(e){
    if(!campo)return;
    if(e.key==='ArrowDown'){ e.preventDefault(); marcar(1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); marcar(-1); }
    else if(e.key==='Enter'&&marcada>=0&&pop){ e.preventDefault(); elegir(pop.querySelectorAll('.lista-op')[marcada].getAttribute('data-v')); }
    else if(e.key==='Escape')cerrar();
  });
  document.addEventListener('pointerdown',function(e){
    if(e.target.closest&&(e.target.closest('.lista-pop')||e.target.closest('input[data-lista]')))return;
    cerrar();
  });
  /* Al tocar un campo, el celular abre el teclado y mueve la página. Antes eso cerraba la lista
     apenas se abría: ahora la lista SIGUE al campo, y solo se cierra si el campo se fue de la pantalla. */
  function seguir(){
    if(!campo||!pop||!pop.classList.contains('abierto'))return;
    var r=campo.getBoundingClientRect();
    var vv=window.visualViewport, alto=vv?vv.height:window.innerHeight;
    if(r.bottom<0||r.top>alto){ cerrar(); return; }
    ubicar();
  }
  window.addEventListener('scroll',function(e){
    if(pop&&(e.target===pop||(e.target.closest&&e.target.closest('.lista-pop'))))return; // es el de la lista
    seguir();
  },true);
  window.addEventListener('resize',seguir);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',seguir);
    window.visualViewport.addEventListener('scroll',seguir);
  }

  /* Los campos se crean cada vez que se dibuja una sección: hay que prepararlos de nuevo. */
  var pendiente=false;
  function revisar(){
    if(pendiente)return;
    pendiente=true;
    setTimeout(function(){ pendiente=false; preparar(); },0);
  }
  function arrancar(){
    preparar();
    if(!window.MutationObserver)return;
    var obs=new MutationObserver(revisar);
    ['main','#modal'].forEach(function(s){
      var el=document.querySelector(s); if(el)obs.observe(el,{childList:true,subtree:true});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);
  else arrancar();
})();
