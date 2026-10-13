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

// Etiquetas y clases que SIEMPRE son basura
var SELECTORES_BASURA = [
  // Código / estilos
  'script', 'style', 'noscript', 'svg', 'iframe',
  // Estructura de página
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  // Widgets de VOA
  'figure', 'figcaption',
  '.wsw__embed', '.wsw__audio', '.wsw__video',
  '[class*="media-player"]', '[class*="audio-player"]', '[class*="video-player"]',
  '[class*="podcast"]', '[class*="widget"]', '[class*="embed"]',
  // Social / compartir
  '[class*="share"]', '[class*="social"]', '[class*="follow"]',
  // Publicidad
  '.ad', '.ads', '.advert', '.advertisement',
  '[class*="banner"]', '[class*="promo"]', '[class*="sponsor"]',
  // Navegación secundaria
  '.sidebar', '.menu', '.nav', '.breadcrumb',
  '[class*="related"]', '[class*="recommended"]', '[class*="trending"]',
  '[class*="newsletter"]', '[class*="subscribe"]',
  '.comments', '.comment'
].join(', ');

// Frases que NUNCA son contenido del artículo
var BASURA_EXACTA = /^(accessibility links|skip to .+|languages|search|previous|next|menu|home|about|articles|episodes|subscribe|podcasts?|share|embed|direct link|pop-out player|pop-out|advertisement|download lesson.*|your browser doesn.t support html5|the code has been copied.*|the url has been copied.*|no media source currently available|related|follow us|about learning english|speaking practice|pronunciation( practice)?|conversation|learn the alphabet|listening quiz|video|audio|video programs|audio programs|find us on satellite tv|sign up for our newsletter|our policy about comments|request our content|terms of use.*|contact us|breaking news|science & technology|american history|arts & culture|as it is|ask a teacher|education tips|everyday grammar( tv)?|health & lifestyle|science & technology|u\.s\. history|words & their stories|let.s learn english.*|everyday grammar tv|english in a minute|english @ the movies|news literacy|news words|how to pronounce|america.s national parks|america.s presidents|american stories|voa learning english podcast)$/i;

var BASURA_PATRON = [
  /^\d+\s*kbps/i,
  /^share this/i,
  /^read more/i,
  /^see more/i,
  /^most viewed/i,
  /^most popular/i,
  /^trending/i,
  /^photo gallery/i,
  /^watch video/i,
  /^listen to/i,
  /^caption/i,
  /^image (credit|source)/i,
  /^\(photo/i,
  /^ap\s*$/i,
  /^reuters\s*$/i,
  /^\d+\s*comments?$/i,
  /^\[.+\]$/,
  // Código JS
  /^(var|let|const|function|if|for|while|window\.|document\.|return)\b/,
  /gtmEventObject|dataLayer|renderGtm|createElement|getElementsByTagName/,
  /^\/\*|\*\/$/,
  // Enlaces residuales
  /^(click here|here|learn more|more info)$/i
];

function esBasura(l) {
  if (!l) return true;
  if (l.length < 3) return true;
  // Solo símbolos
  if (!/[A-Za-z\u00c0-\u017f]/.test(l)) return true;
  // Frase exacta conocida
  if (BASURA_EXACTA.test(l)) return true;
  // Patrón
  for (var i = 0; i < BASURA_PATRON.length; i++) {
    if (BASURA_PATRON[i].test(l)) return true;
  }
  // Línea corta que es un nombre de sección en Title Case
  if (l.length < 40 && /^[A-Z][a-z]+(\s+[A-Z&][a-z]+){1,4}$/.test(l)) return true;
  // Línea que es solo un título sin verbo (heurística)
  if (l.length < 50 && /^(L|Le|Les|The|A|An)\s/.test(l) && l.split(' ').length < 5) return true;
  return false;
}

// Extrae el texto SOLO de párrafos y encabezados del artículo
function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. Eliminar toda la basura estructural
    var basura = doc.querySelectorAll(SELECTORES_BASURA);
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }

    // 2. Encontrar el contenedor del artículo
    var art = doc.querySelector('.wsw') ||
              doc.querySelector('[itemprop="articleBody"]') ||
              doc.querySelector('#article-content') ||
              doc.querySelector('.article-content') ||
              doc.querySelector('.wysiwyg') ||
              doc.querySelector('article') ||
              doc.querySelector('main');

    if (!art) return '';

    // 3. Extraer SOLO de párrafos y encabezados (no divs, no spans)
    var parrafos = art.querySelectorAll('p, h2, h3, h4, h5, blockquote, li');
    var lineas = [];
    for (var i = 0; i < parrafos.length; i++) {
      var t = (parrafos[i].innerText || '').trim();
      if (!t) continue;
      if (esBasura(t)) continue;
      // Saltar párrafos que solo tienen enlaces sin texto
      if (/^<a\s/i.test(parrafos[i].innerHTML) && t.length < 30) continue;
      lineas.push(t);
    }

    var texto = lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

    // 4. Cortar todo lo que venga después de marcadores finales
    var fin = texto.search(/\n+(Related content|Related|Follow Us|About Learning English|More From VOA|Most Viewed)\b/i);
    if (fin > 200) texto = texto.slice(0, fin).trim();

    return texto;
  } catch (e) { return ''; }
}

function extraerTextoDeHtml(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var basura = doc.querySelectorAll(SELECTORES_BASURA);
    for (var k = 0; k < basura.length; k++) {
      if (basura[k].parentNode) basura[k].parentNode.removeChild(basura[k]);
    }
    var parrafos = doc.querySelectorAll('p, h2, h3, h4, li, blockquote');
    var lineas = [];
    for (var i = 0; i < parrafos.length; i++) {
      var t = (parrafos[i].innerText || '').trim();
      if (t && !esBasura(t)) lineas.push(t);
    }
    return lineas.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return ''; }
}
