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

// Función de extracción definitiva, copiando el método de VOA
function extraerTexto(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Usamos el selector exacto de VOA para encontrar el contenido del artículo.
    // Se busca dentro de '#article-content' el contenedor 'div.wsw' y de ahí se toman los párrafos.
    var articulo = doc.querySelector('#article-content > div.wsw');

    // Fallback por si la estructura cambia ligeramente.
    if (!articulo) {
      articulo = doc.querySelector('div.wsw');
    }

    // Si no se encuentra ninguno de los dos, no hay nada que extraer.
    if (!articulo) {
      console.error('No se encontró el contenedor del artículo (.wsw)');
      return '';
    }

    // Recolectamos solo los párrafos <p> dentro del contenedor encontrado.
    var parrafos = articulo.querySelectorAll('p');
    var lineas = [];
    for (var i = 0; i < parrafos.length; i++) {
      var t = (parrafos[i].innerText || '').trim();
      // Filtro mínimo para evitar líneas vacías o botones de "Download".
      if (t && t.length > 3 && !/^Download Lesson/i.test(t)) {
        lineas.push(t);
      }
    }

    // Unimos los párrafos con doble salto de línea.
    return lineas.join('\n\n').trim();

  } catch (e) {
    console.error('Error en extraerTexto:', e);
    return '';
  }
}

// Mantenemos esta función para el texto que viene del RSS (que es HTML limpio).
function extraerTextoDeHtml(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var parrafos = doc.querySelectorAll('p');
    var lineas = [];
    for (var i = 0; i < parrafos.length; i++) {
      var t = (parrafos[i].innerText || '').trim();
      if (t && t.length > 3) {
        lineas.push(t);
      }
    }
    return lineas.join('\n\n').trim();
  } catch (e) { return ''; }
}
