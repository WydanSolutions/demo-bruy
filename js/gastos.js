/*
 * Sección: Gastos del estudio (alquiler, luz, agua, muebles y útiles, papelería…).
 * - Vista MENSUAL: lo que hay que pagar ese mes, con los números arriba y el resultado abajo.
 * - Vista ANUAL: cuánto se gastó en cada categoría, mes a mes.
 *
 * CONTADO Y CRÉDITO (criterio de caja): una compra se carga UNA sola vez.
 * Si es a crédito, sus cuotas son la forma de pagarla: cada cuota aparece en el mes que vence,
 * nunca la compra entera. Así el "total del mes" siempre significa lo que sale del bolsillo.
 * Datos: colección "gastos" (la compra) + colección "cuotas" (los pagos programados de una compra).
 * La ficha de alta y edición está en gastos-form.js.
 */
/* ===== GASTOS ===== */
var gstAnio=null, gstMes=new Date().getMonth(), gstVista='mensual', gstQ='', gstCat='';
// Categorías con las que arranca. La usuaria puede agregar las que quiera (se guardan en gastoCats).
const GASTO_CATS_DEF=['Alquiler','Luz','Agua','Internet y teléfono','Muebles y útiles','Papelería y librería','Limpieza','Software y sistemas','Impuestos y tasas','Otros'];
const IVA_GASTO=0.22;
// Íconos por palabra clave: si crea una categoría nueva, igual le toca un ícono razonable.
const GASTO_ICOS=[[/alquil|local|oficina/i,'🏠'],[/luz|ute|electri/i,'💡'],[/agua|ose/i,'🚰'],[/internet|tel|antel|celu/i,'🌐'],
  [/mueble|equipa|comput|impres/i,'🪑'],[/papel|librer|insumo/i,'🖊'],[/limpie/i,'🧹'],[/software|sistema|licen|nube/i,'💻'],
  [/impuesto|tasa|dgi|bps|contrib/i,'🧾'],[/sueldo|personal|honorar/i,'👥'],[/curso|formac|capacit/i,'📚'],[/nafta|combusti|movili|viaje/i,'🚗'],
  [/banco|comisi/i,'🏦'],[/seguro/i,'🛡']];
function gstIco(c){ for(var i=0;i<GASTO_ICOS.length;i++){ if(GASTO_ICOS[i][0].test(c||''))return GASTO_ICOS[i][1]; } return '•'; }
function gastoCats(){ if(!Array.isArray(Store.data.gastoCats)||!Store.data.gastoCats.length)Store.data.gastoCats=GASTO_CATS_DEF.slice(); return Store.data.gastoCats; }
function gstCatAddName(n){ n=(n||'').trim(); if(n&&gastoCats().indexOf(n)<0){ gastoCats().push(n); Store.save(); syncGstListas(); } }
// Listas para autocompletar: categorías y proveedores ya usados.
function syncGstListas(){
  var dc=document.getElementById('dl-gastocats');
  if(dc)dc.innerHTML=gastoCats().map(function(c){return '<option value="'+esc(c)+'">';}).join('');
  var dp=document.getElementById('dl-proveedores');
  if(dp){
    var vistos={}, lista=[];
    Store.all('gastos').forEach(function(g){ var p=(g.proveedor||'').trim(); if(p&&!vistos[p.toLowerCase()]){vistos[p.toLowerCase()]=1;lista.push(p);} });
    dp.innerHTML=lista.sort(function(a,b){return a.localeCompare(b);}).map(function(p){return '<option value="'+esc(p)+'">';}).join('');
  }
}

function gstYear(){ return gstAnio||anioActivo(); }
function setGstAnio(y){ gstAnio=y; renderGastos(); }
function setGstMes(m){ gstMes=+m; renderGastos(); }
function setGstVista(v){ gstVista=v; renderGastos(); }

