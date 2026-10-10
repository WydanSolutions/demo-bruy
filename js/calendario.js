/*
 * Sección: Calendario.
 */
/* ===== CALENDARIO ===== */
let calY=new Date().getFullYear(), calM=new Date().getMonth(), calD=new Date().getDate(), calView='mes';
function setCalView(v){calView=v;calRefresh();}
function calEventsMap(){var ev={};var push=function(iso,txt,cls){if(!iso)return;(ev[iso]=ev[iso]||[]).push({txt:txt,cls:cls});};
  Store.all('dj').filter(function(d){return d.estado!=='Presentada';}).forEach(function(d){push(d.venc,cliName(d.clienteId)+' · '+folderName(d.folder),'ev-venc');});
  Store.all('tareas').filter(function(x){return !x.hecho&&x.estado!=='Hecha';}).forEach(function(x){push(x.plazo,x.tarea,'ev-venc');});
  Store.all('cal').forEach(function(e){push(e.fecha,e.titulo,'');});
  (Store.data.gcalEvents||[]).forEach(function(e){push(e.fecha,'📅 '+e.titulo,'');});
  // Vencimientos oficiales de DGI y BPS, y feriados. Se ven los grupos que no estén apagados.
  [calY,calY+1,calY-1].forEach(function(y){
    vencDelAnio(y,false).forEach(function(v){ if(!vencVisible(v.gid))return;
      push(v.iso,(v.mio?'★ ':'')+vencTexto(v),v.mio?'ev-venc-mio':'ev-venc-of'); });
    if(vencCfg().feriados!==false)feriadosDelAnio(y).forEach(function(f){ push(f.iso,f.nombre,'ev-feriado'); });
  });
  return ev;}
