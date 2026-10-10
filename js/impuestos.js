/*
 * Subpestaña: Impuestos (dentro de Finanzas).
 *
 * UN SOLO CUADRO (decisión de la usuaria, 30/09/2026): el «Registro del año», con una fila por
 * período. Ahí está todo: el IVA facturado, el IVA de gastos, lo que da a pagar de IVA, el IRPF,
 * el vencimiento, el estado y el comprobante.
 *   - El IVA facturado y el IVA de gastos los calcula la página.
 *   - El IVA a pagar y el IRPF los escribe ella (el IVA viene sugerido).
 * IVA e IRPF van juntos en la misma fila porque vencen el mismo día: DGI los pone en la misma
 * línea de su cuadro de Servicios Personales.
 *
 * Antes hubo otros dos cuadros («Por mes» y «Otros impuestos y aportes») y una calculadora de IVA;
 * los tres se sacaron a pedido de la usuaria. Están en el historial de Git por si se retoman.
 */
/* ===== IMPUESTOS ===== */
var impAnio=null;
const IMP_EST={pag:'Pagado',pen:'Pendiente',venc:'Vencido'};

function impYear(){ return impAnio||anioActivo(); }
function setImpAnio(y){ impAnio=y; renderImpuestos(); }
function impFrecuencia(){ return vencCfg().frecuencia==='mensual'?'mensual':'bimestral'; }
function impFrecuenciaValida(f){ return f==='mensual'||f==='bimestral'; }
function impEsFechaIsoValida(iso){
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
  var p=iso.split('-').map(Number), d=new Date(p[0],p[1]-1,p[2]);
  return d.getFullYear()===p[0]&&d.getMonth()===(p[1]-1)&&d.getDate()===p[2];
}
function impFechaCampoValida(iso){
  if(!iso)return true;
  return impEsFechaIsoValida(iso)&&iso>='2000-01-01'&&iso<='2099-12-31';
}
function impFilaTieneDatos(f){
  if(!f)return false;
  return honNum(f.iva)!==null
    || honNum(f.irpf)!==null
    || !!(f.venc||'')
    || !!f.pagado
    || !!(f.fechaPago||'')
    || !!(f.comprobante||'')
    || !!(f.notas||'');
}
function impHayLegacyFrecuencia(){
  return Store.all('impuestos').some(function(x){
    return x&&x.tipo==='periodo'&&!impFrecuenciaValida(x.fr)&&impFilaTieneDatos(x);
  });
}
function setImpFrecuencia(f){
  f=impFrecuenciaValida(f)?f:'bimestral';
  var actual=impFrecuencia();
  if(f===actual)return true;
  // Sin frecuencia histórica en cada fila no se puede distinguir con seguridad el modo de origen.
  if(impHayLegacyFrecuencia()){
    // El aviso lo lee una contadora, no un programador: hay que decirle qué pasa y qué hacer.
    toast('No se puede cambiar: ya hay períodos cargados de antes y no sabemos si eran mensuales o bimestrales. Escribinos y lo acomodamos.');
    return false;
  }
  vencCfg().frecuencia=f;
  Store.save();
  renderImpuestos();
  return true;
}

/* ===== LO QUE CALCULA LA PÁGINA ===== */
// IVA de lo facturado en Honorarios (honCalc ya lo cobra solo cuando la fila tiene N° de factura).
// IVA de lo facturado en Honorarios: solo lo que tiene N° de factura, y en el mes de la FECHA DE
// FACTURA (una factura de setiembre emitida en octubre va al IVA de octubre). Ver honorarios-factura.js.
function impIvaVentas(y,m){ return honNumerosMes(y,m).iva; }
// IVA deducible de los gastos del mes (ya contempla el 50% cuando corresponde).
function impIvaCompras(y,m){ return Math.round(gstIvaDelMes(y,m).ded*100)/100; }

/* Los períodos del año, según trabaje mensual o bimestral.
   El IVA de Servicios Personales vence por bimestre: el bimestre i (meses 2i y 2i+1) vence en el
   mes 2i+2, igual que el cuadro de DGI. Enero-Febrero vence en marzo, y Noviembre-Diciembre en
   enero del año siguiente (ese queda sin fecha hasta que DGI publique el año nuevo).
   En la vista mensual, cada mes muestra el vencimiento del bimestre al que pertenece. */
