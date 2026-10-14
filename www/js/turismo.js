var CARPETA_TURISMO = 'Turismo';
window._turismoItems = [];

async function cargarTurismo() {
  try {
    await Filesystem.mkdir({ path: CARPETA_TURISMO, directory: Directory.External, recursive: true });
  } catch (e) {}

  try {
    var uri = await Filesystem.getUri({ path: CARPETA_TURISMO, directory: Directory.External });
    var ruta = uri.uri.replace('file://', '');
    document.getElementById('ruta-turismo').innerHTML =
      '📁 Suelta tus MP3 y TXT en:<br>' + escapeHtml(ruta);
  } catch (e) {
    document.getElementById('ruta-turismo').textContent = 'Carpeta: ' + CARPETA_TURISMO;
  }

  var lista = document.getElementById('lista-turismo');
  lista.innerHTML = '<div class="vacio">Escaneando...</div>';
  setEstado('turismo', '');

  try {
    var result = await Filesystem.readdir({ path: CARPETA_TURISMO, directory: Directory.External });
    var archivos = result.files || [];
    var mapa = {};
    archivos.forEach(function(f) {
      var nombre = f.name;
      var base = nombre.replace(/\.[^.]+$/, '');
      var ext = (nombre.split('.').pop() || '').toLowerCase();
      if (!mapa[base]) mapa[base] = { base: base };
      if (ext === 'mp3') mapa[base].audio = nombre;
      if (ext === 'txt') mapa[base].texto = nombre;
    });

    var items = [];
    for (var base in mapa) {
      var info = mapa[base];
      if (!info.audio) continue;
      var titulo = base.replace(/_/g, ' ');
      if (info.texto) {
        try {
          var r = await Filesystem.readFile({
            path: CARPETA_TURISMO + '/' + info.texto,
            directory: Directory.External, encoding: 'utf8', recursive: true
          });
          var primera = r.data.split('\n')[0].trim().replace(/^#+\s*/, '');
          if (primera && primera.length < 100) titulo = primera;
        } catch (e) {}
      }
      items.push({ base: base, titulo: titulo, audio: info.audio, texto: info.texto || null });
    }
    items.sort(function(a, b) { return a.titulo.localeCompare(b.titulo); });

    if (!items.length) {
      lista.innerHTML = '<div class="vacio">No hay audios.<br><br>Suelta MP3 + TXT y escanea de nuevo.</div>';
      return;
    }
    setEstado('turismo', '✅ ' + items.length + ' audios encontrados', 'ok');
    window._turismoItems = items;
    renderTurismo(items);
  } catch (e) {
    setEstado('turismo', '❌ Error: ' + e.message, 'err');
    lista.innerHTML = '<div class="vacio">No se pudo leer la carpeta.</div>';
  }
}

function renderTurismo(items) {
  var lista = document.getElementById('lista-turismo');
  lista.innerHTML = '';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var div = document.createElement('div');
    div.className = 'item';
    div.innerHTML =
      '<h3>' + escapeHtml(it.titulo) + '</h3>' +
      '<div class="meta">' + escapeHtml(it.base) + (it.texto ? ' · con texto' : ' · solo audio') + '</div>' +
      '<div class="acciones">' +
        '<button class="play-local" data-i="' + i + '">▶️ Reproducir</button>' +
        (it.texto ? '<button class="texto-local" data-i="' + i + '">📖 Texto</button>' : '') +
      '</div>' +
      '<div id="repLocal_' + i + '"></div>' +
      '<div id="txtLocal_' + i + '"></div>';
    lista.appendChild(div);
  }
}

async function reproducirLocal(i, boton) {
  var it = window._turismoItems[i];
  var cont = document.getElementById('repLocal_' + i);
  if (cont.innerHTML) { cont.innerHTML = ''; boton.innerHTML = '▶️ Reproducir'; return; }
  boton.disabled = true;
  try {
    var uri = await Filesystem.getUri({
      path: CARPETA_TURISMO + '/' + it.audio, directory: Directory.External
    });
    var src = window.Capacitor && window.Capacitor.convertFileSrc
      ? window.Capacitor.convertFileSrc(uri.uri) : uri.uri;
    cont.innerHTML = '<audio controls autoplay src="' + src + '"></audio>';
    boton.innerHTML = '⏸️ Ocultar';
  } catch (err) {
    boton.innerHTML = '▶️ Reproducir';
    alert('Error: ' + err.message);
  }
  boton.disabled = false;
}

async function mostrarTextoLocal(i, boton) {
  var it = window._turismoItems[i];
  var cont = document.getElementById('txtLocal_' + i);
  if (cont.innerHTML) { cont.innerHTML = ''; return; }
  boton.disabled = true;
  try {
    var r = await Filesystem.readFile({
      path: CARPETA_TURISMO + '/' + it.texto,
      directory: Directory.External, encoding: 'utf8', recursive: true
    });
    cont.innerHTML = '<div class="texto-box">' + escapeHtml(r.data) + '</div>';
  } catch (err) {
    cont.innerHTML = '<div class="texto-box">Error: ' + escapeHtml(err.message) + '</div>';
  }
  boton.disabled = false;
}
