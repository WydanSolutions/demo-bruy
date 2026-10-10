/*
 * Funciones de ayuda: fechas, formato, avisos, etiquetas de estado.
 */
/* ===== utils ===== */
const $=s=>document.querySelector(s);
function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function cliName(id){const c=Store.get('clientes',id);return c?c.nombre:'—';}
function fDate(iso){if(!iso)return '—';const p=iso.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function daysTo(iso){if(!iso)return null;const t=new Date();t.setHours(0,0,0,0);const p=iso.split('-').map(Number);const x=new Date(p[0],p[1]-1,p[2]);return Math.round((x-t)/86400000);}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}
function urgRank(u){return {Alta:3,Media:2,Baja:1}[u]||0;}
function urgPill(u){if(!u)return '<span class="muted-cell">—</span>';const c={Alta:'urg-alta',Media:'urg-media',Baja:'urg-baja'}[u];return '<span class="pill '+c+'">'+esc(u)+'</span>';}
function estPill(e){const m={'Pendiente':'st-pend','En proceso':'st-proc','Presentada':'st-done','Hecha':'st-done'};return '<span class="pill '+(m[e]||'st-pend')+'">'+esc(e)+'</span>';}
function clkEst(col,id,e,opts){
	const m={'Pendiente':'st-pend','En proceso':'st-proc','Presentada':'st-done','Hecha':'st-done'};
	const op=encodeURIComponent(JSON.stringify(Array.isArray(opts)?opts:[]));
	return '<span class="pill clk '+(m[e]||'st-pend')+'" data-ui-action="status-dd" data-col="'+esc(col)+'" data-id="'+esc(id)+'" data-opts="'+esc(op)+'">'+esc(e)+' ▾</span>';
}
function vencColor(dd){return dd<0?'var(--red)':dd<=3?'var(--acento)':dd<=10?'var(--amber)':'var(--muted)';}
function actions(kind,id){
	return '<div class="row-act">'
		+'<button class="btn-ghost" title="Editar" data-ui-action="edit-row" data-kind="'+esc(kind)+'" data-id="'+esc(id)+'">✎</button>'
		+'<button class="btn-ghost" title="Eliminar" style="color:var(--red)" data-ui-action="delete-row" data-kind="'+esc(kind)+'" data-id="'+esc(id)+'">🗑</button>'
		+'</div>';
}
function emptyRow(cols,msg){return '<tr><td colspan="'+cols+'"><div class="empty"><div class="e-ico">📭</div><p>'+msg+'</p></div></td></tr>';}
// Fecha de hoy en hora local (toISOString usa hora UTC: en Uruguay, después de las 21 h daba el día siguiente).
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// Rango permitido en todos los campos de fecha (evita años de 5 cifras o fechas absurdas por un error de tipeo).
const DR=' min="2000-01-01" max="2099-12-31"';
const DR_NAC=' min="1900-01-01" max="2099-12-31"'; // fechas de nacimiento
// Valida contra el min/max de cada campo (así un año a medio tipear, como 0002, no se guarda).
function dateOk(el){if(!el.value)return true;var min=el.min||'2000-01-01',max=el.max||'2099-12-31';if(el.value<min||el.value>max){toast('Revisá la fecha: tiene que estar entre '+fDate(min)+' y '+fDate(max));return false;}return true;}
function modalDatesOk(){return !Array.from(document.querySelectorAll('#modal-body input[type="date"]')).some(function(i){return !dateOk(i);});}

