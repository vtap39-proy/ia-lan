/**
 * IA-lan 2.0 · API de Google Sheets
 * ---------------------------------
 * Conecta la app IA_lan (celular) y IA-lan-Coach (computadora) con este Sheet.
 *
 * Instalación (una sola vez):
 *   1. Pega este archivo como Code.gs y Datos.gs como segundo archivo.
 *   2. Ejecuta la función  instalar  y autoriza los permisos.
 *   3. Implementar → Nueva implementación → Aplicación web
 *      (Ejecutar como: yo · Quién tiene acceso: cualquier usuario).
 *   4. Copia la URL que termina en /exec: es la "llave" de tus apps. No la publiques.
 */

var VERSION_API = '2.0.0';

/* ====================== HOJAS ====================== */
var HOJAS = {
  Config:        ['clave', 'valor'],
  Evaluaciones:  ['fecha', 'peso_kg', 'grasa_kg', 'grasa_pct', 'musculo_kg', 'imc', 'grasa_visceral',
                  'cintura_cm', 'cadera_cm', 'icc', 'agua_corporal_L', 'proteina_kg', 'minerales_kg',
                  'tmb_kcal', 'puntuacion_inbody', 'presion_sis', 'presion_dia', 'diagnostico', 'fuente', 'json'],
  PlanOpciones:  ['eval_fecha', 'id', 'columna', 'titulo', 'items', 'dias_origen'],
  PlanSemanal:   ['dia', 'tipo', 'columna', 'ref', 'inicio', 'duracion_min'],
  Rutinas:       ['version', 'fecha', 'activa', 'nombre', 'json'],
  Rutina:        ['version', 'dia', 'orden', 'ejercicio_id', 'ejercicio', 'series', 'reps', 'rir', 'descanso_s', 'tipo'],
  Series:        ['sesion_id', 'fecha', 'dia_key', 'ejercicio_id', 'ejercicio', 'serie', 'peso_lb', 'reps', 'hecha', 'terminada', 'actualizado'],
  Diario:        ['fecha', 'comidas', 'agua_vasos', 'suplementos', 'pasos', 'notas', 'actualizado']
};

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre) {
  var sh = ss_().getSheetByName(nombre);
  if (!sh) {
    sh = ss_().insertSheet(nombre);
    var enc = HOJAS[nombre];
    // Todo en texto para que Sheets no convierta fechas ni horas
    sh.getRange(1, 1, sh.getMaxRows(), enc.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground('#fde3cc');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Lee una hoja como lista de objetos. */
function leer_(nombre) {
  var sh = hoja_(nombre);
  var n = sh.getLastRow();
  if (n < 2) return [];
  var enc = HOJAS[nombre];
  var vals = sh.getRange(2, 1, n - 1, enc.length).getValues();
  return vals.filter(function (r) { return String(r[0]) !== ''; }).map(function (r) {
    var o = {};
    enc.forEach(function (k, i) { o[k] = r[i] instanceof Date ? fechaTxt_(r[i]) : r[i]; });
    return o;
  });
}

/** Reemplaza todo el contenido de una hoja (sin encabezado). */
function escribirTodo_(nombre, objetos) {
  var sh = hoja_(nombre);
  var enc = HOJAS[nombre];
  var n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, enc.length).clearContent();
  if (!objetos.length) return;
  var filas = objetos.map(function (o) { return enc.map(function (k) { return celda_(o[k]); }); });
  sh.getRange(2, 1, filas.length, enc.length).setNumberFormat('@').setValues(filas);
}

/**
 * Inserta o actualiza filas según una clave (función que devuelve un texto a partir del objeto).
 * Los campos que no vienen en el objeto se conservan.
 */
function upsert_(nombre, objetos, claveFn) {
  if (!objetos.length) return 0;
  var sh = hoja_(nombre);
  var enc = HOJAS[nombre];
  var n = sh.getLastRow();
  var vals = n > 1 ? sh.getRange(2, 1, n - 1, enc.length).getValues() : [];
  var idx = {};
  vals.forEach(function (r, i) {
    var o = {}; enc.forEach(function (k, j) { o[k] = r[j] instanceof Date ? fechaTxt_(r[j]) : r[j]; });
    idx[claveFn(o)] = i;
  });
  var nuevas = [];
  objetos.forEach(function (o) {
    var k = claveFn(o);
    if (idx.hasOwnProperty(k)) {
      var fila = vals[idx[k]];
      enc.forEach(function (c, j) { if (o.hasOwnProperty(c)) fila[j] = celda_(o[c]); });
    } else {
      var f = enc.map(function (c) { return celda_(o[c]); });
      idx[k] = vals.length + nuevas.length;
      nuevas.push(f);
    }
  });
  var todas = vals.concat(nuevas);
  if (todas.length) sh.getRange(2, 1, todas.length, enc.length).setNumberFormat('@').setValues(todas);
  return objetos.length;
}

function celda_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}
function fechaTxt_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function ahora_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function json_(txt, def) { try { return txt ? JSON.parse(txt) : def; } catch (e) { return def; } }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

/* ====================== CONFIG ====================== */
function config_() {
  var c = {};
  leer_('Config').forEach(function (r) { c[r.clave] = r.valor; });
  return c;
}
function setConfig_(clave, valor) { upsert_('Config', [{ clave: clave, valor: valor }], function (o) { return o.clave; }); }

/* ====================== INSTALACIÓN ====================== */
/** Ejecuta esta función una vez desde el editor. Crea las hojas y carga los datos iniciales. */
function instalar() {
  Object.keys(HOJAS).forEach(hoja_);
  var hoja1 = ss_().getSheetByName('Hoja 1') || ss_().getSheetByName('Sheet1');
  if (hoja1 && hoja1.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(hoja1);

  if (config_().instalado) { Logger.log('IA-lan ya estaba instalado. No se cargaron datos de nuevo.'); return; }
  var S = SEMILLA;
  Object.keys(S.config).forEach(function (k) { setConfig_(k, S.config[k]); });
  guardarRutina_(S.rutina, true);
  upsert_('Series', S.series.map(function (s) { s.actualizado = ahora_(); return s; }), claveSerie_);
  upsert_('Evaluaciones', S.evaluaciones, function (o) { return String(o.fecha); });
  importarEvaluacion_(S.evaluacion_completa);
  guardarSemana_(S.semana);
  setConfig_('instalado', ahora_());
  Logger.log('✓ IA-lan instalado: ' + S.series.length + ' series, ' + S.evaluaciones.length + ' evaluaciones.');
}

/* ====================== LÓGICA ====================== */
function claveSerie_(o) { return o.sesion_id + '#' + o.ejercicio_id + '#' + o.serie; }

function guardarRutina_(rutina, activar) {
  var lista = leer_('Rutinas');
  var version = rutina.version || (lista.reduce(function (m, r) { return Math.max(m, Number(r.version) || 0); }, 0) + 1);
  rutina.version = version;
  if (activar) lista.forEach(function (r) { r.activa = false; });
  lista = lista.filter(function (r) { return String(r.version) !== String(version); });
  lista.push({ version: version, fecha: rutina.fecha || fechaTxt_(new Date()), activa: !!activar, nombre: rutina.nombre || '', json: rutina });
  lista.sort(function (a, b) { return Number(a.version) - Number(b.version); });
  escribirTodo_('Rutinas', lista);
  if (activar) {
    setConfig_('rutina_activa', version);
    var plana = [];
    rutina.dias.forEach(function (d) {
      d.ejercicios.forEach(function (e, i) {
        plana.push({ version: version, dia: d.nombre, orden: i + 1, ejercicio_id: e.id, ejercicio: e.nombre,
          series: e.series, reps: e.reps, rir: e.rir, descanso_s: e.descanso_s, tipo: e.tipo });
      });
    });
    escribirTodo_('Rutina', plana);
  }
  return version;
}

function rutinaActiva_() {
  var lista = leer_('Rutinas');
  var act = lista.filter(function (r) { return bool_(r.activa); })[0] || lista[lista.length - 1];
  return act ? json_(act.json, null) : null;
}

function importarEvaluacion_(ev) {
  if (!ev || ev.tipo !== 'ialan-evaluacion' || !ev.fecha) throw new Error('El archivo no es una evaluación de IA-lan.');
  var m = ev.mediciones || {};
  var fila = { fecha: ev.fecha, diagnostico: ev.diagnostico || '', fuente: ev.fuente || '', json: ev };
  HOJAS.Evaluaciones.forEach(function (k) { if (m.hasOwnProperty(k)) fila[k] = m[k]; });
  upsert_('Evaluaciones', [fila], function (o) { return String(o.fecha); });
  if (ev.plan && ev.plan.opciones && ev.plan.opciones.length) {
    var resto = leer_('PlanOpciones').filter(function (o) { return String(o.eval_fecha) !== ev.fecha; });
    var nuevas = ev.plan.opciones.map(function (o) {
      return { eval_fecha: ev.fecha, id: o.id, columna: o.columna, titulo: o.titulo, items: o.items, dias_origen: (o.dias || []).join(',') };
    });
    escribirTodo_('PlanOpciones', resto.concat(nuevas));
    setConfig_('plan_activo', ev.fecha);
    setConfig_('plan_kcal', ev.plan.kcal || '');
    setConfig_('plan_columnas', ev.plan.columnas || []);
    if (ev.plan.agua_L) setConfig_('meta_agua_L', ev.plan.agua_L);
  }
  return ev.fecha;
}

function guardarSemana_(semana) {
  escribirTodo_('PlanSemanal', semana.bloques || []);
  if (semana.eval_fecha) setConfig_('semana_plan', semana.eval_fecha);
  setConfig_('semana_actualizada', ahora_());
}

/** Datos que necesitan las apps. dias = cuántos días de historial (series/diario). */
function todo_(dias) {
  var c = config_();
  var desde = '';
  if (dias) { var d = new Date(); d.setDate(d.getDate() - dias); desde = fechaTxt_(d); }
  var plan = String(c.plan_activo || '');
  return {
    ok: true, version_api: VERSION_API, generado: ahora_(),
    config: c,
    rutina: rutinaActiva_(),
    rutinas: leer_('Rutinas').map(function (r) { return { version: r.version, fecha: r.fecha, activa: bool_(r.activa), nombre: r.nombre }; }),
    evaluaciones: leer_('Evaluaciones').map(function (e) { var o = {}; Object.keys(e).forEach(function (k) { if (k !== 'json') o[k] = e[k]; }); return o; }),
    plan: {
      eval_fecha: plan, kcal: c.plan_kcal, columnas: json_(c.plan_columnas, []),
      opciones: leer_('PlanOpciones').filter(function (o) { return String(o.eval_fecha) === plan; })
        .map(function (o) { return { id: o.id, columna: o.columna, titulo: o.titulo, items: json_(o.items, []), dias: String(o.dias_origen).split(',') }; })
    },
    semana: leer_('PlanSemanal').map(function (b) { b.dia = Number(b.dia); b.duracion_min = Number(b.duracion_min); return b; }),
    series: leer_('Series').filter(function (s) { return !desde || String(s.fecha) >= desde; })
      .map(function (s) { s.serie = Number(s.serie); s.hecha = bool_(s.hecha); s.terminada = bool_(s.terminada); return s; }),
    diario: leer_('Diario').filter(function (r) { return !desde || String(r.fecha) >= desde; })
      .map(function (r) { r.comidas = json_(r.comidas, {}); r.suplementos = json_(r.suplementos, {}); r.agua_vasos = Number(r.agua_vasos) || 0; r.pasos = Number(r.pasos) || 0; return r; })
  };
}

/** Aplica cambios que manda la app (en lote; funciona aunque se hayan acumulado sin señal). */
function sync_(ops) {
  var series = [], diario = [], terminar = [];
  (ops || []).forEach(function (op) {
    if (op.t === 'serie') { op.d.actualizado = ahora_(); series.push(op.d); }
    else if (op.t === 'diario') { op.d.actualizado = ahora_(); diario.push(op.d); }
    else if (op.t === 'terminar') terminar.push(op.d.sesion_id);
    else if (op.t === 'borrarSesion') borrarSesion_(op.d.sesion_id);
  });
  upsert_('Series', series, claveSerie_);
  upsert_('Diario', diario, function (o) { return String(o.fecha); });
  if (terminar.length) {
    var todas = leer_('Series');
    var marcadas = todas.filter(function (s) { return terminar.indexOf(s.sesion_id) >= 0; })
      .map(function (s) { return { sesion_id: s.sesion_id, ejercicio_id: s.ejercicio_id, serie: s.serie, terminada: true }; });
    upsert_('Series', marcadas, claveSerie_);
  }
  return { series: series.length, diario: diario.length, terminadas: terminar.length };
}

function borrarSesion_(id) {
  escribirTodo_('Series', leer_('Series').filter(function (s) { return s.sesion_id !== id; }));
}

/* ====================== QR DEL GIMNASIO ====================== */
function guardarQR_(base64, mime) {
  var c = config_();
  if (c.qr_archivo) { try { DriveApp.getFileById(c.qr_archivo).setTrashed(true); } catch (e) {} }
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'image/jpeg', 'IA-lan_QR_gimnasio');
  var f = DriveApp.createFile(blob);
  setConfig_('qr_archivo', f.getId());
  setConfig_('qr_actualizado', ahora_());
  return f.getId();
}
function leerQR_() {
  var id = config_().qr_archivo;
  if (!id) return null;
  var b = DriveApp.getFileById(id).getBlob();
  return { mime: b.getContentType(), base64: Utilities.base64Encode(b.getBytes()) };
}

/* ====================== WEB ====================== */
function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    switch (p.accion) {
      case 'todo': return salida_(todo_(Number(p.dias) || 0));
      case 'qr': return salida_({ ok: true, qr: leerQR_() });
      case 'exportar': return salida_(exportar_());
      default: return salida_({ ok: true, app: 'IA-lan', version_api: VERSION_API, saludo: config_().saludo || 'Hola' });
    }
  } catch (err) { return salida_({ ok: false, error: String(err.message || err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var b = JSON.parse(e.postData.contents || '{}');
    var r;
    switch (b.accion) {
      case 'sync': r = sync_(b.ops); break;
      case 'importarEvaluacion': r = { fecha: importarEvaluacion_(b.data) }; break;
      case 'guardarRutina': r = { version: guardarRutina_(b.rutina, b.activar !== false) }; break;
      case 'activarRutina': r = activarRutina_(b.version); break;
      case 'guardarSemana': guardarSemana_(b.semana); r = {}; break;
      case 'guardarConfig': setConfig_(b.clave, b.valor); r = {}; break;
      case 'guardarQR': r = { id: guardarQR_(b.base64, b.mime) }; break;
      default: throw new Error('Acción desconocida: ' + b.accion);
    }
    r.ok = true;
    return salida_(r);
  } catch (err) {
    return salida_({ ok: false, error: String(err.message || err) });
  } finally { lock.releaseLock(); }
}

function activarRutina_(version) {
  var r = leer_('Rutinas').filter(function (x) { return String(x.version) === String(version); })[0];
  if (!r) throw new Error('No existe la rutina versión ' + version);
  guardarRutina_(json_(r.json), true);
  return { version: version };
}

/** Paquete completo para que Claude revise tu progreso (lo descarga IA-lan-Coach). */
function exportar_() {
  var t = todo_(0);
  t.tipo = 'ialan-export';
  t.evaluaciones_completas = leer_('Evaluaciones').map(function (e) { return json_(e.json, null) || e; });
  t.rutinas_historial = leer_('Rutinas').map(function (r) { return json_(r.json, null); });
  delete t.config.qr_archivo;
  return t;
}
