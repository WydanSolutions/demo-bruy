/*
 * DATOS DE EJEMPLO DE LA DEMOSTRACIÓN — TODOS INVENTADOS.
 *
 * La idea es que la demostración se vea como un estudio que ya viene usando la página hace meses:
 * la cartera de clientes cargada, las declaraciones del año presentadas, las grillas de Empresas y
 * Serv. Profesionales con los meses anteriores hechos y enviados, sueldos de los últimos meses,
 * honorarios facturados y cobrados, tareas terminadas y pendientes, agenda y notas.
 *
 * ⚠ Ningún dato es real: ni los nombres, ni los RUT, ni los teléfonos, ni los importes.
 *
 * Todo se calcula desde la fecha de hoy, así la demostración no envejece. El "pasado" arranca en
 * enero del año en curso: si alguien la abre en enero va a ver poca historia, y está bien.
 */
/* VERSIÓN DE LOS EJEMPLOS.
 * Cada visitante se lleva su copia de los datos al navegador y, a partir de ahí, la página usa esa
 * copia y no vuelve a mirar los ejemplos. Si después mejoramos la demostración, quien ya la había
 * abierto seguiría viendo la versión vieja (y pensando que no cargamos nada).
 * Por eso: al subir este número, la página detecta que su copia es de antes y la rehace sola.
 * ⚠ Subirlo borra lo que esa persona hubiera escrito probando. En una demostración está bien;
 *   en la página real no se siembra nunca nada (todo esto corre solo con MODO_DEMO).
 *
 *   1 — primera versión (pocos ejemplos)
 *   2 — 09/10/2026: la demostración se ve «en uso» (19 clientes, el año entero cargado)
 */
var EJ_VERSION = 2;

var EJ_HOY = new Date(), EJ_YY = EJ_HOY.getFullYear(), EJ_MM = EJ_HOY.getMonth();