/* ===== fechas y cuotas ===== */
function gstAnioDe(x){ return x&&x.fecha?+x.fecha.slice(0,4):null; }
function gstMesDe(x){ return x&&x.fecha?+x.fecha.slice(5,7)-1:null; }
// Cuándo vence: el campo «vence» del gasto o, si no lo tiene, su fecha (en una cuota, su fecha).
function gstVence(x){ return (x&&(x.vence||x.fecha))||''; }
function gstEnMes(iso,y,m){ return !!iso&&+iso.slice(0,4)===y&&+iso.slice(5,7)-1===m; }
function gstMesesEntre(a,b){ if(!a||!b)return 0; return (+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7)); }
// Suma meses a una fecha. Si el día no existe en el mes destino (31 en febrero), va al último día.
function gstSumarMeses(iso,n){
  var p=(iso||today()).split('-'), d=+p[2];
  var t=new Date(+p[0],+p[1]-1+n,1);
  var ultimo=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(Math.min(d,ultimo)).padStart(2,'0');
}
function gstCuotasDe(id){ return Store.all('cuotas').filter(function(c){return c.gastoId===id;}).sort(function(a,b){return a.n-b.n;}); }
function gstEsNumeroFinito(n){ return typeof n==='number'&&isFinite(n); }
function gstCentavos(n){ return Math.round(Number(n)*100); }
function gstDesdeCentavos(c){ return c/100; }
function gstParseCuotasEnteras(raw){
  var s=String(raw==null?'':raw).trim();
  if(!/^\d+$/.test(s))return {ok:false,error:'La cantidad de cuotas tiene que ser un número entero entre 1 y 60'};
  var n=Number(s);
  if(!Number.isInteger(n)||n<1||n>60)return {ok:false,error:'La cantidad de cuotas tiene que estar entre 1 y 60'};
  return {ok:true,n:n};
}
function gstPlanCuotasCandidato(g,previas){
  previas=Array.isArray(previas)?previas.slice():[];
  previas.sort(function(a,b){ return (a.n||0)-(b.n||0); });

  var total=honNum(g&&g.importe);
  if(!gstEsNumeroFinito(total)||total<=0)return {ok:false,error:'El total de la compra tiene que ser un número válido mayor a 0'};
  var totalC=gstCentavos(total);

  var forma=(g&&g.forma)==='credito'?'credito':'contado';
  var pagas=previas.filter(function(c){ return !!c.pagado; });
  var pagadoC=pagas.reduce(function(a,c){ var v=honNum(c.importe); return a+gstCentavos(gstEsNumeroFinito(v)?v:0); },0);
  var maxPagada=pagas.reduce(function(m,c){ return Math.max(m,Number(c.n)||0); },0);

  if(forma!=='credito'){
    if(pagas.length)return {ok:false,error:'No se puede pasar a contado: hay cuotas pagadas'};
    return {
      ok:true,
      forma:'contado',
      N:0,
      totalC:totalC,
      pagadoC:pagadoC,
      saldoC:totalC,
      upserts:[],
      removes:previas.map(function(c){ return c&&c.id; }).filter(Boolean),
      resumen:{
        forma:'contado',
        totalC:totalC,
        pagadoC:pagadoC,
        saldoC:totalC,
        cuotasPagas:pagas.length,
        cuotasImpagas:0,
        baseC:0,
        ultimaC:0,
        primera:''
      }
    };
  }

  var pr=String((g&&g.primera)||'').trim();
  if(!pr)return {ok:false,error:'Falta la fecha de la primera cuota'};

  var pN=gstParseCuotasEnteras(g&&g.cuotas);
  if(!pN.ok)return pN;
  var N=pN.n;

  if(maxPagada>N)return {ok:false,error:'No se puede reducir a '+N+': ya hay una cuota paga N° '+maxPagada};
  if(totalC<pagadoC)return {ok:false,error:'El total no puede ser menor a lo ya pagado en cuotas'};

  var porN={}, extras=[];
  previas.forEach(function(c){
    var n=Number(c.n)||0;
    if(!porN[n]){ porN[n]=c; return; }
    extras.push(c);
  });

  var impagasN=[];
  for(var n=1;n<=N;n++){
    var q=porN[n];
    if(q&&q.pagado)continue;
    impagasN.push(n);
  }

  var saldoC=totalC-pagadoC;
  if(!impagasN.length&&saldoC!==0){
    return {ok:false,error:'El plan ya está totalmente pago. Para aumentar el total, agregá cuotas pendientes'};
  }

  var baseC=impagasN.length?Math.floor(saldoC/impagasN.length):0;
  var remC=impagasN.length?(saldoC-baseC*impagasN.length):0;
  var upserts=[];
  impagasN.forEach(function(k,idx){
    var cents=baseC;
    if(idx===impagasN.length-1)cents+=remC; // remanente en la última impaga
    var vieja=porN[k];
    var c=vieja?Object.assign({},vieja):{gastoId:g.id,n:k};
    c.gastoId=g.id;
    c.n=k;
    c.importe=gstDesdeCentavos(cents);
    c.fecha=gstSumarMeses(pr,k-1);
    c.pagado=false;
    c.fechaPago='';
    upserts.push(c);
  });

  var removes=[];
  previas.forEach(function(c){
    if(!c||!c.id)return;
    var n=Number(c.n)||0;
    if(c.pagado)return; // nunca tocar historial pagado
    if(n>N){ removes.push(c.id); return; }
  });
  extras.forEach(function(c){ if(c&&c.id&&!c.pagado)removes.push(c.id); });

  var seen={};
  removes=removes.filter(function(id){ if(seen[id])return false; seen[id]=1; return true; });

  var ultimaC=upserts.length?gstCentavos(upserts[upserts.length-1].importe):0;
  return {
    ok:true,
    forma:'credito',
    N:N,
    totalC:totalC,
    pagadoC:pagadoC,
    saldoC:saldoC,
    upserts:upserts,
    removes:removes,
    resumen:{
      forma:'credito',
      N:N,
      totalC:totalC,
      pagadoC:pagadoC,
      saldoC:saldoC,
      cuotasPagas:pagas.length,
      cuotasImpagas:impagasN.length,
      baseC:baseC,
      ultimaC:ultimaC,
      primera:pr,
      fin:gstSumarMeses(pr,N-1)
    }
  };
}
function gstAplicarPlanCuotas(plan){
  if(!plan||!plan.ok)return false;
  plan.upserts.forEach(function(c){ Store.upsert('cuotas',c); });
  plan.removes.forEach(function(id){ Store.remove('cuotas',id); });
  return true;
}
// Arma (o rehace) las cuotas de una compra a crédito, validando primero todo el plan.
// Las cuotas YA PAGADAS no se tocan nunca: son historia real de la caja.
function gstSincronizarCuotas(g){
  var plan=gstPlanCuotasCandidato(g,gstCuotasDe(g.id));
  if(!plan.ok)return plan;
  gstAplicarPlanCuotas(plan);
  return plan;
}
// Lo que falta pagar de cuotas después de este mes: la plata futura ya comprometida.
function gstComprometido(y,m){
  var corte=y+'-'+String(m+1).padStart(2,'0')+'-31', t=0, n=0;
  Store.all('cuotas').forEach(function(c){ if(!c.pagado&&c.fecha>corte){ t+=honNum(c.importe)||0; n++; } });
  return {total:t,n:n};
}