function impPeriodos(y){
  var bim=impFrecuencia()==='bimestral', out=[];
  for(var i=0;i<(bim?6:12);i++){
    var meses=bim?[i*2,i*2+1]:[i];
    var b=bim?i:Math.floor(i/2), vAnio=(b===5?y+1:y), vMes=(b*2+2)%12;
    var v=0,c=0;
    meses.forEach(function(m){ v+=impIvaVentas(y,m); c+=impIvaCompras(y,m); });
    v=Math.round(v*100)/100; c=Math.round(c*100)/100;
    out.push({i:i,meses:meses,ventas:v,compras:c,sugerido:Math.round((v-c)*100)/100,
      label:bim?(MESES_L[i*2]+'-'+MESES_L[i*2+1]):MESES_L[i],
      venc:vencFecha('dgi_sp',vAnio,vMes)});
  }
  return out;
}

function impPeriodoPorIndice(y,pi){
  var lista=impPeriodos(y);
  return lista.find(function(p){ return p.i===pi; })||null;
}

function impNuevoId(y,pi,fr){
  var tag=fr==='mensual'?'m':'b';
  var base='ip'+y+'-'+tag+'-'+pi;
  var id=base, n=1;
  var usados=new Set(Store.all('impuestos').map(function(r){ return String((r&&r.id)||''); }));
  while(usados.has(id)){ n++; id=base+'-'+n; }
  return id;
}

/* ===== EL REGISTRO ===== */
/* Una fila por período. Se crea recién cuando ella escribe algo. */
function impFilaPeriodo(y,pi,crear){
  var fr=impFrecuencia();
  var f=Store.all('impuestos').find(function(x){ return x.anio===y&&x.pi===pi&&x.fr===fr; });
  if(!f){
    // Compatibilidad con filas históricas sin frecuencia explícita (sin migración automática).
    f=Store.all('impuestos').find(function(x){ return x.anio===y&&x.pi===pi&&!impFrecuenciaValida(x.fr); });
  }
  if(!f&&crear){
    f={id:impNuevoId(y,pi,fr),tipo:'periodo',anio:y,pi:pi,
       fr:fr,iva:null,irpf:null,venc:'',pagado:false,fechaPago:'',comprobante:'',notas:''};
    Store.data.impuestos.push(f);
  }
  return f;
}
// (impTotalFila quedó sin uso al arreglar los indicadores: ahora todo pasa por impTotalEfectivo.)

/* EL IVA A PAGAR: automático por defecto, manual si ella escribe (07/10/2026, pedido de la usuaria).
   - Vacío en la base = **automático**: muestra lo que calcula la página (IVA facturado − IVA de gastos)
     y se actualiza solo cuando cambian Honorarios o Gastos.
   - Con algo escrito = **manual**: manda lo que ella puso y no se mueve más. Para volver al automático,
     se borra el campo.
   - Al marcar el período como PAGADO, si estaba en automático se fija el importe de ese momento: lo que
     se pagó es un hecho y no puede cambiar después porque se corrigió un honorario viejo. */
function impIvaEfectivo(f,p){
  var manual=honNum(f&&f.iva);
  if(manual!==null)return manual;
  return (p&&p.sugerido)?p.sugerido:null;
}
function impEsIvaAuto(f){ return honNum(f&&f.iva)===null; }
function impTotalEfectivo(f,p){ return (impIvaEfectivo(f,p)||0)+(honNum(f&&f.irpf)||0); }
function impVencEfectivo(y,p,f){
  var manual=(f&&impFechaCampoValida(f.venc)&&f.venc)||'';
  if(manual)return manual;
  var cfg=(p&&impFechaCampoValida(p.venc)&&p.venc)||'';
  return cfg;
}
function impEstadoPeriodo(y,p,f){
  f=f||{};
  if(f.pagado)return 'pag'; // Pagado siempre tiene prioridad.
  var venc=impVencEfectivo(y,p,f);
  return (venc&&daysTo(venc)<0&&impTotalEfectivo(f,p)>0)?'venc':'pen';
}
function impMostrarEstado(f,p){ return honNum(f&&f.iva)!==null||honNum(f&&f.irpf)!==null||!!(p&&p.sugerido); }
// Para el contador rojo de la subpestaña y el indicador del Panel.
function impVencidos(y){
  y=+y||impYear();
  return impPeriodos(y).map(function(p){
    var f=impFilaPeriodo(y,p.i,false)||{};
    return {p:p,f:f,est:impEstadoPeriodo(y,p,f)};
  }).filter(function(x){ return x.est==='venc'&&impTotalEfectivo(x.f,x.p)>0; }).map(function(x){ return x.f; });
}

