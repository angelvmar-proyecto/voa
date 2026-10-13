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

function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) Eliminar TODOS los nodos basura antes de leer texto
    var basura = doc.querySelectorAll(
      'script, style, noscript, svg, iframe, ' +
      'nav, header, footer, aside, ' +
      '.nav, .menu, .sidebar, .comments, .comment, ' +
      '.related, .share, .social, .newsletter, .ad, .ads, .advert, ' +
      '[class*="banner"], [class*="promo"], [class*="widget"]'
    );
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }

    // 2) Buscar el contenedor del artículo
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('.article-content') ||
              doc.querySelector('.wysiwyg') ||
              doc.querySelector('article') ||
              doc.querySelector('main') ||
              doc.querySelector('[itemprop="articleBody"]');

    var texto = art ? art.innerText : (doc.body ? doc.body.innerText : '');

    // 3) Limpieza línea por línea
    texto = texto.replace(/\r/g, '').split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) {
        if (!l) return false;
        // Líneas de código JS / CSS detectables
        if (/^(var|let|const|function|if|for|while|window\.|document\.|return)\b/.test(l)) return false;
        if (/[{};]\s*$/.test(l) && /[=\[\]()]/.test(l)) return false;
        if (/gtmEventObject|dataLayer|renderGtm|createElement|getElementsByTagName/.test(l)) return false;
        if (/^\/\*|\*\/$/.test(l)) return false;
        // Basura común de la web
        if (/^Download Lesson/i.test(l)) return false;
        if (/^Your browser doesn/i.test(l)) return false;
        if (/^Quiz - Lesson/i.test(l)) return false;
        if (/^\d{1,2}:\d{2}/.test(l)) return false;
        if (/^Speaking Practice$/i.test(l)) return false;
        if (/^Pronunciation( Practice)?$/i.test(l)) return false;
        if (/^Conversation$/i.test(l)) return false;
        if (/^Learn the alphabet$/i.test(l)) return false;
        if (/^Listening Quiz$/i.test(l)) return false;
        if (/^Video$/i.test(l)) return false;
        if (/^Audio$/i.test(l)) return false;
        if (/^Follow Us$/i.test(l)) return false;
        if (/^Related$/i.test(l)) return false;
        if (/^About Learning English$/i.test(l)) return false;
        if (/^Share$/i.test(l)) return false;
        if (/^Advertisement$/i.test(l)) return false;
        // Líneas sin letras (solo símbolos)
        if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(l)) return false;
        return true;
      }).join('\n');

    texto = texto.replace(/\n{3,}/g, '\n\n').trim();

    // 4) Cortar en marcadores de fin
    var cortes = [/\nRelated\s*\n/i, /\nFollow Us\s*\n/i, /\nAbout Learning English\s*\n/i];
    for (var i = 0; i < cortes.length; i++) {
      var m = texto.search(cortes[i]);
      if (m > 200) { texto = texto.slice(0, m).trim(); break; }
    }

    return texto;
  } catch (e) { return ''; }
}


// Extrae texto limpio de un fragmento HTML (usado para el texto del RSS)
function extraerTextoDeHtml(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var basura = doc.querySelectorAll('script, style, noscript, svg, iframe');
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }
    var texto = doc.body ? doc.body.innerText : '';
    texto = texto.replace(/\r/g, '').split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) {
        if (!l) return false;
        if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return false;
        if (/^Download Lesson/i.test(l)) return false;
        if (/^Your browser doesn/i.test(l)) return false;
        if (/^Advertisement$/i.test(l)) return false;
        if (/^Share$/i.test(l)) return false;
        if (/^Follow Us$/i.test(l)) return false;
        return true;
      }).join('\n');
    return texto.replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
