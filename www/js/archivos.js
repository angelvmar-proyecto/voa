var Plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
var Filesystem = Plugins.Filesystem;
var Directory = { Data: 'DATA', Documents: 'DOCUMENTS', Cache: 'CACHE', External: 'EXTERNAL' };
var CARPETA_AUDIOS = 'audios/';
var CARPETA_TEXTOS = 'textos/';

async function guardarJSON(nombre, datos) {
  await Filesystem.writeFile({
    path: nombre, data: JSON.stringify(datos),
    directory: Directory.External, encoding: 'utf8', recursive: true
  });
}

async function leerJSON(nombre) {
  try {
    var r = await Filesystem.readFile({
      path: nombre, directory: Directory.External, encoding: 'utf8', recursive: true
    });
    return JSON.parse(r.data);
  } catch (e) { return null; }
}

async function leerTexto(nombre) {
  try {
    var r = await Filesystem.readFile({
      path: nombre, directory: Directory.External, encoding: 'utf8', recursive: true
    });
    return r.data;
  } catch (e) { return null; }
}

async function existeArchivo(nombre) {
  try {
    await Filesystem.stat({ path: nombre, directory: Directory.External, recursive: true });
    return true;
  } catch (e) { return false; }
}

async function escribirArchivo(nombre, data, encoding) {
  var opts = { path: nombre, data: data, directory: Directory.External, recursive: true };
  if (encoding) opts.encoding = encoding;
  await Filesystem.writeFile(opts);
}

async function bajar(url, comoTexto) {
  if (Plugins.CapacitorHttp) {
    var opts = { url: url, headers: { 'User-Agent': 'Mozilla/5.0' } };
    if (!comoTexto) opts.responseType = 'arraybuffer';
    var r = await Plugins.CapacitorHttp.get(opts);
    if (r.status >= 400) throw new Error('HTTP ' + r.status);
    if (comoTexto) return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    return r.data;
  }
  var res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return comoTexto ? await res.text() : await res.arrayBuffer();
}
