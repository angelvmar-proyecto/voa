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

// Lista negra compartida
function esBasura(l) {
  if (!l) return true;
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  // Codigo JS / CSS
  if (/^(var|let|const|function|if|for|while|window\.|document\.|return)\b/.test(l)) return true;
  if (/gtmEventObject|dataLayer|renderGtm|createElement|getElementsByTagName/.test(l)) return true;
  if (/[{};]\s*$/.test(l) && /[=\[\]()]/.test(l)) return true;
  if (/^\/\*|\*\/$/.test(l)) return true;
  // Navegacion web VOA
  if (/^Accessibility links$/i.test(l)) return true;
  if (/^Skip to /i.test(l)) return true;
  if (/^Languages$/i.test(l)) return true;
  if (/^Search$/i.test(l)) return true;
  if (/^Previous$/i.test(l)) return true;
  if (/^Next$/i.test(l)) return true;
  if (/^Subscribe$/i.test(l)) return true;
  if (/^Articles$/i.test(l)) return true;
  if (/^Episodes$/i.test(l)) return true;
  if (/^About$/i.test(l)) return true;
  if (/^Menu$/i.test(l)) return true;
  if (/^Podcasts?$/i.test(l)) return true;
  if (/^Breaking News$/i.test(l)) return true;
  if (/^Science & Technology$/i.test(l)) return true;
  // Reproductor / share
  if (/^\d+\s*kbps/i.test(l)) return true;
  if (/^Pop-out player$/i.test(l)) return true;
  if (/^Embed$/i.test(l)) return true;
  if (/^Direct link$/i.test(l)) return true;
  if (/^The code has been copied/i.test(l)) return true;
  if (/^The URL has been copied/i.test(l)) return true;
  if (/^No media source currently/i.test(l)) return true;
  if (/^Share$/i.test(l)) return true;
  // VOA
  if (/^Download Lesson/i.test(l)) return true;
  if (/^Your browser doesn/i.test(l)) return true;
  if (/^Quiz - Lesson/i.test(l)) return true;
  if (/^\d{1,2}:\d{2}/.test(l)) return true;
  if (/^Speaking Practice$/i.test(l)) return true;
  if (/^Pronunciation( Practice)?$/i.test(l)) return true;
  if (/^Conversation$/i.test(l)) return true;
  if (/^Learn the alphabet$/i.test(l)) return true;
  if (/^Listening Quiz$/i.test(l)) return true;
  if (/^Video$/i.test(l)) return true;
  if (/^Audio$/i.test(l)) return true;
  if (/^Follow Us$/i.test(l)) return true;
  if (/^Related$/i.test(l)) return true;
  if (/^About Learning English$/i.test(l)) return true;
  if (/^Advertisement$/i.test(l)) return true;
  return false;
}

function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var basura = doc.querySelectorAll(
      'script, style, noscript, svg, iframe, ' +
      'nav, header, footer, aside, ' +
      '.nav, .menu, .sidebar, .comments, .related, .share, .social, ' +
      '.newsletter, .ad, .ads, .advert, [class*="banner"], [class*="promo"]'
    );
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('.article-content') ||
              doc.querySelector('.wysiwyg') ||
              doc.querySelector('article') ||
              doc.querySelector('main') ||
              doc.querySelector('[itemprop="articleBody"]');
    var texto = art ? art.innerText : (doc.body ? doc.body.innerText : '');
    texto = texto.replace(/\r/g, '').split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) { return !esBasura(l); })
      .join('\n');
    texto = texto.replace(/\n{3,}/g, '\n\n').trim();
    var cortes = [/\nRelated\s*\n/i, /\nFollow Us\s*\n/i, /\nAbout Learning English\s*\n/i];
    for (var i = 0; i < cortes.length; i++) {
      var m = texto.search(cortes[i]);
      if (m > 200) { texto = texto.slice(0, m).trim(); break; }
    }
    return texto;
  } catch (e) { return ''; }
}

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
      .filter(function(l) { return !esBasura(l); })
      .join('\n');
    return texto.replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