function impCampoPermitido(c){ return c==='iva'||c==='irpf'||c==='venc'||c==='fechaPago'||c==='comprobante'||c==='notas'; }
function impNormalizarValor(campo,valor){
  var raw=valor==null?'':String(valor);
  var txt=raw.trim();
  if(campo==='iva'||campo==='irpf'){
    if(txt==='')return {ok:true,val:null};
    var n=honNum(raw);
    if(n===null||!isFinite(n))return {ok:false,error:'El importe ingresado no es válido'};
    return {ok:true,val:n};
  }
  if(campo==='venc'||campo==='fechaPago'){
    if(txt==='')return {ok:true,val:''};
    if(!impFechaCampoValida(txt))return {ok:false,error:'La fecha ingresada no es válida'};
    return {ok:true,val:txt};
  }
  return {ok:true,val:raw};
}
function impDebeCrear(campo,val){
  if(campo==='iva'||campo==='irpf')return val!==null;
  return !!String(val||'').trim();
}
function impValorIgual(campo,a,b){
  if(campo==='iva'||campo==='irpf')return honNum(a)===honNum(b);
  return String(a||'')===String(b||'');
}

function impSetPer(y,pi,campo,valor){
  y=+y; pi=+pi;
  if(!Number.isInteger(y)||y<2000||y>2099){ toast('Año inválido para el registro'); return false; }
  var p=impPeriodoPorIndice(y,pi);
  if(!p){ toast('Período inválido para el registro'); return false; }
  if(!impCampoPermitido(campo)){ toast('Campo no permitido en Impuestos'); return false; }

  var norm=impNormalizarValor(campo,valor);
  if(!norm.ok){ toast(norm.error); return false; }

  var f=impFilaPeriodo(y,pi,false);
  if(!f&&!impDebeCrear(campo,norm.val))return false;
  if(!f)f=impFilaPeriodo(y,pi,true);

  var previo=f[campo];
  if(impValorIgual(campo,previo,norm.val))return false;

  f[campo]=norm.val;
  Store.save();
  renderImpuestos();
  return true;
}
function impTogglePagoPer(y,pi){
  y=+y; pi=+pi;
  if(!Number.isInteger(y)||!impPeriodoPorIndice(y,pi)){ toast('No se pudo cambiar el estado: período inválido'); return false; }
  var f=impFilaPeriodo(y,pi,true);
  f.pagado=!f.pagado; if(f.pagado&&!f.fechaPago)f.fechaPago=today(); if(!f.pagado)f.fechaPago='';
  // Se fija lo calculado: lo que se pago no puede cambiar despues por corregir un honorario viejo.
  if(f.pagado&&impEsIvaAuto(f)){ var pp=impPeriodoPorIndice(y,pi); if(pp&&pp.sugerido)f.iva=pp.sugerido; }
  Store.save(); renderImpuestos();
  return true;
}
function impRefrescar(){ var k=document.getElementById('imp-kpis'); if(k)k.innerHTML=impKpisHtml(impYear()); }

/* Rellena el IVA de los períodos que estén vacíos con lo que calculó la página. */
function impUsarCalculado(){
  var y=impYear(), n=0;
  impPeriodos(y).forEach(function(p){
    if(!p.ventas&&!p.compras)return;
    var f=impFilaPeriodo(y,p.i,false);
    if(f&&f.pagado)return; // nunca tocar registros pagados automáticamente
    if(f&&honNum(f.iva)!==null)return; // respeta manuales, incluido cero
    var row=f||impFilaPeriodo(y,p.i,true);
    if(honNum(row.iva)===p.sugerido)return;
    row.iva=p.sugerido; n++;
  });
  if(n){ Store.save(); renderImpuestos(); }
  toast(n?('✓ '+n+' período'+(n===1?'':'s')+' completado'+(n===1?'':'s')):'Ya estaban todos completos');
}

