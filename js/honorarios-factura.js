/*
 * HONORARIOS: MES CORRIENTE / MES VENCIDO Y FECHA DE FACTURA (oct. 2026, igual que en la página del
 * Estudio W. Machado, adaptado a cómo guarda los honorarios esta página).
 *
 * Cada fila de honMov es el MES DEL TRABAJO de un cliente (anio, mes). Aparte:
 *   - mv.fFac  'AAAA-MM-DD'  fecha de la factura → el IVA va al mes de esa fecha (devengado).
 *              Vacía = el mes del trabajo, como antes (lo ya cargado no se mueve).
 *   - mv.fecha 'AAAA-MM-DD'  fecha de cobro → la plata que entró (caja), como siempre.
 *   - r.facturacion 'vencido' | (vacío = mes corriente), en el cliente de Honorarios (honCli).
 *              Mes vencido: la factura se sugiere en el mes siguiente y no figura «Atrasado» hasta
 *              que termina ese mes.
 * Lo usan Honorarios (indicadores y tabla), Impuestos (IVA facturado) y Gastos (resultado del mes).
 */
function honEsVencido(r){ return !!r&&r.facturacion==='vencido'; }
function honYM(y,m){ return y+'-'+String(m+1).padStart(2,'0'); }
// El mes (AAAA-MM) al que va el IVA de un mes de trabajo.
function honMesFactura(mv,y,m){ var f=mv&&mv.fFac?String(mv.fFac):''; return /^\d{4}-\d{2}/.test(f)?f.slice(0,7):honYM(y,m); }
// Hasta cuándo se espera el cobro: fin del mes del trabajo, o del siguiente si es a mes vencido.
function honPlazoCobro(r,y,m){ return new Date(y,m+1+(honEsVencido(r)?1:0),0,23,59,59); }
// Fecha de factura sugerida al cargar el N°: hoy, si cae en el mes esperado; si no, el 1.º de ese mes.
function honFFacSugerida(r,y,m){
  var d=new Date(y,m+(honEsVencido(r)?1:0),1), esperado=honYM(d.getFullYear(),d.getMonth()), hoy=today();
  return hoy.slice(0,7)===esperado?hoy:esperado+'-01';
}

/* Los números del mes (y, m) mirando TODOS los meses cargados de todos los clientes:
   facturado = por fecha de factura (lo que va al IVA) · cobrado = por fecha de cobro (la plata que entró).
   Así una factura de diciembre emitida en enero cae en el IVA de enero del año siguiente. */
function honNumerosMes(y,m){
  var ym=honYM(y,m), r={fact:0,iva:0,nFact:0,deOtroMes:0,cobr:0,nCobr:0};
  Store.all('honMov').forEach(function(mv){
    var cli=Store.get('honCli',mv.rowId); if(!cli)return;
    var c=honCalc(cli,mv.anio,mv.mes); if(c.imp===null)return;
    if(mv.factura&&honMesFactura(mv,mv.anio,mv.mes)===ym){
      r.fact+=c.tot; r.iva+=c.iva; r.nFact++;
      if(!(mv.anio===y&&mv.mes===m))r.deOtroMes++;
    }
    if(mv.fecha&&String(mv.fecha).slice(0,7)===ym){ r.cobr+=c.tot; r.nCobr++; }
  });
  ['fact','iva','cobr'].forEach(function(k){ r[k]=Math.round(r[k]*100)/100; });
  return r;
}

