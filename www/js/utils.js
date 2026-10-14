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

// Extrae texto del HTML de una pagina AMP de VOA
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
              doc.querySelector('article') ||
              doc.querySelector('main');
    if (!art) return '';
    var nodos = art.querySelectorAll('p, h2, h3, h4, h5, blockquote, div:not([class]):not([id])');
    var lineas = [];
    var vistos = {};
    for (var i = 0; i < nodos.length; i++) {
      var t = (nodos[i].innerText || '').trim();
      if (!t || t.length < 3) continue;
      if (!/[A-Za-z\u00c0-\u017f]/.test(t)) continue;
      if (/^(Download Lesson|Your browser doesn|Speaking Practice|Pronunciation|Conversation|Learn the alphabet|Listening Quiz|Video|Audio)$/i.test(t)) continue;
      if (vistos[t]) continue;
      vistos[t] = 1;
      lineas.push(t);
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