/* ===== LA PANTALLA ===== */
function renderImpuestos(){
  var y=impYear();
  var h='<div class="view-head"><div><h2>Impuestos <span style="color:var(--muted);font-weight:400">'+y+'</span></h2>'
    +'<div class="sub">Lo que facturaste, lo que gastaste y lo que hay que pagar</div></div>'
    +'<span class="sld-top">'+yearSelect(y,'setImpAnio')
    +'<span class="gseg"><button class="gv'+(impFrecuencia()==='bimestral'?' active':'')+'" onclick="setImpFrecuencia(\'bimestral\')">Bimestral</button>'
    +'<button class="gv'+(impFrecuencia()==='mensual'?' active':'')+'" onclick="setImpFrecuencia(\'mensual\')">Mensual</button></span>'
    +expBtns('imp')+'</span></div>';
  h+='<div id="imp-kpis">'+impKpisHtml(y)+'</div>';
  h+=impTablaPeriodos(y);
  h+='<div class="hon-foot">💡 El <b>IVA facturado</b> sale de Honorarios: cuenta solo las filas con N° de factura y va al mes de la <b>fecha de factura</b>. '
    +'El <b>IVA de gastos</b> sale de Gastos y ya contempla el 50% cuando corresponde. '
    +'El <b>IVA a pagar</b> viene <b style="font-style:italic;color:var(--azul)">calculado</b> (facturado − gastos) y se actualiza solo. '
    +'Si escribís otro importe, manda el tuyo y deja de moverse; si borrás el campo, vuelve al calculado. '
    +'Al marcar un período como <b>pagado</b> se fija el importe de ese momento. '
    +'Las fechas de vencimiento se corrigen en <b>⋯ → Configuración</b>.</div>';
  $('#view-imp').innerHTML=h;
}

function impMoney(n){ return n<0 ? '− '+money(Math.abs(n)) : money(n); }

function impKpisHtml(y){
  var per=impPeriodos(y), v=0,c=0,aPagar=0,sinPagar=0,venc=0;
  per.forEach(function(p){
    v+=p.ventas; c+=p.compras;
    // Tiene que ser el total EFECTIVO, y hay que contar también los períodos que todavía no
    // tienen fila escrita: el IVA se calcula solo, así que igual hay algo para pagar. Sumando
    // nada más que lo escrito a mano, estos dos números quedaban muy por debajo del total de la
    // columna «IVA a pagar». Es el mismo total que usan el estado y el contador rojo.
    var f=impFilaPeriodo(y,p.i,false);
    var t=impTotalEfectivo(f,p); aPagar+=t;
    if(!f||!f.pagado){ sinPagar+=t; if(impEstadoPeriodo(y,p,f)==='venc'&&t>0)venc++; }
  });
  return '<div class="kpis kpis-4">'
    +kpiM('IVA facturado · '+y,money(v),'de los honorarios con factura','')
    +kpiM('IVA de gastos',money(c),'deducible','k-green')
    +kpiM('A pagar en el año',money(aPagar),'IVA e IRPF','')
    +kpiM('Sin pagar',money(sinPagar),venc?(venc+' vencido'+(venc===1?'':'s')):'al día',venc?'k-alerta':(sinPagar?'k-amber':'k-green'))
    +'</div>';
}

function impTablaPeriodos(y){
  var per=impPeriodos(y), t={v:0,c:0,iva:0,irpf:0};
  var filas=per.map(function(p){
    var f=impFilaPeriodo(y,p.i,false)||{};
    var iva=impIvaEfectivo(f,p), auto=impEsIvaAuto(f), irpf=honNum(f.irpf);
    var venc=impVencEfectivo(y,p,f);
    var est=impEstadoPeriodo(y,p,f);
    var hayAlgo=p.ventas||p.compras||iva!==null||irpf!==null;
    var hayMontos=impMostrarEstado(f,p);
    var sinFechaNovDic=!venc&&impFrecuencia()==='bimestral'&&p.i===5;
    t.v+=p.ventas; t.c+=p.compras; t.iva+=iva||0; t.irpf+=irpf||0;
    return '<tr'+(hayAlgo?'':' class="imp-vacio"')+'>'
      +'<td><b>'+p.label+'</b></td>'
      +'<td class="imp-venc">'+impInPer(y,p.i,'venc',venc,{type:'date'})
        +(sinFechaNovDic?'<div class="imp-falta">vence en enero de '+(y+1)+', que DGI publica en diciembre</div>':'')+'</td>'
      +'<td class="num">'+(p.ventas?money(p.ventas):'—')+'</td>'
      +'<td class="num">'+(p.compras?money(p.compras):'—')+'</td>'
      +'<td>'+impInPer(y,p.i,'iva',iva,{ph:'—',sug:p.sugerido,auto:auto&&iva!==null})+'</td>'
      +'<td>'+impInPer(y,p.i,'irpf',irpf,{ph:'—'})+'</td>'
      +'<td>'+(hayMontos?'<span class="pill clk imp-'+est+'" onclick="impTogglePagoPer('+y+','+p.i+')">'+IMP_EST[est]+'</span>'
                         :'<span class="muted-cell">—</span>')+'</td>'
      +'<td>'+impInPer(y,p.i,'fechaPago',f.fechaPago,{type:'date'})+'</td>'
      +'<td>'+impInPer(y,p.i,'comprobante',f.comprobante,{ph:'+ N°'})+'</td></tr>';
  }).join('');
  var tot='<tr class="gst-tot"><td>TOTAL '+y+'</td><td></td><td class="num">'+money(t.v)+'</td><td class="num">'+money(t.c)+'</td>'
    +'<td class="num"><b>'+money(t.iva)+'</b></td><td class="num"><b>'+money(t.irpf)+'</b></td><td colspan="3"></td></tr>';
  return '<div class="card-head imp-head"><h3>Registro de '+y+'</h3>'
    +'<button class="btn btn-sm" onclick="impUsarCalculado()">📌 Fijar el IVA calculado</button></div>'
    +'<div class="table-wrap"><table style="min-width:1020px"><thead><tr>'
    +'<th>Período</th><th class="imp-venc">Vence</th>'
    +'<th class="num">IVA facturado</th><th class="num">IVA de gastos</th>'
    +'<th class="num">IVA a pagar</th><th class="num">IRPF</th>'
    +'<th>Estado</th><th>Fecha de pago</th><th>Comprobante</th>'
    +'</tr></thead><tbody>'+filas+tot+'</tbody></table></div>';
}

