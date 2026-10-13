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

// Basura en linea completa
var BASURA_MIN = /^(accessibility links|skip to .+|languages|search|previous|next|menu|subscribe|share|embed|direct link|pop-out player|advertisement|the code has been copied.*|the url has been copied.*|no media source currently available|download lesson.*|your browser doesn.t support html5|\d+\s*kbps.*|learn the alphabet|listening quiz|speaking practice|pronunciation( practice)?|quiz - .*|start the quiz.*|related|follow us|about learning english|video programs|audio programs|video|audio|more from voa|most viewed)$/i;

function esBasura(l) {
  if (!l || l.length < 3) return true;
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  if (BASURA_MIN.test(l.trim())) return true;
  if (/^(var|let|const|function|if|for|while|window\.|document\.|return)\b/.test(l)) return true;
  if (/gtmEventObject|dataLayer|renderGtm|createElement|getElementsByTagName/.test(l)) return true;
  return false;
}

function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. Quitar TODA la basura conocida (scripts, embeds, figuras, botones, etc)
    var eliminar = doc.querySelectorAll(
      'script, style, noscript, iframe, svg, button, ' +
      '.wsw__embed, figure, figcaption, ' +
      '[class*="share"], [class*="social"], [class*="related"], [class*="widget"], ' +
      '[class*="newsletter"], [class*="promo"], [class*="advert"], ' +
      '.quiz, .media-block, .media-image, .c-mmp, .c-sticky'
    );
    for (var k = 0; k < eliminar.length; k++) {
      if (eliminar[k].parentNode) eliminar[k].parentNode.removeChild(eliminar[k]);
    }

    // 2. Encontrar el contenedor del articulo
    var art = doc.querySelector('#article-content') ||
              doc.querySelector('.wsw') ||
              doc.querySelector('article') ||
              doc.querySelector('main') ||
              doc.body;
    if (!art) return '';

    // 3. Recorrer en ORDEN de aparicion
    var lineas = [];
    var vistos = {};
    var walker = doc.createTreeWalker(art, NodeFilter.SHOW_ELEMENT, null, false);
    var node = walker.currentNode;

    while (node) {
      if (node.nodeType === 1) {
        var tag = node.tagName;
        var clase = (node.className || '').toString().trim();
        var id = node.id || '';

        // Aceptar: <div> SIN clase y SIN id, <p> SIN clase, <h2>/<h3> con clase wsw__h2/h3
        var aceptar = false;
        if (tag === 'DIV' && !clase && !id) aceptar = true;
        if (tag === 'P' && !clase) aceptar = true;
        if ((tag === 'H2' || tag === 'H3') && /wsw__h2|wsw__h3/.test(clase)) aceptar = true;

        if (aceptar) {
          // Saltar si contiene otros nodos aceptables (para no duplicar)
          var tieneHijos = node.querySelector('p:not([class]), div:not([class]):not([id])');
          if (!tieneHijos) {
            var t = (node.innerText || '').trim();
            if (t && t.length >= 3 && !esBasura(t) && !vistos[t]) {
              vistos[t] = 1;
              lineas.push(t);
            }
          }
        }
      }
      node = walker.nextNode();
    }

    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) {
    console.error('Error extraerTexto:', e);
    return '';
  }
}

function extraerTextoDeHtml(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var basura = doc.querySelectorAll('script, style, noscript, iframe, svg');
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }
    var nodos = doc.querySelectorAll('p, h2, h3, h4, li, blockquote, div:not([class]):not([id])');
    var lineas = [];
    var vistos = {};
    for (var i = 0; i < nodos.length; i++) {
      var t = (nodos[i].innerText || '').trim();
      if (t && t.length >= 3 && !esBasura(t) && !vistos[t]) {
        vistos[t] = 1;
        lineas.push(t);
      }
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
