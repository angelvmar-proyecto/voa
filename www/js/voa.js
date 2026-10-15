// =====================================================================
// VOA - Todos los programas
// Usa HTTP simple + ?withmediaplayer=1
// =====================================================================

var PAGINA_INDICE_LECCIONES = 'https://learningenglish.voanews.com/p/5644.html';

// Lista de programas con sus feeds
var PROGRAMAS = [
  { id: 'lecciones',           nombre: "📚 Let's Learn",       tipo: 'indice', url: PAGINA_INDICE_LECCIONES },
  { id: 'words',               nombre: "📖 Words & Stories",   tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zmypyl-vomx-tpeyry_' },
  { id: 'science',             nombre: "🔬 Science & Tech",    tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm' },
  { id: 'grammar',             nombre: "📝 Everyday Grammar",  tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zoroqql-vomx-tpeptpqq' },
  { id: 'teacher',             nombre: "🎯 Ask a Teacher",     tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zti_qvl-vomx-tpekgvqr' },
  { id: 'american_stories',    nombre: "📚 American Stories",  tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zyg__l-vomx-tpetmty' },
  { id: 'us_history',          nombre: "🇺🇸 U.S. History",     tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zj_pvl-vomx-tpebb_v' },
  { id: 'presidents',          nombre: "🏛️ America's Presidents", tipo: 'feed', url: 'https://learningenglish.voanews.com/api/zjypq_l-vomx-tpebryqy' },
  { id: 'arts',                nombre: "🎨 Arts & Culture",    tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym' },
  { id: 'health',              nombre: "💚 Health & Lifestyle", tipo: 'feed',  url: 'https://learningenglish.voanews.com/api/zmmpql-vomx-tpey-_q' },
  { id: 'as_it_is',            nombre: "🌍 As It Is",          tipo: 'feed',   url: 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi' }
];

// Busca la config de un programa por id
function getPrograma(tab) {
  for (var i = 0; i < PROGRAMAS.length; i++) {
    if (PROGRAMAS[i].id === tab) return PROGRAMAS[i];
  }
  return null;
}

// =====================================================================
// PARSEO
// =====================================================================

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
  // Deduplicar por titulo (preferir URLs con slug)
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

// =====================================================================
// HELPERS
// =====================================================================

function urlConMediaplayer(url) {
  if (!url) return url;
  if (url.indexOf('?withmediaplayer=1') >= 0) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'withmediaplayer=1';
}

function slugArchivo(titulo) {
  if (!titulo) return 'audio';
  return titulo
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'audio';
}

function rutasPara(tab, titulo) {
  var slug = slugArchivo(titulo);
  return {
    audio: CARPETA_AUDIOS + tab + '/' + slug + '.mp3',
    texto: CARPETA_TEXTOS + tab + '/' + slug + '.txt'
  };
}

// =====================================================================
// BIBLIOTECA (cargar lista de episodios)
// =====================================================================

async function actualizarBiblioteca(tab) {
  var prog = getPrograma(tab);
  if (!prog) { alert('Programa desconocido: ' + tab); return; }
  
  var boton = document.querySelector('#contenido-' + tab + ' .barra button');
  if (boton) boton.disabled = true;
  var textoOriginal = boton ? boton.innerHTML : '';
  if (boton) boton.innerHTML = '<span class="spinner"></span> Cargando...';
  setEstado(tab, '📡 Descargando lista...');

  try {
    var items;
    if (prog.tipo === 'indice') {
      var html = await bajar(prog.url, true);
      items = extraerLeccionesDeIndice(html);
      if (!items.length) throw new Error('No se encontraron lecciones');
    } else {
      var sep = prog.url.indexOf('?') >= 0 ? '&' : '?';
      var url = prog.url + sep + '_=' + Date.now();
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

// =====================================================================
// DESCARGAR
// =====================================================================

async function descargarVOA(tab, i, boton) {
  var items = await leerJSON('biblioteca_' + tab + '.json');
  var it = items[i];
  var rutas = rutasPara(tab, it.titulo);
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner"></span> Bajando...';

  try {
    var url = urlConMediaplayer(it.pagina);
    var html = await bajar(url, true);
    var datos = extraerDeHtml(html);
    var mp3Url = datos.mp3_128 || datos.mp3_64;

    if (!mp3Url) throw new Error('No se encontró MP3');

    boton.innerHTML = '<span class="spinner"></span> Audio...';
    var base64 = await bajar(mp3Url, false);
    await escribirArchivo(rutas.audio, base64);

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
    alert('Error: ' + err.message);
  }
}

// =====================================================================
// REPRODUCIR
// =====================================================================

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

// =====================================================================
// TEXTO
// =====================================================================

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
    try {
      var url = urlConMediaplayer(it.pagina);
      var html = await bajar(url, true);
      var datos = extraerDeHtml(html);
      if (datos.texto && datos.texto.length > 200) {
        texto = datos.texto;
        await escribirArchivo(rutas.texto, texto, 'utf8');
      }
    } catch (err) { console.error(err); }
  }
  boton.innerHTML = texto ? '📖 Texto' : '📄 Bajar txt';
  cont.innerHTML = '<div class="texto-box">' + escapeHtml(texto || 'No hay texto disponible.') + '</div>';
  boton.disabled = false;
}

// =====================================================================
// BORRAR TEXTOS
// =====================================================================

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

// =====================================================================
// VISTA (renderizar lista)
// =====================================================================

async function cargarVista(tab) {
  var lista = document.getElementById('lista-' + tab);
  if (!lista) return;
  
  var items = await leerJSON('biblioteca_' + tab + '.json');
  if (!items || !items.length) {
    lista.innerHTML = '<div class="vacio">Sin elementos. Toca el botón de arriba.</div>';
    return;
  }
  
  // Cargar leidos y filtro
  var leidos = await cargarLeidos(tab);
  var filtro = getFiltro(tab);
  
  // Aplicar filtro
  var itemsFiltrados = items.filter(function(it, idx) {
    var esLeido = leidos.indexOf(it.titulo) >= 0;
    if (filtro === 'no_leidos') return !esLeido;
    if (filtro === 'leidos') return esLeido;
    return true;
  });
  
  // Contadores
  var totalLeidos = 0;
  for (var k = 0; k < items.length; k++) {
    if (leidos.indexOf(items[k].titulo) >= 0) totalLeidos++;
  }
  var noLeidos = items.length - totalLeidos;
  
  // Armar HTML
  var html = '';
  
  // Filtros
  html += '<div class="filtros">';
  html += '<button class="filtro ' + (filtro === 'todos' ? 'activo' : '') + '" onclick="cambiarFiltro(\'' + tab + '\', \'todos\')">Todos (' + items.length + ')</button>';
  html += '<button class="filtro ' + (filtro === 'no_leidos' ? 'activo' : '') + '" onclick="cambiarFiltro(\'' + tab + '\', \'no_leidos\')">No leídos (' + noLeidos + ')</button>';
  html += '<button class="filtro ' + (filtro === 'leidos' ? 'activo' : '') + '" onclick="cambiarFiltro(\'' + tab + '\', \'leidos\')">Leídos (' + totalLeidos + ')</button>';
  html += '</div>';
  
  if (!itemsFiltrados.length) {
    html += '<div class="vacio">No hay episodios en este filtro.</div>';
    lista.innerHTML = html;
    return;
  }
  
  // Iterar episodios filtrados
  for (var j = 0; j < itemsFiltrados.length; j++) {
    var it = itemsFiltrados[j];
    var iOrig = items.indexOf(it);
    var rutas = rutasPara(tab, it.titulo);
    var guardado = await existeArchivo(rutas.audio);
    var tieneTextoGuardado = await existeArchivo(rutas.texto);
    var esLeido = leidos.indexOf(it.titulo) >= 0;
    var tieneT = tieneSlug(it.pagina);
    
    // Boton de texto
    var botonTexto;
    if (tieneTextoGuardado) {
      botonTexto = '<button class="texto" data-tab="' + tab + '" data-i="' + iOrig + '">📖 Texto</button>';
    } else if (tieneT) {
      botonTexto = '<button class="texto" data-tab="' + tab + '" data-i="' + iOrig + '">📄 Bajar txt</button>';
    } else {
      botonTexto = '<button class="texto sin-texto" disabled title="VOA no publicó transcripción">📄 Sin texto</button>';
    }
    
    // Aviso de sin texto
    var avisoSinTexto = '';
    if (!tieneT && !tieneTextoGuardado) {
      avisoSinTexto = '<div class="aviso-sin-texto">VOA no publicó transcripción para este episodio</div>';
    }
    
    html += '<div class="item ' + (esLeido ? 'item-leido' : '') + '">';
    html += '<h3>' + escapeHtml(it.titulo) + '</h3>';
    html += '<div class="meta">' + (it.fecha ? formatearFecha(it.fecha) : '') + '</div>';
    html += '<div class="acciones">';
    html += '<button class="desc ' + (guardado ? 'guardado' : '') + '" data-tab="' + tab + '" data-i="' + iOrig + '">' + (guardado ? '✅ Guardado' : '⬇️ Descargar') + '</button>';
    html += '<button class="play" data-tab="' + tab + '" data-i="' + iOrig + '">▶️ Audio</button>';
    html += botonTexto;
    html += '</div>';
    html += '<div class="acciones">';
    html += '<button class="leido ' + (esLeido ? 'es-leido' : '') + '" data-tab="' + tab + '" data-i="' + iOrig + '" data-titulo="' + escapeHtml(it.titulo) + '">' + (esLeido ? '✅ Leído' : '⬜ Marcar leído') + '</button>';
    html += '</div>';
    html += avisoSinTexto;
    html += '<div id="rep_' + tab + '_' + iOrig + '"></div>';
    html += '<div id="txt_' + tab + '_' + iOrig + '"></div>';
    html += '</div>';
  }
  
  lista.innerHTML = html;
}

// Cambia el filtro activo y recarga la vista
function cambiarFiltro(tab, valor) {
  setFiltro(tab, valor);
  cargarVista(tab);
}
