function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'audio';
}

function formatearFecha(s) {
  if (!s) return '';
  try {
    var d = new Date(s);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) { return ''; }
}

function decodificarEntidades(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&apos;/g, "'").replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&#0?34;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
    .replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/')
    .trim();
}

function setEstado(tab, msg, tipo) {
  var el = document.getElementById('estado-' + tab);
  if (!el) return;
  el.className = 'estado ' + (tipo || '');
  el.innerHTML = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

function limpiarMarkdown(md) {
  if (!md) return '';
  // Cortar el encabezado de jina
  var idx = md.indexOf('Markdown Content:');
  if (idx >= 0) md = md.slice(idx + 'Markdown Content:'.length);

  // Eliminar imagenes, enlaces, enfasis
  md = md.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  md = md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  md = md.replace(/\*\*/g, '').replace(/__/g, '');
  md = md.replace(/`/g, '');
  md = md.replace(/^_([^_]+)_$/gm, '$1');
  md = md.replace(/^\*([^\*]+)\*$/gm, '$1');
  md = md.replace(/^#{1,6}\s+/gm, '');
  md = md.replace(/^\s*[\*\-\+]\s+/gm, '');

  // Limpiar lineas
  var lineas = md.split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) {
      if (!l || l.length < 3) return false;
      if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return false;
      // Navegacion
      if (/^(Skip to|Languages|Search|Previous|Next|Menu|Subscribe|Share|Embed|Direct link|Pop-out player|Advertisement|See comments|See all|See TV|See Radio|Follow Us|About Us|Contact Us|Terms of Use|Accessibility|Load more|Latest|Breaking News|Forum|Episodes|Articles|About|Calendar)$/i.test(l)) return false;
      // Basura de VOA
      if (/^(Download Lesson|Your browser doesn|Speaking Practice|Pronunciation|Conversation|Learn the alphabet|Listening Quiz|Quiz - |Start the Quiz|Video|Audio|Video Programs|Audio Programs|Apple Podcasts)$/i.test(l)) return false;
      // Duraciones
      if (/^\d{1,2}:\d{2}/.test(l)) return false;
      if (/^\d+\s*kbps/i.test(l)) return false;
      // Fechas solas
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/.test(l)) return false;
      // Separadores
      if (/^[-=_\s\*]{3,}$/.test(l)) return false;
      return true;
    });

  // Cortar desde "See comments" o "Episodes" si quedaron
  var texto = lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  var fin = texto.search(/\n+(See comments|Episodes|Forum)\b/i);
  if (fin > 300) texto = texto.slice(0, fin).trim();

  return texto;
}

// =====================================================================
// EXTRACCION UNICA DE TEXTO DE VOA
// Devuelve { texto, mp3_128, mp3_64 } desde un HTML crudo
// =====================================================================

function extraerDeHtml(html) {
  var resultado = { texto: '', mp3_128: null, mp3_64: null };
  if (!html) return resultado;

  // 1) Extraer MP3s del HTML crudo (antes de limpiar)
  var mp3s = html.match(/https?:\/\/[^\s"'<>\\&]+\.mp3/g) || [];
  for (var i = 0; i < mp3s.length; i++) {
    var m = mp3s[i];
    if (m.indexOf('_hq') >= 0 && !resultado.mp3_128) resultado.mp3_128 = m;
    else if (m.indexOf('_hq') < 0 && !resultado.mp3_64) resultado.mp3_64 = m;
  }

  // 2) Extraer texto del .wsw
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var wsw = doc.querySelector('.wsw');
    if (!wsw) return resultado;

    // Obtener texto plano
    var t = wsw.innerText || '';

    // Limpiar linea por linea
    var lineas = t.split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) {
        if (!l || l.length < 3) return false;
        if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return false;

        // --- FILTROS DE BASURA DE VOA ---
        // Navegacion y compartir
        if (/^(Embed|share|Share|Copy link|Facebook|Twitter|Telegram|WhatsApp|Email|Forum|Previous|Next|Menu|Search|Languages|Breaking News)$/i.test(l)) return false;
        // "The code has been copied..."
        if (/^The code has been copied/i.test(l)) return false;
        if (/^The URL has been copied/i.test(l)) return false;
        // Aviso de reproductor
        if (/^No media source currently available$/i.test(l)) return false;
        // Duraciones (0:00, 0:04:26)
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(l)) return false;
        // "Direct link", "128 kbps | MP3", "64 kbps | MP3", "Pop-out player"
        if (/^Direct link$/i.test(l)) return false;
        if (/^\d+\s*kbps\s*\|\s*MP3$/i.test(l)) return false;
        if (/^Pop-out player$/i.test(l)) return false;
        // Genericos de VOA
        if (/^(Audio \d+|Video|Audio)$/i.test(l)) return false;
        // Fechas solas
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/.test(l)) return false;
        // "See all episodes", etc
        if (/^See (all|TV|Radio)/i.test(l)) return false;
        // "VOA - Voice of America English News"
        if (/^VOA - Voice of America English News$/i.test(l)) return false;

        return true;
      });

    resultado.texto = lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

    // Cortar desde "Words in This Story" si aparece al final para quedarse solo con el texto
    // En realidad queremos mantenerlo, es util (vocabulario)

  } catch (e) {
    console.log('Error parseando HTML:', e.message);
  }

  return resultado;
}

// =====================================================================
// LEIDO / NO LEIDO
// =====================================================================

// Detecta si una URL tendra texto (las URLs con slug normalmente si)
function tieneSlug(url) {
  if (!url) return false;
  return /\/a\/[a-z0-9-]+\//.test(url);
}

// Carga la lista de leidos de una pestana
async function cargarLeidos(tab) {
  try {
    var r = await getFilesystem().readFile({
      path: 'leidos_' + tab + '.json',
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
    return JSON.parse(r.data);
  } catch (e) {
    return [];
  }
}

// Guarda la lista de leidos de una pestana
async function guardarLeidos(tab, leidos) {
  try {
    await getFilesystem().writeFile({
      path: 'leidos_' + tab + '.json',
      data: JSON.stringify(leidos),
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {
    console.error('Error guardando leidos:', e);
  }
}

// Marca o desmarca un episodio como leido
async function toggleLeido(tab, titulo) {
  var leidos = await cargarLeidos(tab);
  var idx = leidos.indexOf(titulo);
  if (idx >= 0) {
    leidos.splice(idx, 1);  // quitar
  } else {
    leidos.push(titulo);    // agregar
  }
  await guardarLeidos(tab, leidos);
  return leidos.indexOf(titulo) >= 0;
}

// Filtro global por pestana: 'todos' | 'no_leidos' | 'leidos'
var FILTROS = {};

function getFiltro(tab) {
  return FILTROS[tab] || 'todos';
}

function setFiltro(tab, valor) {
  FILTROS[tab] = valor;
}