// Fecha ISO del día `d` del mes `m` (0 = enero) del año en curso.
function ejF(m, d) {
  var t = new Date(EJ_YY, m, d);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
// ¿Esa fecha ya pasó? Sirve para no mostrar cosas "hechas" en el futuro.
function ejYaFue(iso) { return iso <= today(); }

/* ===== INFO. CLIENTES ===== */
function ejClientes() {
  var c = function (id, nombre, tipo, extra) {
    return Object.assign({ id: id, nombre: nombre, tipo: tipo, rut: '', ci: '', bps: '', fnac: '',
      whatsapp: '', correo: '', direccion: '', fosmetal: '', otros: '', notas: '' }, extra || {});
  };
  return [
    c('c1', 'Silveira, Valentina', 'Persona física', { ci: '4.987.321-5', fnac: '1988-07-04', whatsapp: '099 445 566', correo: 'valentina.silveira@ejemplo.com', direccion: 'Agraciada 1245', notas: 'Arquitecta. Factura por servicios personales.' }),
    c('c2', 'Panadería La Espiga SRL', 'Empresa', { rut: '21 777888 0013', bps: '8451207', whatsapp: '092 334 455', correo: 'laespiga@ejemplo.com', direccion: 'Sarandí 742', notas: 'Manda la planilla de sueldos por WhatsApp el día 25.' }),
    c('c3', 'Transportes del Norte SA', 'Empresa', { rut: '21 334455 0017', bps: '7719044', correo: 'administracion@transportesdelnorte.ejemplo', direccion: 'Ruta 5 km 498' }),
    c('c4', 'Estancia Los Ceibos', 'Empresa', { rut: '21 556677 0019', bps: '7120338', whatsapp: '099 712 004', notas: 'DICOSE en setiembre. Mandan los datos por correo.' }),
    c('c5', 'Almacén Doña Nelly', 'Empresa', { rut: '21 119922 0011', bps: '8830115', direccion: 'Artigas 318', notas: 'Literal E, no lleva libros.' }),
    c('c6', 'Techera, Rodrigo', 'Persona física', { ci: '3.112.998-0', whatsapp: '094 221 100', notas: 'Médico. IRPF servicios personales.' }),
    c('c7', 'Ferretería El Clavo SRL', 'Empresa', { rut: '21 445566 0014', bps: '8116942', direccion: 'Brasil 905', correo: 'elclavo@ejemplo.com' }),
    c('c8', 'Óptica Visión Rivera', 'Empresa', { rut: '21 223344 0012', bps: '8902771', direccion: 'Sarandí 450' }),
    c('c9', 'Barbosa, Mariana', 'Persona física', { ci: '4.556.210-7', correo: 'mariana.barbosa@ejemplo.com', whatsapp: '091 880 332', notas: 'Diseñadora. También le llevamos las redes (Marketing).' }),
    c('c10', 'Gomería Ruta 5', 'Empresa', { rut: '21 667788 0018', bps: '8220134', notas: 'Viene atrasada con los honorarios. Hablar.' }),
    c('c11', 'Farmacia Santa Rita', 'Empresa', { rut: '21 889900 0010', bps: '8451330', direccion: 'Agraciada 580', correo: 'santarita@ejemplo.com' }),
    c('c12', 'Da Rosa, Gustavo', 'Persona física', { ci: '2.884.117-3', notas: 'Jubilado. IASS.' }),
    c('c13', 'Agropecuaria Cerro Chato SRL', 'Empresa', { rut: '21 101112 0015', bps: '7634902' }),
    c('c14', 'Peluquería Studio Ana', 'Empresa', { rut: '21 131415 0016', bps: '8771205', notas: 'Unipersonal, monotributo.' }),
    c('c15', 'Clínica Dental Sonrisa', 'Empresa', { rut: '21 161718 0013', bps: '8095517', direccion: 'Ceballos 1120' }),
    c('c16', 'Olivera, Carmen', 'Persona física', { ci: '1.998.445-2', notas: 'IASS. Trae los recibos en marzo.' }),
    c('c17', 'Distribuidora Frontera SA', 'Empresa', { rut: '21 192021 0011', bps: '7458820', direccion: 'Ruta 27 km 3' }),
    c('c18', 'Café Las Delicias', 'Empresa', { rut: '21 222324 0017', bps: '8663401', notas: 'Gestoría: habilitaciones de la Intendencia.' }),
    c('c19', 'Méndez, Alicia', 'Persona física', { ci: '3.740.556-1', whatsapp: '098 115 447', notas: 'Escribana.' }),
  ];
}

/* ===== DECLARACIONES =====
   Las de los meses que ya pasaron están presentadas y pagas; las del mes en curso, en marcha. */
function ejDeclaraciones() {
  var MEDIOS = ['BROU', 'Itaú', 'Santander', 'Transferencia', 'Abitab'];
  var plan = [
    { folder: 'sp', dia: 26, tipo: 'IVA Servicios Personales', cli: ['c1', 'c6', 'c9'], importe: [4200, 6800, 2900] },
    { folder: 'iyc_cede', dia: 20, tipo: 'IVA mensual', cli: ['c2', 'c11'], importe: [18400, 23100] },
    { folder: 'iyc_nocede', dia: 15, tipo: 'IVA mínimo', cli: ['c5', 'c7', 'c14'], importe: [3100, 7450, 2250] },
  ];
  var out = [], n = 0, desde = Math.max(0, EJ_MM - 3);
  plan.forEach(function (p) {
    for (var m = desde; m <= EJ_MM; m++) {
      p.cli.forEach(function (cid, i) {
        var venc = ejF(m, p.dia), pasado = m < EJ_MM, fila = { id: 'dj' + (++n), folder: p.folder, anio: EJ_YY,
          tipoDj: p.tipo, clienteId: cid, hecho: false, presentada: '', importe: '', medio: '', fechaPago: '',
          estado: 'Pendiente', venc: venc, notas: '' };
        if (pasado) {
          fila.hecho = true; fila.estado = 'Presentada'; fila.presentada = ejF(m, p.dia - 3);
          fila.importe = p.importe[i] + (m * 137 % 900); fila.medio = MEDIOS[(i + m) % MEDIOS.length];
          fila.fechaPago = venc;
        } else if (i === 0) { fila.estado = 'Presentada'; fila.hecho = true; fila.presentada = ejF(m, Math.max(1, p.dia - 8)); fila.importe = p.importe[i]; fila.medio = MEDIOS[i % MEDIOS.length]; fila.fechaPago = ''; }
        else if (i === 1) { fila.estado = 'En proceso'; fila.notas = 'Falta que manden las compras del mes.'; }
        out.push(fila);
      });
    }
  });
  // Anuales: Primaria Rural y IASS / IRPF.
  out.push({ id: 'dj' + (++n), folder: 'rural', anio: EJ_YY, tipoDj: 'DICOSE', clienteId: 'c4', hecho: true, presentada: ejF(8, 12), importe: 41200, medio: 'BROU', fechaPago: ejF(8, 30), estado: 'Presentada', venc: ejF(8, 30), notas: 'Declaración jurada anual de existencias.' });
  out.push({ id: 'dj' + (++n), folder: 'rural', anio: EJ_YY, tipoDj: 'IMEBA', clienteId: 'c13', hecho: true, presentada: ejF(7, 18), importe: 28600, medio: 'Santander', fechaPago: ejF(7, 25), estado: 'Presentada', venc: ejF(7, 25), notas: '' });
  out.push({ id: 'dj' + (++n), folder: 'rural', anio: EJ_YY, tipoDj: 'Patrimonio rural', clienteId: 'c4', hecho: false, presentada: '', importe: '', medio: '', fechaPago: '', estado: 'Pendiente', venc: ejF(EJ_MM + 1, 28), notas: 'Esperando el avalúo.' });
  out.push({ id: 'dj' + (++n), folder: 'iass', anio: EJ_YY, tipoDj: 'IASS anual', clienteId: 'c12', hecho: true, presentada: ejF(4, 20), importe: 0, medio: '', fechaPago: '', estado: 'Presentada', venc: ejF(5, 30), notas: 'Sin saldo a pagar.' });
  out.push({ id: 'dj' + (++n), folder: 'iass', anio: EJ_YY, tipoDj: 'IASS anual', clienteId: 'c16', hecho: true, presentada: ejF(4, 22), importe: 9800, medio: 'Abitab', fechaPago: ejF(5, 28), estado: 'Presentada', venc: ejF(5, 30), notas: '' });
  out.push({ id: 'dj' + (++n), folder: 'iass', anio: EJ_YY, tipoDj: 'IRPF arrendamientos', clienteId: 'c19', hecho: false, presentada: '', importe: '', medio: '', fechaPago: '', estado: 'En proceso', venc: ejF(EJ_MM, 26), notas: 'Faltan dos recibos de alquiler.' });
  // Nada presentado ni pagado con fecha futura.
  out.forEach(function (x) { if (x.presentada && !ejYaFue(x.presentada)) { x.presentada = ''; x.hecho = false; x.estado = 'En proceso'; } if (x.fechaPago && !ejYaFue(x.fechaPago)) x.fechaPago = ''; });
  return out;
}

/* ===== TAREAS EXTRAS ===== */
function ejTareas() {
  var t = function (id, tarea, cid, etq, urg, mes, dia, estado, info) {
    return { id: id, tarea: tarea, clienteId: cid, etiqueta: etq, urgencia: urg, plazo: ejF(mes, dia),
      estado: estado, hecho: estado === 'Hecha', info: info || '' };
  };
  return [
    t('t1', 'Certificado único DGI', 'c2', 'DGI', 'Alta', EJ_MM, 12, 'Pendiente', 'Lo piden para una licitación. Vence el certificado viejo.'),
    t('t2', 'Flujo de fondos', 'c1', 'Banco', 'Media', EJ_MM, 18, 'En proceso', 'Para el préstamo del BROU.'),
    t('t3', 'Certificado contable', 'c7', 'Cliente nuevo', 'Alta', EJ_MM, 15, 'En proceso', 'Lo necesitan para renovar la cuenta corriente.'),
    t('t4', 'Habilitación de la Intendencia', 'c18', 'Interno', 'Media', EJ_MM, 24, 'Pendiente', 'Gestoría: presentar el plano y el certificado de bomberos.'),
    t('t5', 'Plan de redes de octubre', 'c9', 'Interno', 'Baja', EJ_MM, 28, 'Pendiente', 'Marketing: calendario de publicaciones del mes.'),
    t('t6', 'Estado de situación', 'c3', 'Banco', 'Alta', EJ_MM - 1, 20, 'Hecha', 'Entregado y firmado.'),
    t('t7', 'Certificado común BPS', 'c11', 'BPS', 'Media', EJ_MM - 1, 10, 'Hecha', ''),
    t('t8', 'Alta de empleado en BPS', 'c18', 'BPS', 'Alta', EJ_MM - 6, 14, 'Hecha', 'Entró una moza nueva.'),
    t('t9', 'Cambio de domicilio fiscal', 'c8', 'DGI', 'Baja', EJ_MM - 2, 8, 'Hecha', ''),
    t('t10', 'Asesoramiento financiero: costos', 'c15', 'Interno', 'Media', EJ_MM - 2, 26, 'Hecha', 'Armamos el cuadro de costos por prestación.'),
    t('t11', 'Clausura de unipersonal', 'c10', 'DGI', 'Media', EJ_MM - 3, 30, 'Hecha', ''),
    t('t12', 'Certificado único DGI', 'c17', 'DGI', 'Baja', EJ_MM - 4, 12, 'Hecha', ''),
  ].filter(function (x) { return x.plazo >= ejF(0, 1); });
}

/* ===== EMPRESAS Y SERV. PROFESIONALES (las grillas mensuales) =====
   Los meses que ya pasaron están hechos y enviados al cliente; el mes en curso, a medias. */
function ejCelda(m, dia, enviado) {
  var f = ejF(m, dia);
  if (!ejYaFue(f)) return null;
  var c = { estado: 'done', fecha: f, etiqueta: '', comentario: '', enviado: false, fechaEnvio: '' };
  if (enviado) { var fe = ejF(m, dia + 2); if (ejYaFue(fe)) { c.enviado = true; c.fechaEnvio = fe; } }
  return c;
}
// Arma los 12 meses de una fila. `saltea` son meses en los que no corresponde (N/A).
function ejCeldas(dia, saltea, pendienteDesde) {
  var cells = {};
  for (var m = 0; m <= EJ_MM; m++) {
    if ((saltea || []).indexOf(m) >= 0) { cells[EJ_YY + '-' + m] = { estado: 'na', fecha: '', etiqueta: '', comentario: '', enviado: false, fechaEnvio: '' }; continue; }
    if (pendienteDesde != null && m >= pendienteDesde) { cells[EJ_YY + '-' + m] = { estado: 'pend', fecha: '', etiqueta: '', comentario: '', enviado: false, fechaEnvio: '' }; continue; }
    var c = ejCelda(m, dia, true);
    if (c) cells[EJ_YY + '-' + m] = c;
  }
  return cells;
}
function ejGrids() {
  var emp = [
    ['e1', 'Panadería La Espiga SRL', 'c2', 'CEDE', 14, [], null],
    ['e2', 'Transportes del Norte SA', 'c3', 'CEDE', 16, [], null],
    ['e3', 'Almacén Doña Nelly', 'c5', 'No CEDE', 11, [], EJ_MM],
    ['e4', 'Ferretería El Clavo SRL', 'c7', 'No CEDE', 12, [], null],
    ['e5', 'Óptica Visión Rivera', 'c8', 'Pequeña empresa', 18, [], EJ_MM],
    ['e6', 'Farmacia Santa Rita', 'c11', 'CEDE', 15, [], null],
    ['e7', 'Agropecuaria Cerro Chato SRL', 'c13', 'No CEDE', 19, [0, 1], null],
    ['e8', 'Distribuidora Frontera SA', 'c17', 'CEDE', 13, [], EJ_MM],
    ['e9', 'Café Las Delicias', 'c18', 'Unipersonal', 17, [0, 1], null],
  ];
  var prof = [
    ['s1', 'Silveira, Valentina', 'c1', 21, [], null],
    ['s2', 'Techera, Rodrigo', 'c6', 22, [], null],
    ['s3', 'Barbosa, Mariana', 'c9', 20, [], EJ_MM],
    ['s4', 'Da Rosa, Gustavo', 'c12', 23, [], null],
    ['s5', 'Olivera, Carmen', 'c16', 24, [], EJ_MM],
    ['s6', 'Méndez, Alicia', 'c19', 21, [2], null],
  ];
  return {
    empresas: { rows: emp.map(function (r) { return { id: r[0], nombre: r[1], clienteId: r[2], tipo: r[3], cells: ejCeldas(r[4], r[5], r[6]) }; }) },
    sprof: { rows: prof.map(function (r) { return { id: r[0], nombre: r[1], clienteId: r[2], tipo: '', cells: ejCeldas(r[3], r[4], r[5]) }; }) },
    sueldos: { rows: [] },
  };
}

/* ===== CALENDARIO (lo propio del estudio; los vencimientos de DGI y BPS salen solos) ===== */
function ejCalendario() {
  var ev = function (id, titulo, m, d) { return { id: id, titulo: titulo, fecha: ejF(m, d) }; };
  return [
    ev('ev1', 'Reunión con Panadería La Espiga', EJ_MM, 14),
    ev('ev2', 'Entregar certificado — Ferretería El Clavo', EJ_MM, 15),
    ev('ev3', 'Cierre de balance Transportes del Norte', EJ_MM, 20),
    ev('ev4', 'Marketing: reunión de contenidos con Mariana', EJ_MM, 22),
    ev('ev5', 'Llamar a Gomería Ruta 5 por los honorarios', EJ_MM, 24),
    ev('ev6', 'Charla DGI — factura electrónica', EJ_MM + 1, 6),
    ev('ev7', 'Visita a Estancia Los Ceibos (DICOSE)', EJ_MM + 1, 12),
    ev('ev8', 'Cerrar la contabilidad del trimestre', EJ_MM + 1, 28),
  ];
}

/* ===== NOTAS ADHESIVAS DEL PANEL ===== */
function ejNotas() {
  return [
    { id: 'n1', text: NOTA_BIENVENIDA, color: '#d3f0dd', date: '' },
    { id: 'n2', text: 'Pedir a La Espiga las facturas de compra que faltan del mes.\n\nSin eso no cierra el IVA.', color: '#fff3bf', date: ejF(EJ_MM, Math.max(1, EJ_HOY.getDate() - 2)) },
    { id: 'n3', text: 'Presupuesto de Marketing para Clínica Dental Sonrisa:\n— redes\n— cartelería\n\nMandarlo esta semana.', color: '#d6e6fb', date: ejF(EJ_MM, Math.max(1, EJ_HOY.getDate() - 5)) },
    { id: 'n4', text: 'Subir al Drive las copias de las DJ de setiembre.', color: '#eadcf7', date: ejF(EJ_MM, Math.max(1, EJ_HOY.getDate() - 1)) },
  ];
}
