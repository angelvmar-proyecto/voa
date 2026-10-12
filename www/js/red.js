async function bajar(url, comoTexto) {
  if (Plugins.CapacitorHttp) {
    var opts = { url: url, headers: { 'User-Agent': 'Mozilla/5.0' } };
    if (!comoTexto) opts.responseType = 'arraybuffer';
    var r = await Plugins.CapacitorHttp.get(opts);
    if (r.status >= 400) throw new Error('HTTP ' + r.status);
    if (comoTexto) {
      return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    }
    return r.data;
  }
  var res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return comoTexto ? await res.text() : await res.arrayBuffer();
}
