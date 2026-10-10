/*
 * Ficha de un gasto: alta, edición y borrado (se abre desde la pestaña Gastos).
 * Está separada de gastos.js porque tiene bastante lógica propia: la forma de pago
 * (contado o crédito), el plan de cuotas, y el IVA de la factura.
 *
 * SOBRE EL IVA
 * - El importe se puede escribir de dos formas: **IVA incluido** (el total de la factura) o
 *   **sin IVA** (el subtotal). El sistema calcula lo que falte y muestra el desglose en vivo.
 * - En "gastos.importe" SIEMPRE se guarda el TOTAL con IVA: es lo que sale del bolsillo y lo que
 *   suman todas las pantallas. El subtotal se deduce del total y el IVA.
 * - "IVA deducible" (100% o 50%): en Servicios Personales hay compras que se computan a la mitad.
 *   Ese porcentaje no cambia lo que se paga, solo cuánto IVA se puede deducir.
 */
/* ===== FICHA DE GASTO ===== */
var _gstForm=null;

function gastoForm(id){
  var g=id?Object.assign({},Store.get('gastos',id))
          :{fecha:today(),forma:'contado',cuotas:6,primera:gstSumarMeses(today(),1),pagado:false,conIva:false};
  if(!g.forma)g.forma='contado';
  if(!g.cuotas)g.cuotas=6;
  if(!g.primera)g.primera=gstSumarMeses(g.fecha||today(),1);
  if(!g.ivaModo)g.ivaModo='incluido';
  if(!g.ivaDed)g.ivaDed=100;
  // El campo del importe muestra el subtotal si así se cargó la factura; adentro se guarda el total.
  g._enPantalla=(g.conIva&&g.ivaModo==='mas')?Math.round(((honNum(g.importe)||0)-(honNum(g.iva)||0))*100)/100:honNum(g.importe);
  _gstForm=g; curForm={form:'gasto',id:id||null};
  $('#modal-title').textContent=id?'Gasto · '+(g.concepto||''):'Nuevo gasto';
  $('#modal-del').style.display=id?'inline-flex':'none';
  gstFormPintar();
  $('#modal').classList.add('open');
  setTimeout(function(){ var i=$('#modal-body [data-k="concepto"]'); if(i&&!id)i.focus(); },60);
}
// Vuelca a memoria lo que hay escrito en pantalla (para no perder nada al cambiar una opción).
function gstFormLeer(){
  $('#modal-body').querySelectorAll('[data-k]').forEach(function(el){ _gstForm[el.dataset.k]=el.type==='checkbox'?el.checked:el.value; });
  _gstForm._enPantalla=honNum(_gstForm.importe);
}
function gstFormSetForma(v){ gstFormLeer(); _gstForm.forma=v; gstFormPintar(); }
function gstFormSetIva(el){ gstFormLeer(); _gstForm.conIva=el.checked; gstFormPintar(); }
function gstFormSetIvaModo(v){ gstFormLeer(); _gstForm.ivaModo=v; _gstForm._ivaManual=false; gstFormPintar(); }
function gstFormSetIvaDed(v){ gstFormLeer(); _gstForm.ivaDed=+v; gstFormPintar(); }

