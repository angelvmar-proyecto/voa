// =====================================================================
// Puente con el extractor nativo (WebView oculta dentro de MainActivity)
// =====================================================================

var _nativeCallbacks = {};
var _nativeCallbackCounter = 0;

window.__onNativeExtract = function(callbackId, resultadoJson) {
  console.log('[NATIVO] callback recibido:', callbackId);
  var cb = _nativeCallbacks[callbackId];
  if (!cb) return;
  delete _nativeCallbacks[callbackId];
  try {
    var data = JSON.parse(resultadoJson);
    cb(data);
  } catch (e) {
    cb({ ok: false, error: 'parse: ' + e.message });
  }
};

function extraerConNativo(url) {
  return new Promise(function(resolve) {
    if (!window.NativeExtractor || !window.NativeExtractor.extraerTexto) {
      resolve({ ok: false, error: 'NativeExtractor no disponible (abrir en APK, no navegador)' });
      return;
    }
    var id = 'cb_' + (++_nativeCallbackCounter) + '_' + Date.now();
    _nativeCallbacks[id] = resolve;

    try {
      window.NativeExtractor.extraerTexto(url, id);
      console.log('[NATIVO] Solicitud enviada para: ' + url);
    } catch (e) {
      delete _nativeCallbacks[id];
      resolve({ ok: false, error: 'error al invocar: ' + e.message });
    }
  });
}