/* ===== números y plata (las usan Honorarios y Gastos) ===== */
function honNum(v){if(v===''||v==null)return null;if(typeof v==='number')return v;var n=parseFloat(String(v).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'));return isNaN(n)?null:n;}
// Si tiene centavos se muestran los dos dígitos (1.761,50); si es redondo, sin decimales (28.000).
function numTxt(n){ if(n==null||n==='')return ''; n=Number(n); return n.toLocaleString('es-UY',{minimumFractionDigits:(n%1?2:0),maximumFractionDigits:2}); }
function money(n){return '$ '+numTxt(n||0);}

/* ===== año de trabajo (el año fiscal se puede fijar a mano en Configuración) ===== */
function anioActivo(){return +Store.data.anioFiscal||new Date().getFullYear();}
function yearSelect(sel,fn){var now=new Date().getFullYear(),min=Math.min(2024,sel,anioActivo()),max=Math.max(now+1,sel,anioActivo()),o='';for(var y=max;y>=min;y--)o+='<option'+(y===sel?' selected':'')+'>'+y+'</option>';return '<select class="ysel" title="Año" onchange="'+fn+'(+this.value)">'+o+'</select>';}

/* ===== edición directa en la tabla ===== */
function cellSet(col,id,f,v,re){var o=Store.get(col,id);if(!o)return;o[f]=v;Store.upsert(col,o);if(re)renderView(CUR);}
function cellIn(col,id,f,v,opt){
	opt=opt||{};
	var d=opt.type==='date';
	return '<input class="cell-in'+(opt.cls?' '+opt.cls:'')+'"'
		+(opt.type?' type="'+opt.type+'"':'')
		+(d?DR:'')
		+(opt.list?' list="'+esc(opt.list)+'" autocomplete="off"':'')
		+' data-ui-action="cell-in" data-col="'+esc(col)+'" data-id="'+esc(id)+'" data-field="'+esc(f)+'" data-re="'+(opt.re?'1':'0')+'" data-date="'+(d?'1':'0')+'"'
		+' value="'+esc(v||'')+'" placeholder="'+esc(opt.ph||'—')+'">';
}

/* ===== clientes: autocompletar y vínculo con su ficha ===== */
// Si dos clientes tienen el mismo nombre (ej. el mismo contribuyente con dos aportaciones), se distinguen por su tipo: "Nombre (Rural)".
function cliLabel(c){if(!c)return '';var n=(c.nombre||'').trim().toLowerCase();var dup=c.tipo&&Store.all('clientes').some(function(x){return x!==c&&x.id!==c.id&&(x.nombre||'').trim().toLowerCase()===n;});return dup?c.nombre+' ('+c.tipo+')':c.nombre;}
function cliNameOr(id){var c=id&&Store.get('clientes',id);return c?cliLabel(c):'';}
function cliByName(n){n=(n||'').trim().toLowerCase();if(!n)return null;var cs=Store.all('clientes');return cs.find(function(c){return cliLabel(c).trim().toLowerCase()===n;})||cs.find(function(c){return (c.nombre||'').trim().toLowerCase()===n;})||null;}
// Devuelve el id del cliente con ese nombre. Si no existe, lo crea en Info. Clientes.
function ensureCli(nombre,tipo){nombre=(nombre||'').trim();if(!nombre)return '';var c=cliByName(nombre);if(c)return c.id;c=Store.upsert('clientes',{nombre:nombre,tipo:tipo||''});syncCliList();toast('✓ «'+nombre+'» se agregó a Info. Clientes');return c.id;}
function syncCliList(){var dl=document.getElementById('dl-clientes');if(!dl)return;dl.innerHTML=Store.all('clientes').filter(function(c){return !c.archivado;}).map(cliLabel).sort(function(a,b){return a.localeCompare(b);}).map(function(n){return '<option value="'+esc(n)+'">';}).join('');}
function cliLink(id,fallback){var c=id&&Store.get('clientes',id);if(!c)return '<span class="cli-name">'+esc(fallback||'—')+'</span>';return '<a class="cli-link" href="#" title="Ver la ficha del cliente" data-ui-action="go-cli" data-id="'+esc(c.id)+'">'+esc(cliLabel(c))+'</a>';}
function goCli(id){var c=Store.get('clientes',id);if(!c)return;_clarch=c.archivado?'arch':'act';_clq='';_clt='';cliView='panel';cliSel=id;switchView('clientes');}
function cliInput(v,onchange,ph){return '<input class="cell-in" list="dl-clientes" autocomplete="off" value="'+esc(v||'')+'" placeholder="'+(ph||'Escribí el nombre…')+'" onchange="'+onchange+'">';}

/* ===== delegación segura de acciones de helpers ===== */
let _uiDelegacionLista=false;
function uiInitDelegacion(){
	if(_uiDelegacionLista)return;
	_uiDelegacionLista=true;

	document.addEventListener('click',function(ev){
		var t=ev.target&&ev.target.closest?ev.target.closest('[data-ui-action]'):null;
		if(!t||!document.body.contains(t))return;
		var act=t.getAttribute('data-ui-action')||'';

		if(act==='edit-row'||act==='delete-row'){
			if(!t.closest('.row-act'))return;
			var kind=t.getAttribute('data-kind')||'';
			var id=t.getAttribute('data-id')||'';
			if(act==='edit-row'){ if(typeof openForm==='function')openForm(kind,id); return; }
			if(typeof quickDel==='function')quickDel(kind,id);
			return;
		}

		if(act==='status-dd'){
			if(!t.classList.contains('clk'))return;
			if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
			var raw=t.getAttribute('data-opts')||'';
			var opts=[];
			try{ opts=JSON.parse(decodeURIComponent(raw)); }catch(e){ opts=[]; }
			if(!Array.isArray(opts))opts=[];
			if(typeof ddStatus==='function')ddStatus(ev,t.getAttribute('data-col')||'',t.getAttribute('data-id')||'',opts);
			return;
		}

		if(act==='go-cli'){
			if(!t.classList.contains('cli-link'))return;
			ev.preventDefault();
			ev.stopPropagation();
			if(typeof goCli==='function')goCli(t.getAttribute('data-id')||'');
		}
	});

	document.addEventListener('change',function(ev){
		var t=ev.target;
		if(!t||t.getAttribute('data-ui-action')!=='cell-in'||!t.classList.contains('cell-in'))return;
		if(t.getAttribute('data-date')==='1'&&typeof dateOk==='function'&&!dateOk(t))return;
		var col=t.getAttribute('data-col')||'';
		var id=t.getAttribute('data-id')||'';
		var f=t.getAttribute('data-field')||'';
		var re=t.getAttribute('data-re')==='1';
		cellSet(col,id,f,t.value,re);
	});
}
uiInitDelegacion();

/* ===== globo de ayuda: cualquier elemento con data-tip muestra ese texto al pasar el mouse ===== */
(function(){var tip=null;document.addEventListener('mouseover',function(e){var el=e.target.closest?e.target.closest('[data-tip]'):null;if(!tip){tip=document.createElement('div');tip.className='tip';document.body.appendChild(tip);}if(!el){tip.classList.remove('show');return;}tip.textContent=el.getAttribute('data-tip');tip.classList.add('show');var r=el.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;tip.style.left=Math.min(Math.max(8,r.left+r.width/2-tw/2),window.innerWidth-tw-8)+'px';tip.style.top=(r.top-th-8<8?r.bottom+8:r.top-th-8)+'px';});})();