/* ===== las filas de un mes: gastos al contado + cuotas que vencen ese mes ===== */
function gstItems(){
  var out=[];
  Store.all('gastos').forEach(function(g){
    if(g.forma==='credito')return;                         // la compra a crédito se ve a través de sus cuotas
    out.push({id:g.id,tipo:'gasto',g:g,vence:gstVence(g),importe:honNum(g.importe),pagado:!!g.pagado,fechaPago:g.fechaPago||'',det:''});
  });
  Store.all('cuotas').forEach(function(c){
    var g=Store.get('gastos',c.gastoId); if(!g)return;
    out.push({id:c.id,tipo:'cuota',g:g,c:c,vence:c.fecha||'',importe:honNum(c.importe),pagado:!!c.pagado,fechaPago:c.fechaPago||'',det:'Cuota '+c.n+'/'+(g.cuotas||'?')});
  });
  return out;
}
/* ===== las filas de un mes =====
   Lo que vence en el mes, lo que se pagó en el mes (aunque venciera en otro) y, en el mes en curso,
   lo vencido de antes que sigue sin pagar. f.fecha = vencimiento (para ordenar y mostrar). */
function gstFilasMes(y,m){
  var hoy=new Date(), esActual=(y===hoy.getFullYear()&&m===hoy.getMonth());
  var inicio=y+'-'+String(m+1).padStart(2,'0')+'-01';
  var filas=[];
  gstItems().forEach(function(it){
    var vence=gstEnMes(it.vence,y,m), pagoAca=it.pagado&&gstEnMes(it.fechaPago,y,m);
    var arrastre=esActual&&!it.pagado&&!!it.vence&&it.vence<inicio;
    if(!vence&&!pagoAca&&!arrastre)return;
    // Pagado por adelantado: ya salió la plata en un mes anterior, así que se muestra ALLÁ y no acá.
    // Si no, el mismo gasto figuraba en dos meses (el del pago y el del vencimiento), inflaba
    // «A pagar este mes» con algo que ya está pagado, y hacía imposible sumar la columna IVA a ojo.
    if(vence&&!pagoAca&&it.pagado&&it.fechaPago&&it.fechaPago<inicio)return;
    it.fecha=it.vence; it.venceAca=vence; it.pagoAca=pagoAca; it.arrastre=arrastre;
    filas.push(it);
  });
  return filas.sort(function(a,b){ return (b.arrastre?1:0)-(a.arrastre?1:0)||(a.fecha||'').localeCompare(b.fecha||''); });
}
// Para la vista anual y el Excel del año: cada pago UNA vez, en el mes en que salió la plata
// (o, si todavía no se pagó, en el mes en que vence).
function gstMesCaja(it){ var d=it.pagado&&it.fechaPago?it.fechaPago:it.vence; return d?{y:+d.slice(0,4),m:+d.slice(5,7)-1}:null; }
function gstFilasCaja(y,m){
  return gstItems().filter(function(it){ var k=gstMesCaja(it); return k&&k.y===y&&k.m===m; })
    .map(function(it){ it.fecha=it.vence; it.venceAca=true; it.pagoAca=it.pagado; return it; })
    .sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
}
function gstFiltradas(){
  var q=gstQ.trim().toLowerCase();
  return gstFilasMes(gstYear(),gstMes).filter(function(f){
    if(gstCat&&(f.g.cat||'')!==gstCat)return false;
    if(q&&!((f.g.concepto||'')+' '+(f.g.cat||'')+' '+(f.g.proveedor||'')).toLowerCase().includes(q))return false;
    return true;
  });
}
// A pagar = vence en el mes · Pagado = salió en el mes · Pendiente = lo del mes sin pagar + lo vencido de antes.
function gstTotales(filas){
  var t={total:0,pag:0,pen:0,nPen:0,venc:0,nVenc:0};
  filas.forEach(function(f){
    var n=f.importe||0;
    if(f.venceAca)t.total+=n;
    if(f.pagoAca)t.pag+=n;
    if(!f.pagado){ t.pen+=n; t.nPen++; if(f.arrastre){ t.venc+=n; t.nVenc++; } }
  });
  return t;
}
// IVA de las COMPRAS del mes (el crédito fiscal corresponde a la fecha de la factura, no a la de la cuota).
// Devuelve el IVA de las facturas y cuánto de eso se puede deducir (hay compras que se computan al 50%).
function gstIvaDelMes(y,m){
  var t=0, ded=0;
  Store.all('gastos').forEach(function(g){
    if(gstAnioDe(g)!==y||gstMesDe(g)!==m)return;
    var iva=honNum(g.iva)||0; t+=iva; ded+=gstIvaDeducible(g);
  });
  return {iva:t,ded:ded};
}
// Lo deducible de un gasto: el IVA por su porcentaje (100% o 50%).
function gstIvaDeducible(g){ return Math.round((honNum(g.iva)||0)*(g.ivaDed||100))/100; }
// La celda de IVA en la tabla: el IVA de la factura y, si se computa al 50%, cuánto queda deducible.
function gstCeldaIva(f){
  var g=f.g, iva=honNum(g.iva)||0;
  if(f.tipo==='cuota')return '<span class="muted-cell" data-tip="El IVA se cuenta en el mes de la compra, no en el de la cuota">—</span>';
  if(!g.conIva||!iva)return '<span class="muted-cell">—</span>';
  // La fila puede estar en un mes y su factura en otro (una compra de octubre que vence en noviembre).
  // El IVA cuenta SOLO en el mes de la factura: si no es este, se dice a cuál se fue en vez de
  // mostrar un importe que no suma acá. Antes la fila mostraba el IVA igual y no cerraba con el total.
  if(gstAnioDe(g)!==gstYear()||gstMesDe(g)!==gstMes){
    var mf=gstMesDe(g), af=gstAnioDe(g);
    return '<span class="gst-iva-otro" data-tip="Factura del '+fDate(g.fecha)+'. El IVA de '+money(iva)
      +' cuenta en '+MESES_L[mf]+' '+af+', no en este mes.">IVA → '+MESES_L[mf].toLowerCase()+(af!==gstYear()?' '+af:'')+'</span>';
  }
  return money(iva)+((g.ivaDed||100)===50?'<span class="gst-ded">50% → '+money(gstIvaDeducible(g))+'</span>':'');
}
// Honorarios cobrados en el mes (para la línea de resultado). Si no está esa sección, devuelve null.
function gstCobradoDelMes(y,m){
  if(typeof honNumerosMes!=='function')return null;
  return honNumerosMes(y,m).cobr;                          // por fecha de pago: la plata que entró en el mes
}