function gstFormPintar(){
  var g=_gstForm, credito=(g.forma==='credito'), neto=(g.conIva&&g.ivaModo==='mas');
  var pagas=curForm.id?gstCuotasDe(curForm.id).filter(function(c){return c.pagado;}).length:0;
  var etiqueta=neto?'Subtotal (sin IVA)':(credito?'Total a pagar':'Importe');
  var h='<div class="field"><label>¿Qué se pagó? <span class="req">*</span></label>'
      +'<input data-k="concepto" list="dl-gastos" autocomplete="off" value="'+esc(g.concepto||'')+'" placeholder="Ej: Alquiler de la oficina, UTE, resma de hojas…"></div>'
    +'<div class="field-2"><div class="field"><label>Categoría</label>'
      +'<input data-k="cat" list="dl-gastocats" autocomplete="off" value="'+esc(g.cat||'')+'" placeholder="Elegí una o escribí la tuya"></div>'
      +'<div class="field"><label>Proveedor <span class="opt">(opcional)</span></label>'
      +'<input data-k="proveedor" list="dl-proveedores" autocomplete="off" value="'+esc(g.proveedor||'')+'"></div></div>'
    +'<div class="field-2"><div class="field"><label>Fecha de la compra</label>'
      +'<input type="date" data-k="fecha"'+DR+' value="'+esc(g.fecha||'')+'" onchange="gstFormResumen()"></div>'
      +'<div class="field"><label>'+etiqueta+' <span class="req">*</span></label>'
      +'<input data-k="importe" value="'+esc(numTxt(g._enPantalla))+'" placeholder="Ej: 12.600" oninput="gstFormCambioImporte()"></div></div>';

  /* ----- IVA de la factura ----- */
  h+='<div class="gst-box"><label class="chkline"><input type="checkbox" data-k="conIva" '+(g.conIva?'checked':'')+' onchange="gstFormSetIva(this)"> La factura tiene IVA (22%)</label>';
  if(g.conIva){
    h+='<div class="gst-sub">El importe que escribí es</div>'
      +'<div class="gseg gst-forma"><button type="button" class="gv'+(neto?'':' active')+'" onclick="gstFormSetIvaModo(\'incluido\')">Total, IVA incluido</button>'
      +'<button type="button" class="gv'+(neto?' active':'')+'" onclick="gstFormSetIvaModo(\'mas\')">Subtotal, sin IVA</button></div>'
      +'<div class="field" style="margin:12px 0 0"><label>IVA de la factura</label>'
      +'<input data-k="iva" value="'+esc(gstIvaInicial(g))+'" placeholder="Se calcula solo" oninput="this.dataset.manual=1;gstFormDesglose()">'
      +'<div class="gst-ayuda">Se calcula al 22%. Si la factura dice otra cosa (IVA mínimo, mixto), escribilo y manda el tuyo.</div></div>'
      +'<div class="gst-sub" style="margin-top:14px">IVA deducible</div>'
      +'<div class="gseg gst-forma"><button type="button" class="gv'+(g.ivaDed===50?'':' active')+'" onclick="gstFormSetIvaDed(100)">100%</button>'
      +'<button type="button" class="gv'+(g.ivaDed===50?' active':'')+'" onclick="gstFormSetIvaDed(50)">50%</button></div>'
      +'<div class="gst-ayuda">En Servicios Personales hay compras que se computan a la mitad. No cambia lo que pagás, solo cuánto IVA podés deducir.</div>'
      +'<div class="gst-desglose" id="gst-desglose"></div>';
  }
  h+='</div>';

  /* ----- forma de pago ----- */
  h+='<div class="field"><label>Forma de pago</label>'
    +'<div class="gseg gst-forma"><button type="button" class="gv'+(credito?'':' active')+'" onclick="gstFormSetForma(\'contado\')">Contado</button>'
    +'<button type="button" class="gv'+(credito?' active':'')+'" onclick="gstFormSetForma(\'credito\')">Crédito / cuotas</button></div></div>';
  if(!credito){
    // Oct. 2026: el vencimiento manda en qué mes aparece el gasto (si se deja vacío, la fecha de la compra).
    h+='<div class="field-2"><div class="field"><label>Vence <span class="opt">(si es otra fecha)</span></label><input type="date" data-k="vence"'+DR+' value="'+esc(g.vence||'')+'">'
      +'<div class="gst-ayuda">Ej.: la factura de UTE del 25/09 que vence el 10/10. Vacío = vence el día de la compra.</div></div>'
      +'<div class="field"><label>Medio de pago</label><input data-k="medio" list="dl-medio" autocomplete="off" value="'+esc(g.medio||'')+'"></div></div>'
      +'<label class="chkline"><input type="checkbox" data-k="pagado" '+(g.pagado?'checked':'')+'> Ya está pagado</label>'
      +'<div class="field"><label>Fecha de pago <span class="opt">(cuándo salió la plata)</span></label><input type="date" data-k="fechaPago"'+DR+' value="'+esc(g.fechaPago||'')+'"></div>';
  }else{
    h+='<div class="gst-box"><div class="field-2" style="margin:0">'
      +'<div class="field"><label>Cantidad de cuotas</label><input type="number" min="1" max="60" data-k="cuotas" value="'+esc(g.cuotas||6)+'" oninput="gstFormResumen()"></div>'
      +'<div class="field"><label>Primera cuota</label><input type="date" data-k="primera"'+DR+' value="'+esc(g.primera||'')+'" onchange="gstFormResumen()"></div></div>'
      +'<div class="field" style="margin-bottom:0"><label>Tarjeta o financiera</label><input data-k="medio" list="dl-plat" autocomplete="off" value="'+esc(g.medio||'')+'" placeholder="Ej: Visa, OCA, Creditel…"></div>'
      +'<div class="gst-plan" id="gst-resumen"></div>'
      +(pagas?'<div class="gst-ayuda">🔒 '+pagas+(pagas===1?' cuota ya está paga: no se modifica':' cuotas ya están pagas: no se modifican')+'. Lo que cambies se reparte entre las que faltan.</div>':'')
      +'</div>';
  }

  h+='<div class="field"><label>N° de factura <span class="opt">(opcional)</span></label><input data-k="factura" value="'+esc(g.factura||'')+'"></div>'
    +'<label class="chkline"><input type="checkbox" data-k="fijo" '+(g.fijo?'checked':'')+'> Es un gasto fijo (se repite todos los meses)</label>'
    +'<div class="field"><label>Notas</label><textarea data-k="notas">'+esc(g.notas||'')+'</textarea></div>';
  $('#modal-body').innerHTML=h;
  gstFormDesglose(); gstFormResumen();
}