/* Los indicadores de la vista mensual: el trabajo del mes, lo facturado, lo cobrado y lo pendiente. */
function honKpisMes(list,y,m){
  var del=0,nDel=0,pend=0,nPend=0,nAtr=0;
  list.forEach(function(c){ if(c.imp===null)return; del+=c.tot; nDel++; if(c.est!=='pag'){ pend+=c.tot; nPend++; if(c.est==='atr')nAtr++; } });
  var n=honNumerosMes(y,m), mes=MESES_L[m].toLowerCase();
  return '<div class="kpis">'
    +kpiM('Honorarios de '+mes,money(del),nDel+' cliente'+(nDel===1?'':'s')+' · el trabajo de este mes','')
    +kpiM('Facturado en '+mes,money(n.fact),'IVA '+money(n.iva)+' → va a Impuestos'+(n.deOtroMes?' · '+n.deOtroMes+' de otro mes':''),'k-acento')
    +kpiM('Cobrado en '+mes,money(n.cobr),n.nCobr+' cobro'+(n.nCobr===1?'':'s')+' por fecha de pago','k-green')
    +kpiM('Pendiente de cobro',money(pend),nPend?(nAtr?nAtr+' atrasado'+(nAtr===1?'':'s'):'todavía en plazo'):'nada pendiente',nAtr?'k-alerta':'k-amber')
    +'</div>';
}

// La celda «Fecha factura»: el campo y, si el IVA va a otro mes, a cuál.
function honFFacCelda(r,mv,y,m){
  var h=honIn(r.id,'fFac',mv.fFac,{type:'date'});
  if(mv.factura){
    var ym=honMesFactura(mv,y,m), p=ym.split('-').map(Number);
    if(ym!==honYM(y,m))h+='<span class="hon-iva-a" data-tip="El IVA de esta factura va al mes de la factura">IVA → '+MESES[p[1]-1].toLowerCase()+(p[0]!==y?' '+p[0]:'')+'</span>';
  }
  return h;
}
function honVencidoChip(r){ return honEsVencido(r)?' <span class="hon-venc-chip" data-tip="Factura a mes vencido: el cobro se espera hasta fin del mes siguiente">mes vencido</span>':''; }

function honEsNumeroFinito(n){ return typeof n==='number'&&isFinite(n); }

/* Ventana de UN mes de un cliente (se abre desde la vista anual, como en la página del Estudio W. Machado):
   se ve y se corrige ese mes sin salir de la vista anual. */
