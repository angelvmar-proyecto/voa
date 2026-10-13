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

var BASURA_MIN = /^(accessibility links|skip to .+|languages|search|previous|next|menu|subscribe|share|embed|direct link|pop-out player|advertisement|the code has been copied.*|the url has been copied.*|no media source currently available|download lesson.*|your browser doesn.t support html5|\d+\s*kbps.*)$/i;

function esBasuraMin(l) {
  if (!l || l.length < 2) return true;
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  if (BASURA_MIN.test(l)) return true;
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
    var nodos = art.querySelectorAll('p, h2, h3, h4, h5, blockquote');
    var lineas = [];
    for (var i = 0; i < nodos.length; i++) {
      var t = (nodos[i].innerText || '').trim();
      if (!t) continue;
      if (esBasuraMin(t)) continue;
      lineas.push(t);
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}

function extraerTextoDeHtml(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript').forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    var nodos = doc.querySelectorAll('p, h2, h3, h4, blockquote');
    var lineas = [];
    for (var i = 0; i < nodos.length; i++) {
      var t = (nodos[i].innerText || '').trim();
      if (!t) continue;
      if (esBasuraMin(t)) continue;
      lineas.push(t);
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
