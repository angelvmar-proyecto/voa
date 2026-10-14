// =====================================================================
// MINIWEB: carga la pagina de VOA en un iframe oculto con JS habilitado
// para extraer el texto ya renderizado, igual que hace un navegador.
// =====================================================================

var _miniwebLog = [];

function mwLog(msg) {
  var t = new Date().toLocaleTimeString('es-MX');
  var linea = '[' + t + '] ' + msg;
  _miniwebLog.push(linea);
  console.log('[MW] ' + msg);
  // Refrescar panel si esta visible
  var panel = document.getElementById('miniweb-log');
  if (panel && panel.style.display === 'block') {
    panel.textContent = _miniwebLog.join('\n');
  }
}

async function descargarConMiniweb(url, segundosEspera) {
  segundosEspera = segundosEspera || 6;
  mwLog('===========================================');
  mwLog('INICIO descargaConMiniweb');
  mwLog('URL: ' + url);
  mwLog('Espera: ' + segundosEspera + ' segundos');

  // Crear iframe
  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '1024px';
  iframe.style.height = '768px';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  document.body.appendChild(iframe);

  mwLog('Iframe creado. Cargando URL...');

  var cargado = false;
  var errorLoad = null;

  await new Promise(function(resolve) {
    var timeout = setTimeout(function() {
      if (!cargado) {
        mwLog('⚠️ Timeout esperando onload');
        resolve();
      }
    }, 30000);

    iframe.onload = function() {
      if (cargado) return;
      cargado = true;
      clearTimeout(timeout);
      mwLog('✅ onload disparado');
      // Esperar a que VOA ejecute su JavaScript
      mwLog('Esperando ' + segundosEspera + 's a que corra el JS de VOA...');
      setTimeout(resolve, segundosEspera * 1000);
    };

    iframe.onerror = function(e) {
      errorLoad = e;
      mwLog('❌ onerror: ' + (e && e.message ? e.message : 'desconocido'));
      clearTimeout(timeout);
      resolve();
    };

    iframe.src = url;
  });

  mwLog('Extrayendo contenido del iframe...');

  var resultado = { exito: false, texto: '', longitud: 0, titulo: '', error: null };

  try {
    var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    if (!doc) {
      throw new Error('Sin acceso a contentDocument (cross-origin bloqueado)');
    }

    mwLog('✅ contentDocument accesible');
    mwLog('Titulo: ' + (doc.title || '(sin titulo)'));
    mwLog('Body length: ' + (doc.body ? doc.body.innerHTML.length : 0) + ' chars');

    // Log de tamanos por selector
    var selectores = ['.wsw', 'article', 'main', '.wsw__embed', '.media-block', 'p', 'div'];
    for (var i = 0; i < selectores.length; i++) {
      var count = doc.querySelectorAll(selectores[i]).length;
      mwLog('  ' + selectores[i] + ': ' + count + ' elementos');
    }

    // Contar parrafos con texto
    var parrafos = doc.querySelectorAll('p');
    var conTexto = 0;
    for (var j = 0; j < parrafos.length; j++) {
      if ((parrafos[j].innerText || '').trim().length > 20) conTexto++;
    }
    mwLog('Parrafos con texto (>20 chars): ' + conTexto);

    // Extraer texto del body completo
    var bodyText = doc.body ? doc.body.innerText : '';
    mwLog('Body innerText total: ' + bodyText.length + ' chars');

    // Guardar HTML crudo
    var htmlRaw = doc.documentElement.outerHTML;

    // Intentar extraer texto del articulo
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('[itemprop="articleBody"]') ||
              doc.querySelector('.article-content') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('article') ||
              doc.querySelector('main');

    if (art) {
      mwLog('✅ Contenedor de articulo encontrado: ' + (art.className || art.tagName));
      var texto = art.innerText || '';
      mwLog('Texto del articulo: ' + texto.length + ' chars');

      // Limpiar
      var lineas = texto.split('\n')
        .map(function(l) { return l.trim(); })
        .filter(function(l) {
          if (!l || l.length < 3) return false;
          if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return false;
          if (/^(Download Lesson|Your browser doesn|Speaking Practice|Pronunciation|Conversation|Learn the alphabet|Listening Quiz|Video|Audio|Subscribe|Share|Embed|Previous|Next|Advertisement)$/i.test(l)) return false;
          return true;
        });
      resultado.texto = lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      resultado.longitud = resultado.texto.length;
      resultado.exito = resultado.longitud > 100;
      resultado.titulo = doc.title;
    } else {
      mwLog('❌ No se encontro contenedor de articulo');
      // Fallback: usar body completo
      resultado.texto = bodyText;
      resultado.longitud = bodyText.length;
    }

    // Guardar HTML crudo para diagnostico
    try {
      await Filesystem.writeFile({
        path: 'miniweb_raw_' + Date.now() + '.html',
        data: htmlRaw,
        directory: Directory.External,
        encoding: 'utf8',
        recursive: true
      });
      mwLog('✅ HTML crudo guardado como miniweb_raw_*.html');
    } catch (e) {
      mwLog('No se pudo guardar HTML crudo: ' + e.message);
    }

  } catch (e) {
    resultado.error = e.message;
    mwLog('❌ Error: ' + e.message);
  }

  // Limpiar
  document.body.removeChild(iframe);
  mwLog('Iframe eliminado');
  mwLog('Resultado: exito=' + resultado.exito + ' longitud=' + resultado.longitud);
  mwLog('===========================================');

  // Guardar log
  try {
    await Filesystem.writeFile({
      path: 'miniweb_log.txt',
      data: _miniwebLog.join('\n'),
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}

  return resultado;
}

// === Nueva funcion de descarga usando miniweb ===
async function descargarVOA_Miniweb(tab, i, boton) {
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner"></span> Audio...';
  mwLog('--- descargarVOA_Miniweb tab=' + tab + ' i=' + i + ' ---');

  try {
    // 1) Bajar audio
    var mp3Url = it.mp3;
    if (!mp3Url && it.pagina) {
      var html = await bajar(aAmp(it.pagina), true);
      var m = html.match(/(https?:\/\/[^\s"'<>\\]+\.mp3)/i);
      if (!m) throw new Error('No se encontro MP3');
      mp3Url = m[1].replace(/\\\//g, '/');
    }
    var base64 = await bajar(mp3Url, false);
    await escribirArchivo(rutas.audio, base64);
    mwLog('Audio guardado: ' + rutas.audio);

    // 2) Bajar texto con miniweb
    boton.innerHTML = '<span class="spinner"></span> Texto (miniweb)...';
    var res = await descargarConMiniweb(it.pagina, 8);

    if (res.exito) {
      await escribirArchivo(rutas.texto, res.texto, 'utf8');
      mwLog('✅ Texto guardado: ' + res.longitud + ' chars');
      boton.classList.add('guardado');
      boton.innerHTML = '✅ Guardado';
    } else {
      mwLog('⚠️ Texto no extraido. Longitud: ' + res.longitud);
      boton.classList.add('guardado');
      boton.innerHTML = '✅ Audio (sin texto)';
    }
    boton.disabled = false;
    await cargarVista(tab);
  } catch (err) {
    mwLog('❌ Error: ' + err.message);
    boton.innerHTML = '❌ Reintentar';
    boton.disabled = false;
    alert('Error: ' + err.message);
  }
}

// === Mostrar panel de logs miniweb ===
async function mostrarLogMiniweb() {
  var panel = document.getElementById('miniweb-log');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'miniweb-log';
    panel.style.cssText = 'background:#1e293b;color:#a7f3d0;padding:10px;border-radius:8px;' +
                          'font-family:monospace;font-size:11px;white-space:pre-wrap;' +
                          'max-height:60vh;overflow-y:auto;margin-top:12px;';
    var lista = document.getElementById('lista-words');
    if (lista && lista.parentNode) lista.parentNode.insertBefore(panel, lista);
  }

  if (panel.style.display === 'block') {
    panel.style.display = 'none';
    return;
  }

  // Cargar logs previos del archivo + buffer actual
  var guardados = '';
  try {
    var r = await Filesystem.readFile({
      path: 'miniweb_log.txt',
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
    guardados = r.data || '';
  } catch (e) {}

  panel.textContent = guardados || '(Sin logs. Descarga algo primero.)';
  panel.style.display = 'block';
}
