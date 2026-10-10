/*
 * Constantes generales: clave de guardado, logo, meses y carpetas de declaraciones.
 */
const KEY='bruy_gestion';
const LOGO=new URL('img/logo.png', location.href).href;        // logo completo: ingreso y exportaciones
const MONOGRAMA=new URL('img/monograma.png', location.href).href; // solo el monograma: encabezado y panel
const MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
const MESES_L=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
// Panel: cómo se ve la primera vez (y al tocar "Volver al orden por defecto"). Anchos en columnas de 12.
const PANEL_ORDER_DEF=['kpis','vencimientos','estado','calendario','tareas','notas','vistas'];
const PANEL_WIDTHS_DEF={kpis:12,vencimientos:12,calendario:4,tareas:8,notas:8};
const FOLDERS=[
  {id:'sp',name:'Servicios Personales',ico:'🧾',color:'#063463'},
  {id:'iyc_cede',name:'Ind. y Comercio · CEDE',ico:'🏢',color:'#2f6fb0'},
  {id:'iyc_nocede',name:'Ind. y Comercio · No CEDE',ico:'🏬',color:'#2e7d52'},
  {id:'rural',name:'Primaria Rural',ico:'🌾',color:'#6c8f1f'},
  {id:'iass',name:'IASS / IRPF',ico:'📄',color:'#b7651b'},
];