/* ===== guardar desde la tabla ===== */
function gstSet(id,f,v){ var g=Store.get('gastos',id); if(!g)return; g[f]=v; if(f==='cat')gstCatAddName(v); Store.upsert('gastos',g); renderGstBody(); }
function gstTogglePago(tipo,id){
  var col=tipo==='cuota'?'cuotas':'gastos', o=Store.get(col,id); if(!o)return;
  o.pagado=!o.pagado; o.fechaPago=o.pagado?(o.fechaPago||today()):'';
  Store.upsert(col,o); renderGstBody();
}
function gstBorrar(tipo,id){
  var g=tipo==='cuota'?Store.get('gastos',(Store.get('cuotas',id)||{}).gastoId):Store.get('gastos',id);
  if(!g)return false;
  var cs=gstCuotasDe(g.id), pagas=cs.filter(function(c){return c.pagado;}).length;
  var msg=cs.length
    ? '¿Eliminar la compra «'+g.concepto+'»?\n\nSe borran también sus '+cs.length+' cuotas'+(pagas?' ('+pagas+' ya pagadas)':'')+'.'
    : '¿Eliminar este gasto?';
  if(!confirm(msg))return false;
  cs.forEach(function(c){ Store.remove('cuotas',c.id); });
  Store.remove('gastos',g.id);
  renderGastos(); toast('Gasto eliminado');
  return true;
}
// Duplicar: copia la compra sin los pagos hechos, para no volver a escribir todo.
function gstDuplicar(id){
  var g=Store.get('gastos',id); if(!g)return;
  var n=Object.assign({},g); delete n.id; delete n._t;
  n.fecha=today(); n.pagado=false; n.fechaPago=''; n.factura='';
  if(n.forma==='credito')n.primera=gstSumarMeses(today(),1);

  var prePlan=gstPlanCuotasCandidato(Object.assign({},n,{id:'__nuevo__'}),[]);
  if(!prePlan.ok){ toast(prePlan.error||'No se pudo duplicar el gasto'); return; }

  var nuevo=Store.upsert('gastos',n);
  var planNuevo=gstPlanCuotasCandidato(Object.assign({},nuevo),[]);
  if(!planNuevo.ok){
    Store.remove('gastos',nuevo.id);
    toast(planNuevo.error||'No se pudo duplicar el gasto');
    return;
  }
  gstAplicarPlanCuotas(planNuevo);
  renderGastos(); toast('✓ Gasto duplicado: revisá la fecha y el importe');
}

