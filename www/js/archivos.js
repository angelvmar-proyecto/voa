// ⚠️⚠️⚠️ REEMPLAZA 'PEGA_AQUI_TU_NUEVA_KEY' CON TU API KEY DE JINA.AI ⚠️⚠️⚠️
var JINA_API_KEY = 'jina_7106381c738c462b964f4288963870d1HKCWz9z8vrlWkBU6cT01jNV3jWc4';

var CARPETA_AUDIOS = 'MiInglesVOA/audios/';
var CARPETA_TEXTOS = 'MiInglesVOA/textos/';

// Helpers que consultan plugins en tiempo de ejecucion
function getFilesystem() {
  var p = (window.Capacitor && window.Capacitor.Plugins) || {};
  return p.Filesystem;
}
function getCapacitorHttp() {
  var p = (window.Capacitor && window.Capacitor.Plugins) || {};
  return p.CapacitorHttp;
}
var Directory = { Data: 'DATA', Documents: 'DOCUMENTS', Cache: 'CACHE', External: 'EXTERNAL', ExternalStorage: 'EXTERNAL_STORAGE' };

async function guardarJSON(nombre, datos) {
  await getFilesystem().writeFile({
    path: nombre, data: JSON.stringify(datos),
    directory: Directory.External, encoding: 'utf8', recursive: true
  });
}

async function leerJSON(nombre) {
  try {
    var r = await getFilesystem().readFile({
      path: nombre, directory: Directory.External, encoding: 'utf8', recursive: true
    });
    return JSON.parse(r.data);
  } catch (e) { return null; }
}

async function leerTexto(nombre) {
  try {
    var r = await getFilesystem().readFile({
      path: nombre, directory: Directory.External, encoding: 'utf8', recursive: true
    });
    return r.data;
  } catch (e) { return null; }
}

async function existeArchivo(nombre) {
  try {
    await getFilesystem().stat({ path: nombre, directory: Directory.External, recursive: true });
    return true;
  } catch (e) { return false; }
}

async function escribirArchivo(nombre, data, encoding) {
  var opts = { path: nombre, data: data, directory: Directory.External, recursive: true };
  if (encoding) opts.encoding = encoding;
  await getFilesystem().writeFile(opts);
}

async function bajar(url, comoTexto) {
  var headers = { 'User-Agent': 'Mozilla/5.0' };

  // Si es jina.ai, agregar Authorization
  if (url.indexOf('r.jina.ai') >= 0 && JINA_API_KEY && JINA_API_KEY.indexOf('PEGA_AQUI') < 0) {
    headers['Authorization'] = 'Bearer ' + JINA_API_KEY;
    headers['X-Return-Format'] = 'markdown';
  }

  var http = getCapacitorHttp();
  if (http) {
    var opts = { url: url, headers: headers };
    if (!comoTexto) opts.responseType = 'arraybuffer';
    var r = await http.get(opts);
    if (r.status >= 400) throw new Error('HTTP ' + r.status);
    if (comoTexto) return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    return r.data;
  }

  var res = await fetch(url, { headers: headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return comoTexto ? await res.text() : await res.arrayBuffer();
}
