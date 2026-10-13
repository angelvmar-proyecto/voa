var PAGINA_INDICE_LECCIONES = 'https://learningenglish.voanews.com/p/5644.html';
var FEED_ENTREVISTAS = 'https://learningenglish.voanews.com/podcast/?zoneId=1579';

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

    // Texto del articulo incluido en el RSS
    var contenido = '';
    var m1 = it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
    if (m1) contenido = m1[1];
    else {
      var m2 = it.match(/<description>([\s\S]*?)<\/description>/);
      if (m2) contenido = m2[1];
    }
    contenido = limpiar(contenido);

    if (!t || !mp3) return null;
    return {
      titulo: limpiar(t[1]),
      mp3: limpiar(mp3[1].replace(/\\\//g, '/')),
      pagina: link ? limpiar(link[1]) : null,
      fecha: pub ? limpiar(pub[1]) : '',
      texto_incluido: contenido
    };
  }).filter(Boolean);
}

async function actualizarBiblioteca(tab) {
  var boton = document.querySelector('#contenido-' + tab + ' .barra button');
  if (boton) { boton.disabled = true; }
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
      var sep = FEED_ENTREVISTAS.indexOf('?') >= 0 ? '&' : '?';
      var url = FEED_ENTREVISTAS + sep + '_=' + Date.now();
      var xml = await bajar(url, true);
      items = parsearRSS(xml);
      if (!items.length) throw new Error('El feed no contiene episodios');
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

async function borrarBiblioteca(tab) {
  if (!confirm('¿Borrar la biblioteca de ' + tab + '?')) return;
  try {
    await Filesystem.deleteFile({
      path: 'biblioteca_' + tab + '.json', directory: Directory.External
    });
  } catch (e) {}
  setEstado(tab, '');
  var lista = document.getElementById('lista-' + tab);
  if (lista) lista.innerHTML = '<div class="vacio">Biblioteca borrada.</div>';
}

function rutasPara(tab, titulo) {
  var slug = slugify(titulo);
  return {
    audio: CARPETA_AUDIOS + tab + '_' + slug + '.mp3',
    texto: CARPETA_TEXTOS + tab + '_' + slug + '.txt'
  };
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
    var mp3Url = it.mp3;
    if (!mp3Url && it.pagina) {
      boton.innerHTML = '<span class="spinner"></span> Buscando audio...';
      var htmlLeccion = await bajar(it.pagina, true);
      var mp3Match = htmlLeccion.match(/<audio[^>]+src=["']([^"']+\.mp3[^"']*)["']/i) ||
                     htmlLeccion.match(/<source[^>]+src=["']([^"']+\.mp3[^"']*)["']/i) ||
                     htmlLeccion.match(/href=["']([^"']+\.mp3[^"']*)["']/i) ||
                     htmlLeccion.match(/(https?:\/\/[^\s"'<>\\]+\.mp3)/i);
      if (!mp3Match) throw new Error('No se encontró MP3');
      mp3Url = mp3Match[1].replace(/\\\//g, '/');
    }

    var base64 = await bajar(mp3Url, false);
    await escribirArchivo(rutas.audio, base64);

    // Texto: primero intentar con el que viene en el RSS
    var textoFinal = '';
    if (it.texto_incluido && it.texto_incluido.length > 50) {
      boton.innerHTML = '<span class="spinner"></span> Texto...';
      textoFinal = extraerTextoDeHtml(it.texto_incluido);
    }
    // Si no hay texto en el RSS, scrapear la pagina
    if (!textoFinal && it.pagina) {
      try {
        boton.innerHTML = '<span class="spinner"></span> Texto...';
        var html = await bajar(it.pagina, true);
        textoFinal = extraerTexto(html);
      } catch (errTxt) { console.log('Sin texto:', errTxt.message); }
    }
    if (textoFinal && textoFinal.length > 50) {
      await escribirArchivo(rutas.texto, textoFinal, 'utf8');
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
      var r = await Filesystem.readFile({
        path: rutas.audio, directory: Directory.External, recursive: true
      });
      src = 'data:audio/mpeg;base64,' + r.data;
    } else {
      src = it.mp3;
      if (!src && it.pagina) {
        throw new Error('Descarga el audio primero');
      }
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

  if (!texto && it.texto_incluido && it.texto_incluido.length > 50) {
    texto = extraerTextoDeHtml(it.texto_incluido);
    if (texto && texto.length > 50) {
      await escribirArchivo(rutas.texto, texto, 'utf8');
      boton.innerHTML = '📖 Texto';
    }
  }
  if (!texto && it.pagina) {
    boton.innerHTML = '<span class="spinner"></span> Bajando...';
    try {
      var htmlT = await bajar(it.pagina, true);
      texto = extraerTexto(htmlT);
      if (texto && texto.length > 50) {
        await escribirArchivo(rutas.texto, texto, 'utf8');
        boton.innerHTML = '📖 Texto';
      }
    } catch (err) { texto = 'Error: ' + err.message; }
  }

  if (texto) cont.innerHTML = '<div class="texto-box">' + escapeHtml(texto) + '</div>';
  else cont.innerHTML = '<div class="texto-box">No hay texto.</div>';
  boton.disabled = false;
}


async function borrarTextos(tab) {
  if (!confirm('¿Borrar TODOS los textos de ' + tab + ' para volver a generarlos?')) return;
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) { alert('No hay nada que borrar.'); return; }
  var borrados = 0, errores = 0;
  for (var i = 0; i < items.length; i++) {
    var rutas = rutasPara(tab, items[i].titulo);
    try {
      await Filesystem.deleteFile({ path: rutas.texto, directory: Directory.External });
      borrados++;
    } catch (e) { errores++; }
  }
  await cargarVista(tab);
  alert('Textos borrados: ' + borrados + (errores ? ' (no existian: ' + errores + ')' : ''));
  setEstado(tab, '✅ ' + borrados + ' textos borrados. Toca "📄 Bajar txt" para regenerarlos.', 'ok');
}

async function borrarAudios(tab) {
  if (!confirm('¿Borrar TODOS los audios de ' + tab + '?')) return;
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) { alert('No hay nada que borrar.'); return; }
  var borrados = 0;
  for (var i = 0; i < items.length; i++) {
    var rutas = rutasPara(tab, items[i].titulo);
    try {
      await Filesystem.deleteFile({ path: rutas.audio, directory: Directory.External });
      borrados++;
    } catch (e) {}
  }
  await cargarVista(tab);
  alert('Audios borrados: ' + borrados);
}
