// =====================================================================
// MINIWEB: Carga la pagina de VOA en un iframe oculto con JS habilitado
// y extrae el texto de la transcripcion.
// =====================================================================

var _miniwebLog = [];

function mwLog(msg) {
  var t = new Date().toLocaleTimeString('es-MX');
  var linea = '[' + t + '] ' + msg;
  _miniwebLog.push(linea);
  console.log('[MW] ' + msg);
  var panel = document.getElementById('miniweb-log');
  if (panel && panel.style.display === 'block') {
    panel.textContent = _miniwebLog.join('\n');
  }
}

async function descargarConMiniweb(url, segundosEspera) {
  segundosEspera = segundosEspera || 8;
  mwLog('===========================================');
  mwLog('INICIO descargaConMiniweb');
  mwLog('URL: ' + url);
  mwLog('Espera: ' + segundosEspera + ' segundos');

  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '1024px';
  iframe.style.height = '768px';
  // Se elimina el sandbox para permitir el acceso completo
  document.body.appendChild(iframe);

  mwLog('Iframe creado. Cargando URL...');

  await new Promise(function(resolve) {
    var timeout = setTimeout(function() {
      mwLog('⚠️ Timeout esperando onload');
      resolve();
    }, 30000);

    iframe.onload = function() {
      clearTimeout(timeout);
      mwLog('✅ onload disparado');
      mwLog('Esperando ' + segundosEspera + 's a que corra el JS de VOA...');
      setTimeout(resolve, segundosEspera * 1000);
    };

    iframe.onerror = function(e) {
      mwLog('❌ onerror');
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

    // === LOGICA DE EXTRACCION ESPECIFICA PARA VOA ===
    var textoFinal = '';

    // 1. Intentar el contenedor principal del articulo (visto en el HTML de VOA)
    var selectores = [
        '.wsw',                         // El contenedor que VOA usa para el texto
        'article',                      // Etiqueta semantica estandar
        'main',                         // Contenedor principal
        '#article-content',             // ID comun en VOA
        '.article-content',
        '.wysiwyg'
    ];

    var art = null;
    for (var i = 0; i < selectores.length; i++) {
        art = doc.querySelector(selectores[i]);
        if (art) {
            mwLog('✅ Contenedor encontrado con: ' + selectores[i]);
            break;
        }
    }

    if (art) {
        // Extraer solo los parrafos (<p>) que suelen tener el dialogo o la transcripcion
        var parrafos = art.querySelectorAll('p');
        var lineas = [];
        var vistos = {};

        for (var j = 0; j < parrafos.length; j++) {
            var t = (parrafos[j].innerText || '').trim();
            
            // Filtros: que no esten vacios y no sean basura de menu
            if (t && t.length > 5 && !/^(Download Lesson|Your browser doesn|Speaking Practice|Pronunciation|Conversation|Learn the alphabet|Listening Quiz|Video|Audio|Subscribe|Share|Embed|Previous|Next|Advertisement)$/i.test(t)) {
                if (!vistos[t]) {
                    vistos[t] = 1;
                    lineas.push(t);
                }
            }
        }
        textoFinal = lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
        mwLog('Texto extraido de parrafos: ' + textoFinal.length + ' chars');
    } else {
        mwLog('❌ No se encontro contenedor especifico, usando body completo');
        textoFinal = (doc.body ? doc.body.innerText : '').trim();
        mwLog('Texto del body completo: ' + textoFinal.length + ' chars');
    }
    // =============================================

    resultado.texto = textoFinal;
    resultado.longitud = textoFinal.length;
    resultado.exito = resultado.longitud > 200; // Exito si extrajo mas de 200 caracteres
    resultado.titulo = doc.title;

  } catch (e) {
    resultado.error = e.message;
    mwLog('❌ Error: ' + e.message);
  }

  document.body.removeChild(iframe);
  mwLog('Iframe eliminado');
  mwLog('Resultado: exito=' + resultado.exito + ' longitud=' + resultado.longitud);
  mwLog('===========================================');

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

async function descargarVOA_Miniweb(tab, i, boton) {
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner"></span> Audio...';
  mwLog('--- descargarVOA_Miniweb tab=' + tab + ' i=' + i + ' ---');

  try {
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
