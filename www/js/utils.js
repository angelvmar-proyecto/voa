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

// === EXTRACTOR AMP: el que funcionaba la primera vez ===
function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Quitar scripts y estilos
    doc.querySelectorAll('script, style, noscript').forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    // Buscar el contenedor del articulo
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('article') ||
              doc.querySelector('main');

    if (!art) return '';

    // Extraer texto plano
    var texto = art.innerText || '';

    // Limpieza linea por linea
    texto = texto.replace(/\r/g, '').split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) {
        if (!l) return false;
        if (l.length < 3) return false;
        if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return false;
        if (/^Download Lesson/i.test(l)) return false;
        if (/^Your browser doesn/i.test(l)) return false;
        if (/^\d+\s*kbps/i.test(l)) return false;
        if (/^Pop-out player$/i.test(l)) return false;
        if (/^Direct link$/i.test(l)) return false;
        if (/^Embed$/i.test(l)) return false;
        if (/^No media source currently available$/i.test(l)) return false;
        if (/^The code has been copied/i.test(l)) return false;
        if (/^The URL has been copied/i.test(l)) return false;
        if (/^Accessibility links$/i.test(l)) return false;
        if (/^Skip to /i.test(l)) return false;
        if (/^Learn the alphabet$/i.test(l)) return false;
        if (/^Listening Quiz$/i.test(l)) return false;
        if (/^Speaking Practice$/i.test(l)) return false;
        if (/^Pronunciation( Practice)?$/i.test(l)) return false;
        if (/^Conversation$/i.test(l)) return false;
        if (/^Speaking Practice/i.test(l)) return false;
        if (/^Pronunciation Practice/i.test(l)) return false;
        if (/^Let.s Learn English/i.test(l)) return false;
        if (/^Lesson d+s*[-–:]s*/i.test(l)) return false;
        if (/^Start the Quiz/i.test(l)) return false;
        if (/^Quiz - /i.test(l)) return false;
        if (/^Advertisement$/i.test(l)) return false;
        return true;
      })
      .join('\n');

    texto = texto.replace(/\n{3,}/g, '\n\n').trim();

    // Cortar desde "Related" en adelante
    var cortes = [/\nRelated\s*\n/i, /\nFollow Us\s*\n/i, /\nAbout Learning English\s*\n/i];
    for (var i = 0; i < cortes.length; i++) {
      var m = texto.search(cortes[i]);
      if (m > 100) { texto = texto.slice(0, m).trim(); break; }
    }

    return texto;
  } catch (e) { return ''; }
}

function extraerTextoDeHtml(html) {
  return extraerTexto(html);
}
