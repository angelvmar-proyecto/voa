var PAGINA_INDICE_LECCIONES = 'https://learningenglish.voanews.com/p/5644.html';
var FEED_WORDS = 'https://learningenglish.voanews.com/podcast/?zoneId=987';

function extraerLeccionesDeIndice(html) {
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var lecciones = [];
  var vistos = {};
  var enlaces = doc.querySelectorAll('a');
  for (var i = 0; i < enlaces.length; i++) {
    var a = enlaces[i];
    var href = a.getAttribute('href') || '';
    var texto = a.innerText.trim();
    if (href.indexOf('/a/') === -1) continue;
    if (!/^Lesson\s+\d+/i.test(texto)) continue;
    if (href.indexOf('http') !== 0) {
      href = 'https://learningenglish.voanews.com' + (href.indexOf('/') === 0 ? '' : '/') + href;
    }
    if (vistos[href]) continue;
    vistos[href] = true;
    var numMatch = texto.match(/(\d+)/);
    var num = numMatch ? parseInt(numMatch[1], 10) : 999;
    lecciones.push({ titulo: texto, pagina: href, mp3: null, fecha: '', numero: num });
  }
  lecciones.sort(function(a, b) { return a.numero - b.numero; });
  return lecciones;
}

function parsearRSS(xml) {
  var items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  return items.map(function(it) {
    var t = it.match(/<title>([\s\S]*?)<\/title>/);
    var mp3 = it.match(/<enclosure[^>]+url=["']([^"']+\.mp3)["']/i) ||
              it.match(/<media:content[^>]+url=["']([^"']+\.mp3)["']/i) ||
              it.match(/(https?:\/\/[^\s"'<>\\]+\.mp3)/i);
    var link = it.match(/<link>([\s\S]*?)<\/link>/);
    var pub = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (!t || !mp3) return null;
    return {
      titulo: decodificarEntidades(t[1]),
      mp3: decodificarEntidades(mp3[1].replace(/\\\//g, '/')),
      pagina: link ? decodificarEntidades(link[1]) : null,
      fecha: pub ? decodificarEntidades(pub[1]) : ''
    };
  }).filter(Boolean);
}

async function actualizarBiblioteca(tab) {
  var boton = document.querySelector('#contenido-' + tab + ' .barra button');
  if (boton) boton.disabled = true;
  var textoOriginal = boton ? boton.innerHTML : '';
  if (boton) boton.innerHTML = '<span class="spinner"></span> Cargando...';
  setEstado(tab, '📡 Descargando lista...');

  try {
    var items;
    if (tab === 'lecciones') {
      var html = await bajar(PAGINA_INDICE_LECCIONES, true);
      items = extraerLeccionesDeIndice(html);
      if (!items.length) throw new Error('No se encontraron lecciones');
    } else {
      var sep = FEED_WORDS.indexOf('?') >= 0 ? '&' : '?';
      var url = FEED_WORDS + sep + '_=' + Date.now();
      var xml = await bajar(url, true);
      items = parsearRSS(xml);
      if (!items.length) throw new Error('El feed no tiene episodios');
    }
    await guardarJSON('biblioteca_' + tab + '.json', items);
    setEstado(tab, '✅ ' + items.length + ' elementos cargados', 'ok');
    await cargarVista(tab);
  } catch (e) {
    setEstado(tab, '❌ Error: ' + e.message, 'err');
  } finally {
    if (boton) { boton.disabled = false; boton.innerHTML = textoOriginal; }
  }
}

async function borrarTextos(tab) {
  if (!confirm('¿Borrar TODOS los textos de esta pestaña?')) return;
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) { alert('No hay nada.'); return; }
  var n = 0;
  for (var i = 0; i < items.length; i++) {
    var rutas = rutasPara(tab, items[i].titulo);
    try { await getFilesystem().deleteFile({ path: rutas.texto, directory: Directory.External, recursive: true }); n++; } catch (e) {}
  }
  await cargarVista(tab);
  setEstado(tab, '✅ ' + n + ' textos borrados.', 'ok');
}

function rutasPara(tab, titulo) {
  var slug = slugify(titulo);
  return {
    audio: CARPETA_AUDIOS + tab + '_' + slug + '.mp3',
    texto: CARPETA_TEXTOS + tab + '_' + slug + '.txt'
  };
}

function aAmp(url) {
  return url.replace('learningenglish.voanews.com/a/', 'learningenglish.voanews.com/amp/');
}

async function extraerTextoArticulo(url) {
  var jinaUrl = 'https://r.jina.ai/' + url;
  var md = await bajar(jinaUrl, true);

  // Guardar crudo para diagnostico
  try {
    await escribirArchivo('jina_crudo.txt', md || '(vacio)', 'utf8');
  } catch (e) {}

  return limpiarMarkdown(md);
}

async function cargarVista(tab) {
  var lista = document.getElementById('lista-' + tab);
  if (!lista) return;
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) {
    lista.innerHTML = '<div class="vacio">Sin elementos. Toca el botón de arriba.</div>';
    return;
  }
  lista.innerHTML = '';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var rutas = rutasPara(tab, it.titulo);
    var guardado = await existeArchivo(rutas.audio);
    var tieneTexto = await existeArchivo(rutas.texto);
    var div = document.createElement('div');
    div.className = 'item';
    div.innerHTML =
      '<h3>' + escapeHtml(it.titulo) + '</h3>' +
      '<div class="meta">' + (it.fecha ? formatearFecha(it.fecha) : '') + '</div>' +
      '<div class="acciones">' +
        '<button class="desc ' + (guardado ? 'guardado' : '') + '" ' +
                'data-tab="' + tab + '" data-i="' + i + '">' +
          (guardado ? '✅ Guardado' : '⬇️ Descargar') +
        '</button>' +
        '<button class="play" data-tab="' + tab + '" data-i="' + i + '">▶️ Audio</button>' +
        '<button class="texto" data-tab="' + tab + '" data-i="' + i + '">' +
          (tieneTexto ? '📖 Texto' : '📄 Bajar txt') +
        '</button>' +
      '</div>' +
      '<div id="rep_' + tab + '_' + i + '"></div>' +
      '<div id="txt_' + tab + '_' + i + '"></div>';
    lista.appendChild(div);
  }
}

async function descargarVOA(tab, i, boton) {
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner"></span> Bajando...';

  try {
    // Audio
    var mp3Url = it.mp3;
    if (!mp3Url && it.pagina) {
      var htmlLeccion = await bajar(aAmp(it.pagina), true);
      var mp3Match = htmlLeccion.match(/(https?:\/\/[^\s"'<>\\]+\.mp3)/i);
      if (!mp3Match) throw new Error('No se encontró MP3');
      mp3Url = mp3Match[1].replace(/\\\//g, '/');
    }
    var base64 = await bajar(mp3Url, false);
    await escribirArchivo(rutas.audio, base64);

    // Texto: intentar nativo, luego jina como respaldo
    if (it.pagina) {
      try {
        boton.innerHTML = '<span class="spinner"></span> Extrayendo texto...';
        var texto = '';

        // 1) Extractor nativo (WebView con JS)
        try {
          var resNativo = await extraerConNativo(it.pagina);
          if (resNativo.ok && resNativo.texto && resNativo.texto.length > 200) {
            texto = resNativo.texto;
            console.log('Texto via NATIVO: ' + texto.length + ' chars');
          } else {
            console.log('Nativo fallo: ' + (resNativo.error || 'texto corto'));
          }
        } catch (eN) { console.log('Nativo exception: ' + eN.message); }

        // 2) Respaldo: jina
        if (!texto) {
          try {
            boton.innerHTML = '<span class="spinner"></span> Respaldo...';
            texto = await extraerTextoArticulo(it.pagina);
            console.log('Texto via JINA: ' + (texto || '').length + ' chars');
          } catch (eJ) { console.log('Jina exception: ' + eJ.message); }
        }

        if (texto && texto.length > 100) {
          await escribirArchivo(rutas.texto, texto, 'utf8');
        }
      } catch (errTxt) {
        console.log('Texto falló:', errTxt.message);
      }
    }

    boton.classList.add('guardado');
    boton.innerHTML = '✅ Guardado';
    boton.disabled = false;
    await cargarVista(tab);
  } catch (err) {
    boton.innerHTML = '❌ Reintentar';
    boton.disabled = false;
    alert('Error: ' + err.message);
  }
}

async function reproducirVOA(tab, i, boton) {
  var cont = document.getElementById('rep_' + tab + '_' + i);
  if (cont.innerHTML) { cont.innerHTML = ''; boton.innerHTML = '▶️ Audio'; return; }
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  try {
    var src;
    if (await existeArchivo(rutas.audio)) {
      var r = await getFilesystem().readFile({
        path: rutas.audio, directory: Directory.External, recursive: true
      });
      src = 'data:audio/mpeg;base64,' + r.data;
    } else {
      src = it.mp3;
      if (!src) throw new Error('Descarga el audio primero');
    }
    cont.innerHTML = '<audio controls autoplay src="' + src + '"></audio>';
    boton.innerHTML = '⏸️ Ocultar';
  } catch (err) {
    boton.innerHTML = '▶️ Audio';
    alert('Error: ' + err.message);
  }
  boton.disabled = false;
}

async function mostrarTextoVOA(tab, i, boton) {
  var cont = document.getElementById('txt_' + tab + '_' + i);
  if (cont.innerHTML) { cont.innerHTML = ''; return; }
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  var texto = await leerTexto(rutas.texto);
  if (!texto && it.pagina) {
    boton.innerHTML = '<span class="spinner"></span> Extrayendo...';
    var textoNuevo = '';
    try {
      var resN = await extraerConNativo(it.pagina);
      if (resN.ok && resN.texto && resN.texto.length > 200) {
        textoNuevo = resN.texto;
      }
    } catch (eN) {}

    if (!textoNuevo) {
      try {
        textoNuevo = await extraerTextoArticulo(it.pagina);
      } catch (eJ) {}
    }

    if (textoNuevo && textoNuevo.length > 100) {
      texto = textoNuevo;
      await escribirArchivo(rutas.texto, texto, 'utf8');
    } else if (!textoNuevo) {
      texto = 'No se pudo extraer el texto de esta pagina.';
    }
  }
  boton.innerHTML = texto ? '📖 Texto' : '📄 Bajar txt';
  cont.innerHTML = '<div class="texto-box">' + escapeHtml(texto || 'No hay texto.') + '</div>';
  boton.disabled = false;
}
