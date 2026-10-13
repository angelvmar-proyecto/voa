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

// ---------- Filtro de basura ----------
var BASURA_LINEA = /^(accessibility links|skip to .+|languages|search|previous|next|menu|subscribe|embed|direct link|pop-out player|advertisement|share|share this|follow us|see comments|see all episodes|see all|forum|episodes|articles|about|breaking news|download lesson.*|your browser doesn.t support html5|no media source currently available|the code has been copied.*|the url has been copied.*|\d+\s*kbps.*|\d{1,2}:\d{2}.*|start the quiz.*|quiz - .*|related content|related|more from voa|most viewed|watch video|listen to.*|see tv programs|see radio programs|continue reading)$/i;

function esBasura(l) {
  if (!l || l.length < 3) return true;
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  if (BASURA_LINEA.test(l.trim())) return true;
  if (/^(var|let|const|function)\s/.test(l)) return true;
  if (/gtmEventObject|dataLayer|createElement/.test(l)) return true;
  return false;
}

// ---------- Extraer texto del HTML (AMP) ----------
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

// ---------- Limpiar Markdown de r.jina.ai ----------
function limpiarMarkdownJina(md) {
  if (!md) return '';

  // Cortar desde "Markdown Content:" (el cuerpo empieza ahí)
  var idx = md.indexOf('Markdown Content:');
  if (idx >= 0) md = md.slice(idx + 'Markdown Content:'.length);

  var lineas = md.split('\n');
  var salida = [];
  var vistos = {};

  for (var i = 0; i < lineas.length; i++) {
    var l = (lineas[i] || '').trim();
    if (!l) continue;

    // Saltar imágenes
    if (/^!\[/.test(l)) continue;

    // Saltar bullets que solo son un enlace
    if (/^[\*\-\+]\s+\[[^\]]+\]\([^)]+\)\s*$/.test(l)) continue;

    // Saltar encabezados de sección basura
    if (/^#{1,6}\s+(Follow Us|Subscribe|About|Articles|Episodes|Forum|Related|More|Share|Languages|Search|Previous|Next|Breaking News|Direct link|Embed|Advertisement|See .*|Skip to .+)\s*$/i.test(l)) continue;

    // Quitar markdown de encabezados/listas
    l = l.replace(/^[#>\*\-\+\s]+/, '');

    // Convertir [texto](url) → texto
    l = l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Quitar imágenes inline
    l = l.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

    // Quitar énfasis markdown
    l = l.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').trim();

    // Saltar líneas vacías o demasiado cortas
    if (!l || l.length < 3) continue;

    // Saltar basura conocida
    if (esBasura(l)) continue;

    // Saltar líneas que son solo un separador
    if (/^[-=_\s\*]{3,}$/.test(l)) continue;

    // Evitar duplicados consecutivos
    if (vistos[l]) continue;
    vistos[l] = 1;

    salida.push(l);
  }

  var texto = salida.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

  // Cortar desde "See comments" o "Episodes" en adelante si quedaron
  var fin = texto.search(/\n+(See comments|Episodes|Forum|See all episodes)\b/i);
  if (fin > 200) texto = texto.slice(0, fin).trim();

  return texto;
}
