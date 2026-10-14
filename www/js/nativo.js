// =====================================================================
// Puente con el extractor nativo (WebView oculta dentro de MainActivity)
// =====================================================================

var _nativeCallbacks = {};
var _nativeCallbackCounter = 0;
var _nativeTimeouts = {};

window.__onNativeExtract = function(callbackId, resultadoJson) {
  console.log('[NATIVO] callback recibido:', callbackId);
  
  // Limpiar el timeout de seguridad
  if (_nativeTimeouts[callbackId]) {
    clearTimeout(_nativeTimeouts[callbackId]);
    delete _nativeTimeouts[callbackId];
  }
  
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

    // Timeout de seguridad en JS: si Java no responde en 50s, fallamos
    _nativeTimeouts[id] = setTimeout(function() {
      delete _nativeCallbacks[id];
      delete _nativeTimeouts[id];
      console.log('[NATIVO] TIMEOUT en JS para ' + id);
      resolve({ ok: false, error: 'timeout JS (el proceso nativo no respondio)' });
    }, 50000);

    try {
      window.NativeExtractor.extraerTexto(url, id);
      console.log('[NATIVO] Solicitud enviada para: ' + url + ' id=' + id);
    } catch (e) {
      clearTimeout(_nativeTimeouts[id]);
      delete _nativeTimeouts[id];
      delete _nativeCallbacks[id];
      resolve({ ok: false, error: 'error al invocar: ' + e.message });
    }
  });
}