/* ----- cálculos del IVA ----- */
function gstIvaSugerido(base,modo){ // base = lo escrito en el campo importe
  if(!base)return 0;
  return modo==='mas' ? Math.round(base*IVA_GASTO) : Math.round(base*IVA_GASTO/(1+IVA_GASTO));
}
function gstIvaInicial(g){
  var v=honNum(g.iva)||gstIvaSugerido(honNum(g._enPantalla),g.ivaModo);
  return v?numTxt(v):'';
}
// Con lo que hay en pantalla devuelve subtotal, IVA, total y cuánto se puede deducir.
function gstFormNumeros(){
  var v=function(k){ var e=$('#modal-body [data-k="'+k+'"]'); return e?e.value:''; };
  var chk=$('#modal-body [data-k="conIva"]');
  var escrito=honNum(v('importe'))||0;
  if(!chk||!chk.checked)return {sub:escrito,iva:0,total:escrito,ded:0,pct:100};
  var modo=_gstForm.ivaModo, pct=_gstForm.ivaDed||100;
  var iva=honNum(v('iva')); if(iva===null)iva=gstIvaSugerido(escrito,modo);
  var total=(modo==='mas')?Math.round((escrito+iva)*100)/100:escrito;
  var sub=Math.round((total-iva)*100)/100;
  return {sub:sub,iva:iva,total:total,ded:Math.round(iva*pct)/100,pct:pct};
}
// Al escribir el importe: se rehace el IVA (si no lo tocaron a mano), el desglose y el plan de cuotas.
function gstFormCambioImporte(){ gstFormIvaAuto(); gstFormDesglose(); gstFormResumen(); }
function gstFormIvaAuto(){
  var campo=$('#modal-body [data-k="iva"]'); if(!campo||campo.dataset.manual==='1')return;
  var imp=$('#modal-body [data-k="importe"]');
  var v=gstIvaSugerido(honNum(imp?imp.value:0),_gstForm.ivaModo);
  campo.value=v?numTxt(v):'';
}
// El desglose que se ve en vivo: subtotal, IVA y total.
function gstFormDesglose(){
  var box=document.getElementById('gst-desglose'); if(!box)return;
  var n=gstFormNumeros();
  if(!n.total){ box.innerHTML='<span class="gst-ayuda">Escribí el importe y te muestro el desglose.</span>'; return; }
  var fila=function(l,v,cls){ return '<div class="gd-row'+(cls?' '+cls:'')+'"><span>'+l+'</span><b>'+money(v)+'</b></div>'; };
  box.innerHTML=fila('Subtotal',n.sub)
    +fila('IVA'+(n.pct===50?' (22%)':''),n.iva)
    +fila('Total de la factura',n.total,'gd-tot')
    +(n.pct===50?'<div class="gd-row gd-ded"><span>IVA deducible (50%)</span><b>'+money(n.ded)+'</b></div>':'');
}

// Resumen en vivo del plan de cuotas.
function gstFormResumen(){
  var box=document.getElementById('gst-resumen'); if(!box)return;
  var v=function(k){ var e=$('#modal-body [data-k="'+k+'"]'); return e?e.value:''; };
  var n=gstFormNumeros();
  var total=n.total;
  var primera=v('primera');
  if(!gstEsNumeroFinito(total)||total<=0||!primera){
    box.innerHTML='<span class="gst-ayuda">Poné el total y la fecha de la primera cuota y te muestro el plan.</span>';
    return;
  }

  var previas=curForm.id?gstCuotasDe(curForm.id):[];
  var cand={
    id:curForm.id||'__preview__',
    forma:'credito',
    cuotas:v('cuotas'),
    primera:primera,
    fecha:v('fecha')||today(),
    importe:total
  };
  var plan=gstPlanCuotasCandidato(cand,previas);
  if(!plan.ok){
    box.innerHTML='<span class="gst-ayuda">'+esc(plan.error||'Revisá el plan de cuotas')+'</span>';
    return;
  }

  var r=plan.resumen;
  var mes=function(iso){ return MESES_L[+iso.slice(5,7)-1]+' '+iso.slice(0,4); };
  var base=money(gstDesdeCentavos(r.baseC));
  var ultima=money(gstDesdeCentavos(r.ultimaC));
  var h='<b>'+r.N+(r.N===1?' cuota de ':' cuotas de ')+base+'</b>';
  if(r.cuotasImpagas>0&&r.ultimaC!==r.baseC)h+=' <span class="gst-ayuda2">(la última, '+ultima+')</span>';
  h+='<span class="gst-plan-d">de '+mes(r.primera)+' a '+mes(r.fin)+'</span>';
  h+='<div class="gst-ayuda" style="margin-top:8px">Pagado registrado: <b>'+money(gstDesdeCentavos(r.pagadoC))+'</b> · Saldo pendiente: <b>'+money(gstDesdeCentavos(r.saldoC))+'</b></div>';
  h+='<div class="gst-ayuda">'+r.cuotasPagas+' paga'+(r.cuotasPagas===1?'':'s')+' · '+r.cuotasImpagas+' impaga'+(r.cuotasImpagas===1?'':'s')+'</div>';
  box.innerHTML=h;
}