function honMesForm(rowId,m){
  var r=Store.get('honCli',rowId); if(!r)return;
  var y=honYear(), mv=honMovOf(rowId,y,m)||{};
  var impRaw=mv.importe!=null&&mv.importe!==''?mv.importe:r.importe;
  var impNum=honNum(impRaw);
  var imp=(impNum===null)?(impRaw==null?'':String(impRaw)):numTxt(impNum);
  curForm={form:'honmes',rowId:rowId,m:m};
  $('#modal-title').textContent=cliNameOr(r.clienteId)+' · '+MESES_L[m]+' '+y; $('#modal-del').style.display='none';
  $('#modal-body').innerHTML=(honEsVencido(r)?'<div class="hon-mes-nota">Este cliente factura a <b>mes vencido</b>: la factura de '+MESES_L[m].toLowerCase()+' se emite el mes siguiente.</div>':'')
    +'<div class="field"><label>Honorarios sin IVA</label><input id="hm-imp" value="'+esc(imp)+'" placeholder="Ej: 2.500" oninput="honMesCalc()"></div>'
    +'<div class="field-2"><div class="field"><label>N° de factura <span class="opt">(activa el IVA)</span></label><input id="hm-fac" value="'+esc(mv.factura||'')+'" placeholder="sin N° → sin IVA" oninput="honMesAlEscribir()"></div>'
    +'<div class="field"><label>Fecha de factura <span class="opt">(el IVA va a ese mes)</span></label><input type="date" id="hm-ffac"'+DR+' value="'+esc(mv.fFac||'')+'" onchange="honMesAyuda()"></div></div>'
    +'<div class="gst-ayuda" id="hm-ayuda" style="margin:-4px 0 10px"></div>'
    +'<div class="field-2"><div class="field"><label>Fecha de pago <span class="opt">(cuándo entró la plata)</span></label><input type="date" id="hm-fecha"'+DR+' value="'+esc(mv.fecha||'')+'"></div>'
    +'<div class="field"><label>Medio de pago</label><input id="hm-medio" list="dl-medio" autocomplete="off" value="'+esc(mv.medio||r.medio||'')+'"></div></div>'
    +'<div class="field"><label>Recibo <span class="opt">(opcional)</span></label><input id="hm-rec" value="'+esc(mv.recibo||'')+'"></div>'
    +'<div class="hon-mes-calc" id="hm-calc"></div>';
  $('#modal').classList.add('open');
  honMesCalc(); honMesAyuda();
}
// Al escribir el N°, la fecha de factura se completa sola (como en la vista mensual).
function honMesAlEscribir(){
  var f=document.getElementById('hm-fac'), ff=document.getElementById('hm-ffac');
  if(f&&ff&&f.value.trim()&&!ff.value)ff.value=honFFacSugerida(Store.get('honCli',curForm.rowId),honYear(),curForm.m);
  honMesCalc(); honMesAyuda();
}
function honMesAyuda(){
  var el=document.getElementById('hm-ayuda'); if(!el)return;
  var fac=(document.getElementById('hm-fac')||{}).value||'', ff=(document.getElementById('hm-ffac')||{}).value||'';
  if(!fac.trim()){ el.textContent='Sin N° de factura no hay IVA.'; return; }
  var ym=ff?ff.slice(0,7):honYM(honYear(),curForm.m), p=ym.split('-').map(Number);
  el.textContent='El IVA va a '+MESES_L[p[1]-1]+' '+p[0]+(ff?'':' (sin fecha: el mes del trabajo)')+'.';
}
function honMesCalc(){
  var el=document.getElementById('hm-calc'); if(!el)return;
  var r=Store.get('honCli',curForm.rowId)||{};
  var raw=((document.getElementById('hm-imp')||{}).value||'').trim();
  var fac=((document.getElementById('hm-fac')||{}).value||'').trim();
  var imp=raw===''?honNum(r.importe):honNum(raw);
  var usaHabitual=(raw===''&&imp!==null);
  if(imp===null){ el.innerHTML='<span class="muted-cell">Sin importe: este mes no se cobra.</span>'; return; }
  var iva=fac?Math.round(imp*IVA*100)/100:0;
  el.innerHTML='Honorarios <b>'+money(imp)+'</b> · IVA 22% <b>'+(iva?money(iva):'—')+'</b> · Total <b>'+money(imp+iva)+'</b>'
    +(usaHabitual?'<span class="gst-ayuda" style="display:block;margin-top:6px">Vacío = usa el honorario mensual del cliente.</span>':'');
}
function honMesSave(){
  var rowId=curForm.rowId, m=curForm.m, y=honYear(), r=Store.get('honCli',rowId); if(!r)return;
  var mv=honMovOf(rowId,y,m);
  if(!mv){ mv={id:'hm'+Date.now()+Math.floor(Math.random()*999),rowId:rowId,anio:y,mes:m}; Store.data.honMov.push(mv); }
  var v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  var impRaw=v('hm-imp'), impNum, baseNum=honNum(r.importe);
  if(!impRaw){
    mv.importe='';                                           // vacío = usa el honorario mensual
    impNum=baseNum;
  }else{
    impNum=honNum(impRaw);
    if(!honEsNumeroFinito(impNum)){
      toast('Revisá el importe: no es válido');
      var ii=document.getElementById('hm-imp'); if(ii)ii.focus();
      return;
    }
    mv.importe=(baseNum!==null&&impNum===baseNum)?'':numTxt(impNum);
  }
  mv.factura=v('hm-fac'); mv.fFac=mv.factura?v('hm-ffac'):''; mv.fecha=v('hm-fecha');
  mv.medio=v('hm-medio'); mv.recibo=v('hm-rec');
  Store.save(); closeModal(); renderHonBody(); toast('Guardado · '+MESES_L[m]);
}
