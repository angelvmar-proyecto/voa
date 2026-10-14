// =====================================================================
// MOTOR DE DESCARGAS - 100% dentro de la app
// Usa CapacitorHttp (ya disponible), sin Chromium, sin Termux
// =====================================================================

var DESCARGAS = {
  BASE: 'MiInglesVOA',           // subcarpeta dentro de Documents
  PROGRESO: 'progreso_descargas.json',
  FEEDS_CACHE: 'feeds_voa.json',
  pausa: false,
  cancelado: false,
  descargando: false,
  procesando: false
};

// =====================================================================
// UTILIDADES
// =====================================================================

function dlog(msg) {
  var t = new Date().toLocaleTimeString('es-MX');
  var linea = '[' + t + '] ' + msg;
  console.log(linea);
  var panel = document.getElementById('descarga-log');
  if (panel) {
    panel.textContent = linea + '\n' + panel.textContent;
    // Limitar a 200 lineas
    var lineas = panel.textContent.split('\n');
    if (lineas.length > 200) {
      panel.textContent = lineas.slice(0, 200).join('\n');
    }
  }
}

function slugify2(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70) || 'audio';
}

function decodificarEntidades2(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .trim();
}

function dormir(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

// =====================================================================
// ARCHIVOS
// =====================================================================

async function descargarArchivoTexto(rutaRel, contenido) {
  // Guardar un archivo de texto en Documents/MiInglesVOA/rutaRel
  var fs = getFilesystem();
  var ruta = DESCARGAS.BASE + '/' + rutaRel;
  // Crear carpeta padre si no existe
  var partes = ruta.split('/');
  partes.pop();
  var carpeta = partes.join('/');
  try {
    await fs.mkdir({ path: carpeta, directory: Directory.Documents, recursive: true });
  } catch (e) {}
  await fs.writeFile({
    path: ruta,
    data: contenido,
    directory: Directory.Documents,
    encoding: 'utf8'
  });
}

async function descargarArchivoBinario(url, rutaRel) {
  // Descargar MP3 y guardarlo en Documents/MiInglesVOA/rutaRel
  var fs = getFilesystem();
  var ruta = DESCARGAS.BASE + '/' + rutaRel;
  var partes = ruta.split('/');
  partes.pop();
  var carpeta = partes.join('/');
  try {
    await fs.mkdir({ path: carpeta, directory: Directory.Documents, recursive: true });
  } catch (e) {}
  
  // Descargar con CapacitorHttp como arraybuffer
  var base64 = await bajar(url, false);
  await fs.writeFile({
    path: ruta,
    data: base64,
    directory: Directory.Documents
  });
}

async function existeArchivoDocs(rutaRel) {
  var fs = getFilesystem();
  try {
    await fs.stat({
      path: DESCARGAS.BASE + '/' + rutaRel,
      directory: Directory.Documents,
      recursive: true
    });
    return true;
  } catch (e) { return false; }
}

async function leerJSONDocs(rutaRel) {
  var fs = getFilesystem();
  try {
    var r = await fs.readFile({
      path: DESCARGAS.BASE + '/' + rutaRel,
      directory: Directory.Documents,
      encoding: 'utf8'
    });
    return JSON.parse(r.data);
  } catch (e) { return null; }
}

async function guardarJSONDocs(rutaRel, datos) {
  await descargarArchivoTexto(rutaRel, JSON.stringify(datos, null, 2));
}

// =====================================================================
// EXTRAER DATOS DE UNA PAGINA DE VOA
// =====================================================================

function extraerDeHtml(html) {
  // Devuelve { texto, mp3_128, mp3_64 }
  var resultado = { texto: '', mp3_128: null, mp3_64: null };
  if (!html) return resultado;
  
  // 1) Extraer texto del .wsw con DOMParser
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var wsw = doc.querySelector('.wsw');
    if (wsw) {
      var t = wsw.innerText || '';
      var lineas = t.split('\n').map(function(l) { return l.trim(); })
        .filter(function(l) { return l.length > 3; });
      resultado.texto = lineas.join('\n\n');
    }
  } catch (e) { dlog('Error parseando HTML: ' + e.message); }
  
  // 2) Extraer MP3
  var mp3s = html.match(/https?:\/\/[^\s"'<>\\&]+\.mp3/g) || [];
  for (var i = 0; i < mp3s.length; i++) {
    var m = mp3s[i];
    if (m.indexOf('_hq') >= 0 && !resultado.mp3_128) resultado.mp3_128 = m;
    else if (m.indexOf('_hq') < 0 && !resultado.mp3_64) resultado.mp3_64 = m;
  }
  
  return resultado;
}

// =====================================================================
// PARSEAR FEEDS RSS
// =====================================================================

function parsearRSS(xml) {
  var items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  var episodios = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var t = it.match(/<title>([\s\S]*?)<\/title>/);
    var link = it.match(/<link>([\s\S]*?)<\/link>/);
    var pub = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (!t) continue;
    var titulo = decodificarEntidades2(t[1]);
    episodios.push({
      titulo: titulo,
      pagina: link ? link[1].trim() : null,
      fecha: pub ? pub[1].trim() : ''
    });
  }
  // Deduplicar por titulo (preferir slug)
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
// OBTENER LISTA DE PROGRAMAS DESDE /rssfeeds
// =====================================================================

async function obtenerProgramas() {
  // Cache
  var cache = await leerJSONDocs(DESCARGAS.FEEDS_CACHE);
  if (cache && cache.length > 5) {
    dlog('Usando lista de programas en cache (' + cache.length + ')');
    return cache;
  }
  
  dlog('Descargando lista de programas desde VOA...');
  try {
    var html = await bajar('https://learningenglish.voanews.com/rssfeeds', true);
    var matches = html.match(/\/api\/[^"'\s<>]+/g) || [];
    var feeds = {};
    for (var i = 0; i < matches.length; i++) {
      feeds[matches[i]] = true;
    }
    var feedsUnicos = Object.keys(feeds);
    dlog('Encontrados ' + feedsUnicos.length + ' feeds');
    
    // Programas conocidos que nos interesan
    var programasInteresan = {
      'ziqiqil-vomx-tpemumqm': 'lets_learn_1',
      'zt-pq_l-vomx-tpekyyqv': 'lets_learn_2',
      'zmypyl-vomx-tpeyry_': 'words_stories',
      'zmg_pl-vomx-tpeymtm': 'science_tech',
      'zoroqql-vomx-tpeptpqq': 'everyday_grammar',
      'zti_qvl-vomx-tpekgvqr': 'ask_teacher',
      'zyg__l-vomx-tpetmty': 'american_stories',
      'zj_pvl-vomx-tpebb_v': 'us_history',
      'zjypq_l-vomx-tpebryqy': 'america_presidents',
      'zpyp_l-vomx-tpe_rym': 'arts_culture',
      'zmmpql-vomx-tpey-_q': 'health_lifestyle',
      'zkm-ql-vomx-tpej-rqi': 'as_it_is'
    };
    
    var programas = [];
    for (var id in programasInteresan) {
      var feedUrl = 'https://learningenglish.voanews.com/api/' + id;
      if (feeds['/api/' + id]) {
        programas.push({
          id: programasInteresan[id],
          nombre: id.replace(/_/g, ' '),
          feed: feedUrl,
          activo: false
        });
      }
    }
    
    // Ajustar nombres legibles
    var nombresLegibles = {
      'lets_learn_1': "Let's Learn English - Level 1",
      'lets_learn_2': "Let's Learn English - Level 2",
      'words_stories': "Words & Their Stories",
      'science_tech': "Science & Technology",
      'everyday_grammar': "Everyday Grammar",
      'ask_teacher': "Ask a Teacher",
      'american_stories': "American Stories",
      'us_history': "U.S. History",
      'america_presidents': "America's Presidents",
      'arts_culture': "Arts & Culture",
      'health_lifestyle': "Health & Lifestyle",
      'as_it_is': "As It Is"
    };
    for (var k = 0; k < programas.length; k++) {
      if (nombresLegibles[programas[k].id]) {
        programas[k].nombre = nombresLegibles[programas[k].id];
      }
    }
    
    await guardarJSONDocs(DESCARGAS.FEEDS_CACHE, programas);
    return programas;
  } catch (e) {
    dlog('Error obteniendo programas: ' + e.message);
    return [];
  }
}

// =====================================================================
// DESCARGAR UN EPISODIO (audio + texto)
// =====================================================================

async function descargarEpisodio(progId, episodio, num, total, progreso) {
  var titulo = episodio.titulo;
  var slug = slugify2(titulo);
  var nombreBase = 'l' + String(num).padStart(4, '0') + '_' + slug;
  
  var rutaAudio = progId + '/audios/' + nombreBase + '.mp3';
  var rutaTexto = progId + '/textos/' + nombreBase + '.txt';
  var clave = progId + '/' + nombreBase;
  
  if (progreso[clave] && progreso[clave].completo) return true;
  
  dlog('  [' + num + '/' + total + '] ' + titulo.slice(0, 60));
  
  var estado = progreso[clave] || {};
  estado.titulo = titulo;
  estado.fecha = episodio.fecha;
  
  // Construir URL con el parametro magico
  var url = episodio.pagina;
  if (url && url.indexOf('?withmediaplayer=1') < 0) {
    url = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'withmediaplayer=1';
  }
  
  // Descargar HTML de la pagina
  var html = '';
  try {
    html = await bajar(url, true);
  } catch (e) {
    dlog('  Error HTML: ' + e.message);
  }
  
  var datos = extraerDeHtml(html);
  estado.mp3_url = datos.mp3_128 || datos.mp3_64;
  
  // Descargar MP3
  if (estado.mp3_url) {
    try {
      var existe = await existeArchivoDocs(rutaAudio);
      if (!existe) {
        await descargarArchivoBinario(estado.mp3_url, rutaAudio);
        estado.audio_completo = true;
      } else {
        estado.audio_completo = true;
      }
    } catch (e) {
      dlog('  Error MP3: ' + e.message);
      estado.audio_completo = false;
    }
  }
  
  // Guardar texto
  if (datos.texto && datos.texto.length > 200) {
    try {
      await descargarArchivoTexto(rutaTexto, datos.texto);
      estado.texto_completo = true;
      estado.chars_texto = datos.texto.length;
    } catch (e) {
      dlog('  Error texto: ' + e.message);
    }
  } else {
    estado.sin_texto = true;
  }
  
  estado.completo = estado.audio_completo || false;
  progreso[clave] = estado;
  
  return estado.completo;
}

// =====================================================================
// DESCARGAR UN PROGRAMA COMPLETO
// =====================================================================

async function descargarPrograma(prog, progreso) {
  dlog('');
  dlog('═══════════════════════════════════');
  dlog('PROGRAMA: ' + prog.nombre);
  dlog('═══════════════════════════════════');
  
  var xml;
  try {
    xml = await bajar(prog.feed, true);
  } catch (e) {
    dlog('Error feed: ' + e.message);
    return;
  }
  
  var episodios = parsearRSS(xml);
  dlog('Episodios en feed: ' + episodios.length);
  
  if (!episodios.length) return;
  
  var exitos = 0;
  for (var i = 0; i < episodios.length; i++) {
    if (DESCARGAS.cancelado) {
      dlog('  Cancelado por usuario');
      return;
    }
    while (DESCARGAS.pausa) {
      await dormir(1000);
      if (DESCARGAS.cancelado) return;
    }
    
    try {
      if (await descargarEpisodio(prog.id, episodios[i], i + 1, episodios.length, progreso)) {
        exitos++;
      }
    } catch (e) {
      dlog('  Error: ' + e.message);
    }
    
    // Guardar progreso cada episodio
    await guardarJSONDocs(DESCARGAS.PROGRESO, progreso);
    
    // Pausa cada 10
    if ((i + 1) % 10 === 0) {
      dlog('  --- Progreso guardado, pausa 2s ---');
      await dormir(2000);
    } else {
      await dormir(200);
    }
    
    actualizarPanelProgreso(progreso);
  }
  
  dlog('Programa terminado: ' + exitos + '/' + episodios.length);
}

// =====================================================================
// DESCARGAR TODO (varios programas)
// =====================================================================

async function descargarProgramas(idsProgramas) {
  if (DESCARGAS.procesando) {
    alert('Ya hay una descarga en curso');
    return;
  }
  
  DESCARGAS.procesando = true;
  DESCARGAS.cancelado = false;
  DESCARGAS.pausa = false;
  
  var programas = await obtenerProgramas();
  var progreso = (await leerJSONDocs(DESCARGAS.PROGRESO)) || {};
  
  var aDescargar = [];
  for (var i = 0; i < programas.length; i++) {
    if (idsProgramas.indexOf(programas[i].id) >= 0) {
      aDescargar.push(programas[i]);
    }
  }
  
  dlog('Iniciando descarga de ' + aDescargar.length + ' programas');
  
  actualizarBotonDescarga();
  
  for (var j = 0; j < aDescargar.length; j++) {
    if (DESCARGAS.cancelado) break;
    await descargarPrograma(aDescargar[j], progreso);
    await guardarJSONDocs(DESCARGAS.PROGRESO, progreso);
  }
  
  DESCARGAS.procesando = false;
  actualizarBotonDescarga();
  dlog('');
  dlog('═══════════════════════════════════');
  dlog('DESCARGA COMPLETADA');
  dlog('═══════════════════════════════════');
  actualizarPanelProgreso(progreso);
}

function pausarDescarga() {
  DESCARGAS.pausa = !DESCARGAS.pausa;
  dlog(DESCARGAS.pausa ? '⏸ Descarga pausada' : '▶ Descarga reanudada');
  actualizarBotonDescarga();
}

function cancelarDescarga() {
  if (!confirm('¿Cancelar la descarga? Podrás reanudarla después.')) return;
  DESCARGAS.cancelado = true;
  DESCARGAS.pausa = false;
  dlog('❌ Cancelando descarga...');
}

function actualizarBotonDescarga() {
  var btn = document.getElementById('btn-iniciar-descarga');
  var btnPausa = document.getElementById('btn-pausa-descarga');
  if (!btn) return;
  if (DESCARGAS.procesando) {
    btn.disabled = true;
    btn.textContent = '⏳ Descargando...';
    if (btnPausa) {
      btnPausa.style.display = 'inline-block';
      btnPausa.textContent = DESCARGAS.pausa ? '▶ Reanudar' : '⏸ Pausar';
    }
  } else {
    btn.disabled = false;
    btn.textContent = '📥 Iniciar descarga';
    if (btnPausa) btnPausa.style.display = 'none';
  }
}

// =====================================================================
// INTERFAZ: pestaña de descargas
// =====================================================================

async function cargarPanelDescargas() {
  var cont = document.getElementById('lista-programas');
  if (!cont) return;
  
  cont.innerHTML = '<div class="vacio">Cargando programas...</div>';
  var programas = await obtenerProgramas();
  
  if (!programas.length) {
    cont.innerHTML = '<div class="vacio">No se pudieron obtener los programas</div>';
    return;
  }
  
  cont.innerHTML = '';
  for (var i = 0; i < programas.length; i++) {
    var p = programas[i];
    var div = document.createElement('label');
    div.className = 'programa-item';
    div.innerHTML = 
      '<input type="checkbox" data-id="' + p.id + '"> ' +
      '<span>' + escapeHtml(p.nombre) + '</span>';
    cont.appendChild(div);
  }
  
  var progreso = (await leerJSONDocs(DESCARGAS.PROGRESO)) || {};
  actualizarPanelProgreso(progreso);
}

async function actualizarPanelProgreso(progreso) {
  var cont = document.getElementById('progreso-programas');
  if (!cont) return;
  
  var totales = {};
  for (var clave in progreso) {
    var progId = clave.split('/')[0];
    if (!totales[progId]) totales[progId] = { total: 0, texto: 0, audio: 0 };
    totales[progId].total++;
    if (progreso[clave].audio_completo) totales[progId].audio++;
    if (progreso[clave].texto_completo) totales[progId].texto++;
  }
  
  var html = '';
  for (var id in totales) {
    var t = totales[id];
    html += '<div class="prog-progreso">' +
      '<strong>' + escapeHtml(id) + '</strong>: ' +
      t.audio + ' audios, ' + t.texto + ' textos' +
      '</div>';
  }
  
  cont.innerHTML = html || '<div class="vacio">Sin descargas aún</div>';
}