/* ===== guardar y borrar ===== */
function gastoSave(){
  var n=gstFormNumeros();
  gstFormLeer();
  var g=_gstForm;
  if(!(g.concepto||'').trim()){ toast('Falta escribir qué se pagó'); return; }
  if(!gstEsNumeroFinito(n.total)||n.total<=0){ toast('Falta el importe o no es válido'); return; }
  if(!gstEsNumeroFinito(n.iva)||!gstEsNumeroFinito(n.sub)||!gstEsNumeroFinito(n.ded)){ toast('Revisá el desglose del IVA'); return; }
  if(!modalDatesOk())return;

  var credito=(g.forma==='credito');
  var previas=curForm.id?gstCuotasDe(curForm.id):[];
  var cand={
    id:curForm.id||'__preview__',
    forma:credito?'credito':'contado',
    cuotas:g.cuotas,
    primera:g.primera,
    fecha:g.fecha||today(),
    importe:n.total
  };
  var planPrev=gstPlanCuotasCandidato(cand,previas);
  if(!planPrev.ok){ toast(planPrev.error||'No se pudo validar el plan de cuotas'); return; }

  var N=planPrev.N;
  if(credito){
    if(!g.primera){ toast('Falta la fecha de la primera cuota'); return; }
  }

  var base=curForm.id?Store.get('gastos',curForm.id):null;
  var o=base?Object.assign({},base):{};
  o.concepto=(g.concepto||'').trim(); o.cat=(g.cat||'').trim(); o.proveedor=(g.proveedor||'').trim();
  o.fecha=g.fecha||today(); o.factura=(g.factura||'').trim(); o.notas=g.notas||'';
  o.fijo=!!g.fijo; o.medio=(g.medio||'').trim();
  o.importe=n.total;                    // siempre el total con IVA: es lo que sale del bolsillo
  o.conIva=!!g.conIva;
  o.iva=o.conIva?n.iva:0;
  o.ivaModo=o.conIva?g.ivaModo:'incluido';
  o.ivaDed=o.conIva?(g.ivaDed||100):100;
  o.forma=credito?'credito':'contado';
  if(credito){ o.cuotas=N; o.primera=g.primera; o.pagado=false; o.fechaPago=''; o.vence=''; }
  else {
    o.cuotas=null; o.primera='';
    o.vence=(g.vence&&g.vence!==o.fecha)?g.vence:'';        // vacío = vence el día de la compra
    o.pagado=!!g.pagado; o.fechaPago=o.pagado?(g.fechaPago||o.fecha):'';
  }

  // Validación final con el objeto que efectivamente se va a persistir.
  var planFinalPrev=gstPlanCuotasCandidato(Object.assign({},o,{id:curForm.id||'__preview__'}),previas);
  if(!planFinalPrev.ok){ toast(planFinalPrev.error||'No se pudo validar el plan de cuotas'); return; }

  gstCatAddName(o.cat);
  var guardado=Store.upsert('gastos',o);

  var planAplicar=curForm.id
    ? gstPlanCuotasCandidato(Object.assign({},guardado),previas)
    : gstPlanCuotasCandidato(Object.assign({},guardado),[]);
  if(!planAplicar.ok){ toast(planAplicar.error||'No se pudo actualizar el plan de cuotas'); return; }
  gstAplicarPlanCuotas(planAplicar);

  closeModal(); renderGastos();
  toast(curForm.id?'Cambios guardados':(credito?'✓ Gasto y cuotas creados':'✓ Gasto creado'));
}
function gastoDel(){
  var id=curForm.id;
  if(!id)return;
  if(gstBorrar('gasto',id))closeModal();
}