/* ===== pantalla ===== */
function renderGastos(){
  var y=gstYear();
  var h='<div class="view-head"><div><h2>Gastos del estudio <span style="color:var(--muted);font-weight:400">'+y+'</span></h2>'
    +'<div class="sub">Lo que se paga para que el estudio funcione</div></div>'
    +'<span class="sld-top">'+yearSelect(y,'setGstAnio')
    +'<span class="gseg"><button class="gv'+(gstVista==='mensual'?' active':'')+'" onclick="setGstVista(\'mensual\')">▦ Mensual</button>'
    +'<button class="gv'+(gstVista==='anual'?' active':'')+'" onclick="setGstVista(\'anual\')">▤ Anual</button></span>'
    +expBtns('gastos')+'<button class="btn btn-sm btn-primary" onclick="gastoForm()">+ Gasto</button></span></div>';
  if(gstVista==='mensual'){
    h+='<div class="toolbar"><div class="search"><input placeholder="Buscar gasto…" value="'+esc(gstQ)+'" oninput="gstQ=this.value;renderGstBody()"></div>'
      +'<select class="filt" onchange="gstCat=this.value;renderGstBody()"><option value="">Todas las categorías</option>'
      +gastoCats().map(function(c){return '<option'+(c===gstCat?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select>'
      +'<button class="btn btn-sm" onclick="gstCopiarFijos()" data-tip="Trae los gastos marcados como fijos (alquiler, luz, agua…) del mes anterior">🔁 Traer los fijos del mes anterior</button></div>';
    h+='<div class="months">'+MESES.map(function(m,i){return '<button class="mbtn'+(i===gstMes?' active':'')+'" onclick="setGstMes('+i+')">'+m.toUpperCase()+'</button>';}).join('')+'</div>';
  }
  h+='<div id="gst-body"></div>';
  h+='<div class="hon-foot">💡 Marcá un gasto como <b>fijo</b> (alquiler, luz, agua…) y el mes que viene lo traés con un solo botón. Las compras <b>a crédito</b> aparecen en el mes de cada cuota, nunca el total de golpe.</div>';
  $('#view-gastos').innerHTML=h;
  syncGstListas(); renderGstBody();
}
function renderGstBody(){ $('#gst-body').innerHTML = gstVista==='anual' ? gstTablaAnual() : gstTablaMensual(); }

function gstTablaMensual(){
  var y=gstYear(), m=gstMes, filas=gstFiltradas(), t=gstTotales(filas), comp=gstComprometido(y,m);
  var kpis='<div class="kpis '+(comp.n?'kpis-4':'kpis-3')+'">'
    +kpiM('A pagar este mes',money(t.total),'lo que vence en '+MESES_L[m],'')
    +kpiM('Pagado este mes',money(t.pag),'la plata que salió','k-green')
    +kpiM('Pendiente',money(t.pen),t.nVenc?('incluye '+money(t.venc)+' vencido de antes'):(t.nPen?(t.nPen+' sin pagar'):'todo al día'),t.nVenc?'k-alerta':(t.pen?'k-amber':''))
    +(comp.n?kpiM('Comprometido a futuro',money(comp.total),comp.n+(comp.n===1?' cuota por venir':' cuotas por venir'),'k-acento'):'')
    +'</div>';
  var cuerpo=filas.map(function(f){
    var g=f.g;
    var venceTxt=fDate(f.fecha);
    var facTxt=fDate(g.fecha);
    var pagoTxt=fDate(f.fechaPago);
    var venceTitle=f.tipo==='cuota'?'Vence la cuota':'Vence · factura del '+facTxt;
    return '<tr>'
      +'<td style="white-space:nowrap" title="'+esc(venceTitle)+'">'+(f.tipo==='cuota'?'<span class="gst-fecha">'+esc(venceTxt)+'</span>':cellIn('gastos',g.id,'vence',gstVence(g),{type:'date'}))+'</td>'
      +'<td><div class="name-cell"><span class="gst-ico">'+gstIco(g.cat)+'</span>'
        +(f.tipo==='cuota'?'<b class="gst-nom">'+esc(g.concepto)+'</b>':cellIn('gastos',g.id,'concepto',g.concepto,{ph:'¿Qué se pagó?'}))
        +(f.det?'<span class="gst-cuota">'+f.det+'</span>':'')
        +(g.fijo?'<span class="gst-fijo" data-tip="Gasto fijo: se puede traer del mes anterior con un botón">fijo</span>':'')
        +(f.arrastre?'<span class="gst-venc" data-tip="Venció en un mes anterior y sigue sin pagar">vencido</span>':'')
        +(!f.venceAca&&f.pagoAca?'<span class="gst-otro" data-tip="Vence en otro mes, pero se pagó en este">pagado este mes</span>':'')+'</div></td>'
      +'<td>'+(f.tipo==='cuota'?'<span class="muted-cell">'+esc(g.cat||'—')+'</span>':cellIn('gastos',g.id,'cat',g.cat,{list:'dl-gastocats',ph:'Categoría'}))+'</td>'
      +'<td class="num"><b>'+(f.importe===null?'<span class="muted-cell">—</span>':money(f.importe))+'</b></td>'
      +'<td class="num gst-iva">'+gstCeldaIva(f)+'</td>'
      +'<td>'+(f.pagado
        ?'<span class="pill st-done clk" onclick="gstTogglePago(\''+f.tipo+'\',\''+f.id+'\')" data-tip="Tocá para marcarlo como pendiente">Pagado</span>'+(f.fechaPago?'<span class="gst-pago">el '+esc(pagoTxt)+'</span>':'')
        :(f.vence&&f.vence<today()
          ?'<span class="pill st-venc clk" onclick="gstTogglePago(\''+f.tipo+'\',\''+f.id+'\')" data-tip="Venció y no está pagado. Tocá para marcarlo como pagado">Vencido</span>'
          :'<span class="pill st-pend clk" onclick="gstTogglePago(\''+f.tipo+'\',\''+f.id+'\')" data-tip="Tocá para marcarlo como pagado">Pendiente</span>'))+'</td>'
      +'<td><div class="row-act">'
        +'<button class="btn-ghost" title="Ver o editar" onclick="gastoForm(\''+g.id+'\')">✎</button>'
        +'<button class="btn-ghost" title="Duplicar" onclick="gstDuplicar(\''+g.id+'\')">⧉</button>'
        +'<button class="btn-ghost" title="Eliminar" style="color:var(--red)" onclick="gstBorrar(\''+f.tipo+'\',\''+f.id+'\')">🗑</button>'
      +'</div></td></tr>';
  }).join('');
  if(!cuerpo)cuerpo=emptyRow(7,'Todavía no hay gastos cargados en '+MESES_L[m]+'.');
  var pie=filas.length?'<tr class="gst-tot"><td colspan="3">Vence en '+MESES_L[m]+'</td><td class="num">'+money(t.total)+'</td><td colspan="3"></td></tr>':'';
  return kpis+'<div class="table-wrap"><table style="min-width:900px"><thead><tr><th>Vence</th><th>Gasto</th><th>Categoría</th><th class="num">Importe</th><th class="num">IVA</th><th>Estado</th><th></th></tr></thead>'
    +'<tbody>'+cuerpo+pie+'</tbody></table></div>'+gstResultado(y,m,t);
}
// Barra de resultado del mes: lo que entró, lo que salió y la diferencia.
function gstResultado(y,m,t){
  var cob=gstCobradoDelMes(y,m), iv=gstIvaDelMes(y,m), iva=iv.iva;
  var celda=function(l,v,cls){ return '<div class="gst-res-i"><span>'+l+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+v+'</b></div>'; };
  if(cob===null&&!iva)return '';
  var h='<div class="gst-res">';
  if(cob!==null){
    var dif=cob-t.pag;
    h+=celda('Honorarios cobrados',money(cob),'ok')
      +celda('Gastos pagados',money(t.pag))
      +celda('Diferencia',(dif<0?'− ':'')+money(Math.abs(dif)),dif<0?'neg':'ok');
  }
  if(iva)h+=celda(iv.ded===iva?'IVA de compras del mes':'IVA deducible del mes',money(iv.ded));
  return h+'</div>'+gstIvaDetalle(y,m);
}

/* El detalle del IVA del mes, factura por factura.
   Hace falta porque la tabla de arriba es CAJA (lo que vence o se paga en el mes) y el IVA es
   DEVENGADO (la fecha de la factura, como lo toma DGI). Son dos criterios distintos y correctos,
   pero sin esto el número del IVA no cierra con lo que se ve y no hay forma de auditarlo:
   una compra facturada en octubre y pagada a crédito desde noviembre no figura en octubre,
   aunque su IVA sí cuenta en octubre. */
function gstIvaDetalle(y,m){
  var enTabla={};
  gstFilasMes(y,m).forEach(function(f){ enTabla[f.g.id]=true; });
  var filas=Store.all('gastos').filter(function(g){
    return gstAnioDe(g)===y&&gstMesDe(g)===m&&(honNum(g.iva)||0)>0;
  }).sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  if(!filas.length)return '';
  var mitad=filas.some(function(g){ return (g.ivaDed||100)!==100; });
  var fuera=filas.filter(function(g){ return !enTabla[g.id]; }).length;
  var h='<details class="gst-ivadet"><summary>Ver de dónde sale el IVA de '+MESES_L[m].toLowerCase()
    +(fuera?' <span class="gst-ivadet-n">'+fuera+' factura'+(fuera===1?'':'s')+' que no se ve'+(fuera===1?'':'n')+' arriba</span>':'')
    +'</summary><table class="gst-ivatab"><thead><tr><th>Factura</th><th>Fecha</th><th class="num">IVA</th>'
    +(mitad?'<th class="num">Deducible</th>':'')+'<th></th></tr></thead><tbody>';
  var tot=0, totDed=0;
  filas.forEach(function(g){
    var iva=honNum(g.iva)||0, ded=gstIvaDeducible(g); tot+=iva; totDed+=ded;
    h+='<tr'+(enTabla[g.id]?'':' class="gst-ivafuera"')+'><td>'+esc(g.concepto||'(sin concepto)')+'</td>'
      +'<td>'+fDate(g.fecha)+'</td><td class="num">'+money(iva)+'</td>'
      +(mitad?'<td class="num">'+((g.ivaDed||100)===100?money(ded):'<b>'+money(ded)+'</b> <span class="muted-cell">('+(g.ivaDed||100)+'%)</span>')+'</td>':'')
      +'<td class="gst-ivanota">'+(enTabla[g.id]?'':(g.forma==='credito'?'a crédito: se paga en cuotas desde otro mes':'se paga en otro mes'))+'</td></tr>';
  });
  h+='</tbody><tfoot><tr><td colspan="2"><b>Total del mes</b></td><td class="num"><b>'+money(tot)+'</b></td>'
    +(mitad?'<td class="num"><b>'+money(totDed)+'</b></td>':'')+'<td></td></tr></tfoot></table>'
    +'<div class="gst-ivapie">El IVA va siempre al mes de la <b>fecha de la factura</b>, sin importar cómo ni cuándo se pague. '
    +'Por eso puede haber facturas acá que no estén en la lista de arriba, que muestra la plata que sale cada mes.</div></details>';
  return h;
}

function gstTablaAnual(){
  var y=gstYear(), cats=[], porCat={}, porMes=new Array(12).fill(0), total=0;
  for(var m=0;m<12;m++){
    gstFilasCaja(y,m).forEach(function(f){
      var c=(f.g.cat||'Sin categoría').trim(), n=f.importe||0;
      if(!porCat[c]){ porCat[c]=new Array(12).fill(0); cats.push(c); }
      porCat[c][m]+=n; porMes[m]+=n; total+=n;
    });
  }
  cats.sort(function(a,b){ var sa=porCat[a].reduce(function(x,z){return x+z;},0), sb=porCat[b].reduce(function(x,z){return x+z;},0); return sb-sa; });
  var meses=0; porMes.forEach(function(v){ if(v)meses++; });
  var kpis='<div class="kpis kpis-2">'
    +kpiM('Total del año',money(total),y,'')
    +kpiM('Promedio por mes',money(meses?Math.round(total/meses):0),meses?('sobre '+meses+(meses===1?' mes con gastos':' meses con gastos')):'','')
    +'</div>';
  if(!cats.length)return kpis+'<div class="table-wrap"><table><tbody>'+emptyRow(1,'Todavía no hay gastos cargados en '+y+'.')+'</tbody></table></div>';
  var head='<tr><th>Categoría</th>'+MESES.map(function(m){return '<th class="num">'+m+'</th>';}).join('')+'<th class="num">Total</th></tr>';
  var cuerpo=cats.map(function(c){
    var fila=porCat[c], suma=fila.reduce(function(x,z){return x+z;},0);
    return '<tr><td><div class="name-cell"><span class="gst-ico">'+gstIco(c)+'</span><b>'+esc(c)+'</b></div></td>'
      +fila.map(function(v){return '<td class="num">'+(v?numTxt(v):'<span class="muted-cell">—</span>')+'</td>';}).join('')
      +'<td class="num"><b>'+money(suma)+'</b></td></tr>';
  }).join('');
  var pie='<tr class="gst-tot"><td>Total por mes</td>'+porMes.map(function(v){return '<td class="num">'+(v?numTxt(v):'—')+'</td>';}).join('')+'<td class="num">'+money(total)+'</td></tr>';
  return kpis+'<div class="table-wrap"><table style="min-width:1040px"><thead>'+head+'</thead><tbody>'+cuerpo+pie+'</tbody></table></div>';
}

/* ===== traer los gastos fijos del mes anterior ===== */
function gstCopiarFijos(){
  var y=gstYear(), m=gstMes, pm=m-1, py=y; if(pm<0){ pm=11; py--; }
  var fijos=Store.all('gastos').filter(function(g){ return g.fijo&&g.forma!=='credito'&&gstAnioDe(g)===py&&gstMesDe(g)===pm; });
  if(!fijos.length){ toast('El mes anterior no tiene gastos fijos marcados'); return; }
  var yaHay=Store.all('gastos').filter(function(g){ return gstAnioDe(g)===y&&gstMesDe(g)===m; }), nuevos=0;
  fijos.forEach(function(g){
    var repetido=yaHay.some(function(x){ return (x.concepto||'').trim().toLowerCase()===(g.concepto||'').trim().toLowerCase(); });
    if(repetido)return;
    var nf=y+'-'+String(m+1).padStart(2,'0')+'-'+((g.fecha||'').slice(8,10)||'01');   // el vencimiento se corre igual
    Store.upsert('gastos',{concepto:g.concepto,cat:g.cat,importe:g.importe,proveedor:g.proveedor||'',medio:g.medio||'',
      fecha:nf, vence:g.vence?gstSumarMeses(g.vence,gstMesesEntre(g.fecha,nf)):'', pagado:false, fechaPago:'', factura:'',
      fijo:true, forma:'contado', conIva:!!g.conIva, iva:g.conIva?g.iva:0, notas:''});
    nuevos++;
  });
  renderGastos();
  toast(nuevos?('✓ Se trajeron '+nuevos+' gastos fijos de '+MESES_L[pm]):'Esos gastos fijos ya estaban cargados');
}

/* ===== datos de ejemplo para la demostración (todos inventados) ===== */
function seedGastos(){
  var yy=new Date().getFullYear(), mm=new Date().getMonth(), hoy=new Date().getDate();
  var f=function(m,d){ return yy+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); };
  var fijos=[
    {concepto:'Alquiler de la oficina',cat:'Alquiler',importe:28000,proveedor:'Inmobiliaria del Centro',medio:'Transferencia',dia:5},
    // UTE y OSE: la factura llega el 25 del mes anterior y vence el 12 (se ve en el mes en que vence).
    {concepto:'UTE',cat:'Luz',importe:3450,proveedor:'UTE',medio:'BROU',dia:12,factDia:25},
    {concepto:'OSE',cat:'Agua',importe:980,proveedor:'OSE',medio:'BROU',dia:12,factDia:25},
    {concepto:'Antel fibra y teléfono',cat:'Internet y teléfono',importe:2190,proveedor:'Antel',medio:'BROU',dia:15},
    {concepto:'Sistema de contabilidad (mensual)',cat:'Software y sistemas',importe:4200,proveedor:'Soporte Informático SRL',medio:'Transferencia',dia:3},
    // La limpieza se paga a fin de mes: en el mes en curso queda pendiente, que es lo normal.
    {concepto:'Servicio de limpieza',cat:'Limpieza',importe:2800,proveedor:'Marta Do Santos',medio:'Efectivo',dia:28},
  ];
  var fd=function(m,d){ var t=new Date(yy,m,d); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
  var out=[];
  // Los gastos fijos de todo el año, para que la vista anual tenga historia de verdad.
  for(var m=0;m<=mm;m++){
    fijos.forEach(function(g,i){
      var pago=(m<mm)||(g.dia<=hoy);
      out.push({id:'g'+m+'-'+i,fecha:g.factDia?fd(m-1,g.factDia):f(m,g.dia),vence:g.factDia?f(m,g.dia):'',concepto:g.concepto,cat:g.cat,importe:g.importe,proveedor:g.proveedor,
        medio:g.medio,pagado:pago,fechaPago:pago?f(m,g.dia):'',factura:'',fijo:true,forma:'contado',conIva:false,iva:0,notas:''});
    });
  }
  out=out.concat(seedGastosVence(),seedGastosDelAnio());
  out.push({id:'gx1',fecha:f(mm,8),concepto:'Resma de hojas y tóner',cat:'Papelería y librería',importe:1870,proveedor:'Librería Central',
    medio:'Efectivo',pagado:true,fechaPago:f(mm,8),factura:'A 4821',fijo:false,forma:'contado',conIva:true,iva:337,ivaModo:'incluido',ivaDed:100,notas:''});
  out.push({id:'gx5',fecha:f(mm,22),concepto:'Combustible y peajes',cat:'Movilidad',importe:3200,proveedor:'Ancap',
    medio:'Visa',pagado:true,fechaPago:f(mm,22),factura:'B 9134',fijo:false,forma:'contado',conIva:true,iva:577,ivaModo:'incluido',ivaDed:50,notas:'El IVA del combustible se computa al 50%'});
  // Una compra a crédito, para que se vea cómo funcionan las cuotas.
  out.push({id:'gx2',fecha:f(mm,17),concepto:'Escritorio y silla',cat:'Muebles y útiles',importe:12600,proveedor:'Mueblería Rivera',
    medio:'Visa',pagado:false,fechaPago:'',factura:'A 1207',fijo:false,forma:'credito',cuotas:6,primera:gstSumarMeses(f(mm,17),1),
    conIva:true,iva:2272,ivaModo:'incluido',ivaDed:50,notas:'6 cuotas sin interés · el IVA de muebles se computa al 50%'});
  // Nada pagado con fecha posterior a hoy: queda pendiente.
  var hoyIso=today(); out.forEach(function(x){ if(x.pagado&&x.fechaPago>hoyIso){ x.pagado=false; x.fechaPago=''; } });
  return out;
}
/* Compras sueltas repartidas en el año: son las que le dan historia a la vista anual y hacen que
   las categorías no queden todas iguales. Todas inventadas. */
function seedGastosDelAnio(){
  var yy=new Date().getFullYear(), mm=new Date().getMonth();
  var f=function(m,d){ var t=new Date(yy,m,d); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
  // mes · día · concepto · categoría · importe · proveedor · medio · IVA (0 = sin IVA) · % deducible
  var compras=[
    [0,19,'Matrícula del Colegio de Contadores','Impuestos y tasas',9600,'Colegio de Contadores','Transferencia',0,100],
    [1,6,'Antivirus y respaldo en la nube (anual)','Software y sistemas',7400,'Soporte Informático SRL','Visa',1335,100],
    [1,23,'Sillas para la sala de espera','Muebles y útiles',14200,'Mueblería Rivera','Transferencia',2561,50],
    [2,11,'Cartelería de la oficina','Otros',8900,'Gráfica del Norte','Transferencia',1605,100],
    [3,4,'Resmas, carpetas y biblioratos','Papelería y librería',3650,'Librería Central','Efectivo',658,100],
    [3,27,'Curso de actualización tributaria','Otros',12500,'Instituto de Capacitación','Visa',0,100],
    [4,9,'Reparación del aire acondicionado','Otros',5200,'Refrigeración Artigas','Efectivo',938,100],
    [5,16,'Tóner y mantenimiento de impresora','Papelería y librería',4480,'Copicentro','Transferencia',808,100],
    [6,2,'Publicidad en redes','Otros',6000,'Agencia Enlace','Visa',1082,100],
    [6,21,'Combustible y peajes','Movilidad',2950,'Ancap','Visa',532,50],
    [7,13,'Notebook para la oficina','Muebles y útiles',48900,'Tienda Digital','Transferencia',8820,50],
    [8,5,'Honorarios del abogado (consulta)','Otros',7500,'Dr. Pereyra','Transferencia',1352,100],
    [8,24,'Combustible y peajes','Movilidad',3100,'Ancap','Visa',559,50],
  ];
  var out=[];
  compras.forEach(function(c,i){
    if(c[0]>mm)return;
    var fecha=f(c[0],c[1]);
    out.push({id:'ga'+i,fecha:fecha,concepto:c[2],cat:c[3],importe:c[4],proveedor:c[5],medio:c[6],
      pagado:true,fechaPago:fecha,factura:'A-'+(5200+i*7),fijo:false,forma:'contado',
      conIva:!!c[7],iva:c[7],ivaModo:'incluido',ivaDed:c[8],notas:c[8]===50?'IVA computado al 50%':''});
  });
  return out;
}
// Dos ejemplos para ver el vencimiento y el pago: uno vencido el mes pasado que sigue sin pagar (sale en rojo
// en el mes en curso) y uno que vence el mes que viene pero ya se pagó (sale como «pagado este mes»).
function seedGastosVence(){
  var yy=new Date().getFullYear(), mm=new Date().getMonth();
  var fd=function(m,d){ var t=new Date(yy,m,d); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
  return [
    {id:'gv1',fecha:fd(mm-1,14),vence:fd(mm-1,28),concepto:'Contribución inmobiliaria (cuota)',cat:'Impuestos y tasas',importe:3900,proveedor:'Intendencia',
      medio:'',pagado:false,fechaPago:'',factura:'',fijo:false,forma:'contado',conIva:false,iva:0,notas:'Venció el mes pasado: aparece en rojo hasta que se pague'},
    // Con IVA a propósito: es el ejemplo de una factura de ESTE mes que vence el que viene y ya se pagó.
    // Sirve para ver que su IVA cuenta en el mes de la factura, y que el gasto no se repite en dos meses.
    {id:'gv2',fecha:fd(mm,1),vence:fd(mm+1,5),concepto:'Seguro de la oficina',cat:'Otros',importe:2650,proveedor:'Aseguradora del Litoral',
      medio:'Visa',pagado:true,fechaPago:fd(mm,7),factura:'A-9120',fijo:false,forma:'contado',conIva:true,ivaModo:'incluido',iva:478,ivaDed:100,
      notas:'Vence el mes que viene, pero ya se pagó'},
  ];
}
// Las cuotas de los ejemplos (se arman a partir de la compra a crédito).
function seedCuotas(gastos){
  var g=(gastos||[]).find(function(x){ return x.forma==='credito'; });
  if(!g)return [];
  var N=g.cuotas, total=honNum(g.importe)||0, base=Math.floor(total/N*100)/100, acum=0, out=[];
  for(var n=1;n<=N;n++){
    var ultima=(n===N), imp=ultima?Math.round((total-acum)*100)/100:base;
    if(!ultima)acum=Math.round((acum+base)*100)/100;
    out.push({id:'c'+n,gastoId:g.id,n:n,importe:imp,fecha:gstSumarMeses(g.primera,n-1),pagado:false,fechaPago:''});
  }
  return out;
}