function impInPer(y,pi,campo,v,o){
  o=o||{}; var d=o.type==='date';
  var val=(campo==='iva'||campo==='irpf')?numTxt(v):(v==null?'':v);
  return '<input class="cell-in'+(d?'':' num')+(o.auto?' imp-auto':'')+'"'+(d?' type="date"'+DR:'')
    +' value="'+esc(val)+'" placeholder="'+esc(o.ph||'—')+'"'
    +(o.auto?' data-tip="Lo calcula la página (IVA facturado − IVA de gastos) y se actualiza solo. Si escribís otro importe, manda el tuyo; si lo borrás, vuelve al calculado."'
            :(o.sug?' data-tip="Escrito por vos. La página calcula '+esc(numTxt(o.sug))+'. Borrá el campo para volver al calculado."':''))
    +' onchange="'+(d?'if(dateOk(this))':'')+'impSetPer('+y+','+pi+',\''+campo+'\',this.value)">';
}

function impExpRows(){
  var y=impYear(), datos=[];
  impPeriodos(y).forEach(function(p){
    var f=impFilaPeriodo(y,p.i,false)||{};
    var venc=impVencEfectivo(y,p,f);
    var est=impEstadoPeriodo(y,p,f);
    datos.push([p.label,fDate(venc),numTxt(p.ventas),numTxt(p.compras),
      numTxt(honNum(f.iva)),numTxt(honNum(f.irpf)),
      IMP_EST[est],fDate(f.fechaPago),f.comprobante||'']);
  });
  return {title:'Impuestos '+y,
    cols:['Período','Vence','IVA facturado','IVA de gastos','IVA a pagar','IRPF','Estado','Fecha de pago','Comprobante'],
    data:datos};
}

/* Datos de ejemplo para la demostración (inventados).
   Coherentes con los honorarios de ejemplo: un solo cliente factura 8.900 por mes → IVA 1.958 →
   3.916 por bimestre. Los tres primeros bimestres pagos, el cuarto vencido. */
function seedImpuestos(){
  var y=new Date().getFullYear(), out=[];
  if(!VENC_TABLA[y])return out;
  // El IVA va en null a proposito: asi el demo muestra el calculo automatico de la pagina.
  [[0,null,2400,true],[1,null,2650,true],[2,null,2500,true],[3,null,2800,false]].forEach(function(p,i){
    var vMes=(p[0]*2+2)%12;
    // fr: en qué modo se cargó el período. SIN ESTO el botón Mensual/Bimestral queda bloqueado,
    // porque la página no puede saber si «período 0» era enero o enero-febrero (ver impHayLegacyFrecuencia).
    out.push({id:'ip'+i,tipo:'periodo',anio:y,pi:p[0],fr:'bimestral',iva:p[1],irpf:p[2],
      venc:vencFecha('dgi_sp',y,vMes)||'',pagado:p[3],
      fechaPago:p[3]?(vencFecha('dgi_sp',y,vMes)||''):'',comprobante:p[3]?'B-'+(4100+i):'',notas:''});
  });
  return out;
}
