// =====================================================================
// VOA - Let's Learn y Words & Stories
// Usa HTTP simple + ?withmediaplayer=1
// Sin Jina, sin WebView, sin Chromium
// =====================================================================

var PAGINA_INDICE_LECCIONES = 'https://learningenglish.voanews.com/p/5644.html';
var FEED_WORDS = 'https://learningenglish.voanews.com/api/zmypyl-vomx-tpeyry_';

// Extrae las 52 lecciones de la pagina indice de Let's Learn
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
    lecciones.push({ titulo: texto, pagina: href, fecha: '', numero: num });
  }
  lecciones.sort(function(a, b) { return a.numero - b.numero; });
  return lecciones;
}

// Parsea un feed RSS y devuelve la lista de episodios
function parsearRSS(xml) {
  var items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  var episodios = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var t = it.match(/<title>([\s\S]*?)<\/title>/);
    var link = it.match(/<link>([\s\S]*?)<\/link>/);
    var pub = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (!t) continue;
    episodios.push({
      titulo: decodificarEntidades(t[1]),
      pagina: link ? decodificarEntidades(link[1]) : null,
      fecha: pub ? decodificarEntidades(pub[1]) : ''
    });
  }
  // Deduplicar por titulo
  var vistos = {};
  var unicos = [];
  for (var j = 0; j < episodios.length; j++) {
    var e = episodios[j];
    var key = e.titulo.toLowerCase();
    var tieneSlug = e.pagina && /\/a\/[a-z0-9-]+\//.test(e.pagina);
    if (!vistos[key]) {
      vistos[key] = e;
      e._slug = tieneSlug;
    } else if (tieneSlug && !vistos[key]._slug) {
      vistos[key] = e;
      e._slug = true;
    }
  }
  for (var k in vistos) {
    delete vistos[k]._slug;
    unicos.push(vistos[k]);
  }
  return unicos;
}

// Agrega el parametro magico a la URL
function urlConMediaplayer(url) {
  if (!url) return url;
  if (url.indexOf('?withmediaplayer=1') >= 0) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'withmediaplayer=1';
}

// Carga la lista de episodios de una pestaña (lecciones o words)
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

// Genera el slug del archivo (nombre legible sin caracteres prohibidos)
function slugArchivo(titulo) {
  if (!titulo) return 'audio';
  return titulo
    .replace(/[\/\\:*?"<>|]/g, '')   // quitar caracteres prohibidos en nombres de archivo
    .replace(/\s+/g, ' ')            // espacios multiples a uno
    .trim()
    .slice(0, 100) || 'audio';
}

// Calcula las rutas de audio y texto para una pestaña + titulo
function rutasPara(tab, titulo) {
  var slug = slugArchivo(titulo);
  return {
    audio: CARPETA_AUDIOS + tab + '/' + slug + '.mp3',
    texto: CARPETA_TEXTOS + tab + '/' + slug + '.txt'
  };
}

// Descarga audio + texto de un episodio
async function descargarVOA(tab, i, boton) {
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner"></span> Bajando...';

  try {
    // 1) Traer HTML con el parametro magico
    var url = urlConMediaplayer(it.pagina);
    var html = await bajar(url, true);

    // 2) Extraer datos (texto + mp3) usando la funcion de utils
    var datos = extraerDeHtml(html);
    var mp3Url = datos.mp3_128 || datos.mp3_64;

    if (!mp3Url) throw new Error('No se encontró MP3 en la página');

    // 3) Descargar MP3
    boton.innerHTML = '<span class="spinner"></span> Audio...';
    var base64 = await bajar(mp3Url, false);
    await escribirArchivo(rutas.audio, base64);

    // 4) Guardar texto si existe
    if (datos.texto && datos.texto.length > 200) {
      boton.innerHTML = '<span class="spinner"></span> Texto...';
      await escribirArchivo(rutas.texto, datos.texto, 'utf8');
    }

    boton.classList.add('guardado');
    boton.innerHTML = '✅ Guardado';
    boton.disabled = false;
    await cargarVista(tab);
  } catch (err) {
    boton.innerHTML = '❌ Reintentar';
    boton.disabled = false;
    console.error('Error descargando:', err);
    alert('Error: ' + err.message);
  }
}

// Muestra u oculta el reproductor de audio
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
      throw new Error('Descarga el audio primero');
    }
    cont.innerHTML = '<audio controls autoplay src="' + src + '"></audio>';
    boton.innerHTML = '⏸️ Ocultar';
  } catch (err) {
    boton.innerHTML = '▶️ Audio';
    alert('Error: ' + err.message);
  }
  boton.disabled = false;
}

// Muestra u oculta el texto del episodio
async function mostrarTextoVOA(tab, i, boton) {
  var cont = document.getElementById('txt_' + tab + '_' + i);
  if (cont.innerHTML) { cont.innerHTML = ''; return; }

  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);

  boton.disabled = true;
  var texto = await leerTexto(rutas.texto);

  // Si no hay texto guardado, intentar extraerlo ahora
  if (!texto && it.pagina) {
    boton.innerHTML = '<span class="spinner"></span> Extrayendo...';
    try {
      var url = urlConMediaplayer(it.pagina);
      var html = await bajar(url, true);
      var datos = extraerDeHtml(html);
      if (datos.texto && datos.texto.length > 200) {
        texto = datos.texto;
        await escribirArchivo(rutas.texto, texto, 'utf8');
      }
    } catch (err) {
      console.error('Error texto:', err);
    }
  }

  boton.innerHTML = texto ? '📖 Texto' : '📄 Bajar txt';
  cont.innerHTML = '<div class="texto-box">' + escapeHtml(texto || 'No hay texto disponible para este episodio.') + '</div>';
  boton.disabled = false;
}

// Borra todos los textos de una pestaña
async function borrarTextos(tab) {
  if (!confirm('¿Borrar TODOS los textos de esta pestaña?')) return;
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) { alert('No hay nada.'); return; }
  var n = 0;
  for (var i = 0; i < items.length; i++) {
    var rutas = rutasPara(tab, items[i].titulo);
    try {
      await getFilesystem().deleteFile({
        path: rutas.texto, directory: Directory.External, recursive: true
      });
      n++;
    } catch (e) {}
  }
  await cargarVista(tab);
  setEstado(tab, '✅ ' + n + ' textos borrados.', 'ok');
}

// Renderiza la lista de episodios en pantalla
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