function isoOf(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
// Texto completo de los eventos de un día, para verlo al pasar el mouse (el mini calendario lo corta).
function tipAttr(list){return list&&list.length?' data-tip="'+esc(list.map(function(e){return '• '+e.txt;}).join('\n'))+'"':'';}
function calNavG(dir){ if(calView==='dia'){var dt=new Date(calY,calM,calD+dir);calY=dt.getFullYear();calM=dt.getMonth();calD=dt.getDate();} else if(calView==='semana'){var dt=new Date(calY,calM,calD+dir*7);calY=dt.getFullYear();calM=dt.getMonth();calD=dt.getDate();} else if(calView==='anio'){calY+=dir;} else {calM+=dir;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}} calRefresh(); }
function calTitleG(){ if(calView==='dia'){return calD+' de '+MESES_L[calM]+' '+calY;} if(calView==='semana'){var s=new Date(calY,calM,calD-new Date(calY,calM,calD).getDay());var e=new Date(s);e.setDate(s.getDate()+6);return s.getDate()+' '+MESES[s.getMonth()]+' – '+e.getDate()+' '+MESES[e.getMonth()]+' '+calY;} if(calView==='anio'){return ''+calY;} return MESES_L[calM]+' '+calY; }
function calBody(ev,compact){
  var todayIso=today();
  if(calView==='dia'){ var iso=isoOf(calY,calM,calD); var evs=(ev[iso]||[]); return '<div class="cal-day">'+(evs.length?evs.map(function(e){return '<div class="cal-ev '+e.cls+'" style="white-space:normal;margin-bottom:6px">'+esc(e.txt)+'</div>';}).join(''):'<div class="empty"><p>Sin eventos este día.</p></div>')+'</div>'; }
  if(calView==='semana'){ var base=new Date(calY,calM,calD); var start=new Date(base); start.setDate(base.getDate()-base.getDay()); var cells=''; for(var i=0;i<7;i++){var dt=new Date(start);dt.setDate(start.getDate()+i);var iso=isoOf(dt.getFullYear(),dt.getMonth(),dt.getDate());var evs=(ev[iso]||[]).map(function(e){return '<div class="cal-ev '+e.cls+'">'+esc(e.txt)+'</div>';}).join('');cells+='<div class="cal-cell'+(iso===todayIso?' today':'')+'"'+tipAttr(ev[iso])+' onclick="openCalEvent(\''+iso+'\')" style="min-height:'+(compact?70:140)+'px"><div class="cal-n">'+DOW[dt.getDay()]+' '+dt.getDate()+'</div>'+evs+'</div>';} return '<div class="cal-grid">'+cells+'</div>'; }
  if(calView==='anio'){ var out='<div class="cal-year'+(compact?' mini':'')+'">'; for(var m=0;m<12;m++){var first=new Date(calY,m,1);var start=first.getDay();var dim=new Date(calY,m+1,0).getDate();var days='';for(var k=0;k<start;k++)days+='<span></span>';for(var d=1;d<=dim;d++){var iso=isoOf(calY,m,d);var has=ev[iso]&&ev[iso].length;days+='<span class="yd'+(iso===todayIso?' t':'')+(has?' has':'')+'"'+tipAttr(ev[iso])+' onclick="calD='+d+';calM='+m+';calView=\'dia\';renderCal()">'+d+'</span>';}out+='<div class="ym"><div class="ym-t">'+MESES[m]+'</div><div class="ym-g">'+days+'</div></div>';} return out+'</div>'; }
  // mes
  var first=new Date(calY,calM,1),start=first.getDay(),dim=new Date(calY,calM+1,0).getDate(),prevDim=new Date(calY,calM,0).getDate();
  var cells=DOW.map(function(d){return '<div class="cal-dow">'+d+'</div>';}).join('');
  for(var i=0;i<42;i++){var day,mo,other=false;if(i<start){day=prevDim-start+1+i;mo=calM-1;other=true;}else if(i<start+dim){day=i-start+1;mo=calM;}else{day=i-start-dim+1;mo=calM+1;other=true;}var y=calY,m=mo;if(m<0){m=11;y--;}if(m>11){m=0;y++;}var iso=isoOf(y,m,day);var all=ev[iso]||[],max=compact?1:3;var evs=all.slice(0,max).map(function(e){return '<div class="cal-ev '+e.cls+'">'+esc(e.txt)+'</div>';}).join('')+(all.length>max?'<div class="cal-more">+'+(all.length-max)+' más</div>':'');cells+='<div class="cal-cell'+(other?' other':'')+(iso===todayIso?' today':'')+'"'+tipAttr(all)+' onclick="openCalEvent(\''+iso+'\')" style="min-height:'+(compact?42:66)+'px"><div class="cal-n">'+day+'</div>'+evs+'</div>';}
  return '<div class="cal-grid">'+cells+'</div>';
}
function calViewSeg(){return '<span class="gseg">'+[['dia','Día'],['semana','Semana'],['mes','Mes'],['anio','Año']].map(function(v){return '<button class="gv'+(calView===v[0]?' active':'')+'" onclick="setCalView(\''+v[0]+'\')">'+v[1]+'</button>';}).join('')+'</span>';}
function renderCal(){
  const ev=calEventsMap();
  let h='<div class="view-head"><div><h2>Calendario</h2><div class="sub">Vencimientos de DJ, tareas, impuestos y feriados</div></div><div style="display:flex;gap:8px"><button class="btn btn-primary" onclick="openCalEvent()">+ Evento</button></div></div>';
  h+='<div class="cal-head"><button onclick="calNavG(-1)">‹</button><div class="cal-title">'+calTitleG()+'</div><button onclick="calNavG(1)">›</button><button onclick="calToday()" style="width:auto;padding:0 12px;font-size:12px;font-weight:700">Hoy</button><span style="margin-left:auto">'+calViewSeg()+'</span></div>';
  h+=calLeyendaVenc();
  h+=calBody(ev,false);
  if(calView==='mes'||calView==='semana'){
    const up=[];
    Store.all('dj').filter(d=>d.estado!=='Presentada'&&d.venc).forEach(d=>up.push({iso:d.venc,txt:cliName(d.clienteId)+' · '+folderName(d.folder)}));
    Store.all('tareas').filter(t=>!t.hecho&&t.estado!=='Hecha'&&t.plazo).forEach(t=>up.push({iso:t.plazo,txt:t.tarea}));
    Store.all('cal').forEach(e=>up.push({iso:e.fecha,txt:e.titulo}));
    const near=up.filter(x=>{const dd=daysTo(x.iso);return dd!==null&&dd>=0;}).sort((a,b)=>a.iso.localeCompare(b.iso)).slice(0,8);
    if(near.length){ h+='<div class="card" style="margin-top:18px"><div class="card-head"><h3>Próximos eventos</h3></div><div class="card-body">'+near.map(x=>{const p=x.iso.split('-');return '<div class="vrow"><div class="vdate"><div class="d">'+p[2]+'</div><div class="m">'+MESES[+p[1]-1]+'</div></div><div class="vmain"><div class="vt">'+esc(x.txt)+'</div></div><span class="vd" style="color:var(--muted)">'+daysTo(x.iso)+'d</span></div>';}).join('')+'</div></div>'; }
  }
  $('#view-cal').innerHTML=h;
}
function vStub(){toast("Vista Mes por ahora");}
function calNav(d){calM+=d;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}renderCal();}
function calToday(){const n=new Date();calY=n.getFullYear();calM=n.getMonth();calD=n.getDate();calRefresh();}
function openCalEvent(iso){ curForm={form:'cal',id:null}; $('#modal-title').textContent='Nuevo evento'; $('#modal-del').style.display='none';
  $('#modal-body').innerHTML='<div class="field"><label>Título <span class="req">*</span></label><input data-k="titulo"></div><div class="field"><label>Fecha <span class="req">*</span></label><input type="date"'+DR+' data-k="fecha" value="'+(typeof iso==='string'?iso:'')+'"></div>';
  $('#modal').classList.add('open');
}
