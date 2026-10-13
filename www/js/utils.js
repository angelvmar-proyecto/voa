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

function limpiar(s) {
  return (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function setEstado(tab, msg, tipo) {
  var el = document.getElementById('estado-' + tab);
  if (!el) return;
  el.className = 'estado ' + (tipo || '');
  el.innerHTML = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

var BASURA_LINEA = /^(accessibility links|skip to .+|languages|search|previous|next|menu|subscribe|embed|direct link|pop-out player|advertisement|share|share this|follow us|see comments|see all episodes|see all|forum|episodes|articles|about|breaking news|download lesson.*|your browser doesn.t support html5|no media source currently available|the code has been copied.*|the url has been copied.*|\d+\s*kbps.*|\d{1,2}:\d{2}.*|start the quiz.*|quiz - .*|related content|related|more from voa|most viewed|watch video|listen to.*|see tv programs|see radio programs|continue reading|load more|calendar|latest|tv programs|radio programs)$/i;

function esBasura(l) {
  if (!l || l.length < 3) return true;
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  if (BASURA_LINEA.test(l.trim())) return true;
  if (/^(var|let|const|function)\s/.test(l)) return true;
  if (/gtmEventObject|dataLayer|createElement/.test(l)) return true;
  return false;
}

function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript').forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('[itemprop="articleBody"]') ||
              doc.querySelector('.article-content') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('.wysiwyg') ||
              doc.querySelector('article') ||
              doc.querySelector('main');
    if (!art) return '';
    var nodos = art.querySelectorAll('p, h2, h3, h4, h5, blockquote, div:not([class]):not([id])');
    var lineas = [];
    var vistos = {};
    for (var i = 0; i < nodos.length; i++) {
      var t = (nodos[i].innerText || '').trim();
      if (!t) continue;
      if (esBasura(t)) continue;
      if (vistos[t]) continue;
      vistos[t] = 1;
      lineas.push(t);
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}

function extraerTextoDeHtml(html) {
  return extraerTexto(html);
}

function limpiarMarkdownJina(md, tituloArticulo) {
  if (!md) return '';

  var idx = md.indexOf('Markdown Content:');
  if (idx >= 0) md = md.slice(idx + 'Markdown Content:'.length);

  // Si tenemos el titulo, cortar desde su primera aparicion
  if (tituloArticulo) {
    var limpio = tituloArticulo.replace(/ - [A-Z][a-z]+ \d{1,2}, \d{4}$/, '').trim();
    var idxTitulo = md.indexOf(limpio);
    if (idxTitulo >= 0) {
      md = md.slice(idxTitulo + limpio.length);
    }
  }

  var lineas = md.split('\n');
  var salida = [];
  var vistos = {};

  for (var i = 0; i < lineas.length; i++) {
    var l = (lineas[i] || '').trim();
    if (!l) continue;

    // Saltar imagenes
    if (/^!\[/.test(l)) continue;
    // Saltar bullets que solo son enlaces
    if (/^[\*\-\+]\s+\[[^\]]+\]\([^)]+\)\s*$/.test(l)) continue;
    // Saltar lineas que son solo un enlace
    if (/^\[[^\]]+\]\([^)]+\)\s*$/.test(l)) continue;
    // Saltar encabezados de navegacion
    if (/^#{1,6}\s+(Follow Us|Subscribe|About|Articles|Episodes|Forum|Related|More|Share|Languages|Search|Previous|Next|Breaking News|Direct link|Embed|Advertisement|See .*|Skip to .+|TV Programs|Radio Programs|Load more|Calendar|Latest)\s*$/i.test(l)) continue;
    // Saltar fechas solas
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/.test(l)) continue;
    // Saltar duraciones
    if (/^\d{1,2}:\d{2}(\s+\d{1,2}:\d{2})*$/.test(l)) continue;
    // Saltar Previous/Next solos
    if (/^(Previous|Next)\s*$/.test(l)) continue;
    if (/^Apple Podcasts/.test(l)) continue;
    if (/^(Subscribe|See TV Programs|See Radio Programs)/i.test(l)) continue;

    // Quitar markdown
    l = l.replace(/^[#>\*\-\+\s]+/, '');
    l = l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    l = l.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    l = l.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').trim();

    if (!l || l.length < 3) continue;
    if (esBasura(l)) continue;
    if (/^[-=_\s\*]{3,}$/.test(l)) continue;
    if (vistos[l]) continue;
    vistos[l] = 1;

    salida.push(l);
  }

  var texto = salida.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

  var fin = texto.search(/\n+(See comments|Episodes|Forum|See all episodes|Previous|Next)\b/i);
  if (fin > 200) texto = texto.slice(0, fin).trim();

  return texto;
}
