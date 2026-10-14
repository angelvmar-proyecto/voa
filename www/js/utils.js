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
