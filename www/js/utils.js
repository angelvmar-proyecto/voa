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
    var art = doc.querySelector('.wsw') || doc.querySelector('#article-content') ||
              doc.querySelector('.article-content') || doc.querySelector('article') ||
              doc.querySelector('main');
    var texto = art ? art.innerText : doc.body.innerText;
    texto = texto.replace(/\r/g, '').split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) {
        if (!l) return false;
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
        return true;
      }).join('\n');
    texto = texto.replace(/\n{3,}/g, '\n\n').trim();
    var cortes = [/\nRelated\s*\n/i, /\nFollow Us\s*\n/i, /\nAbout Learning English\s*\n/i];
    for (var i = 0; i < cortes.length; i++) {
      var m = texto.search(cortes[i]);
      if (m > 200) { texto = texto.slice(0, m).trim(); break; }
    }
    return texto;
  } catch (e) { return ''; }
}
