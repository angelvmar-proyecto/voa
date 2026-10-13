async function buscarAPI() {
  var items = await leerJSON('biblioteca_entrevistas.json');
  if (!items || !items.length) { alert('Carga lista de Entrevistas'); return; }

  var cont = document.getElementById('diag-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '70vh';
    document.getElementById('lista-entrevistas').parentNode.insertBefore(cont, document.getElementById('lista-entrevistas'));
  }
  cont.textContent = '⏳ Probando endpoints... (puede tardar 1 min)';

  // Tomamos el primer articulo
  var url = items[0].pagina;
  var m = url.match(/\/a\/([^\/]+)\.html/);
  var slug = m ? m[1] : '';
  var idMatch = slug.match(/(\d+)$/);
  var id = idMatch ? idMatch[1] : '';

  var informe = [];
  informe.push('URL del articulo: ' + url);
  informe.push('Slug: ' + slug);
  informe.push('ID numerico: ' + id);
  informe.push('');

  // Primero: descargar la pagina normal y extraer variables JS
  informe.push('=== PASO 1: Extraer pistas del HTML ===');
  var html = '';
  try {
    html = await bajar(url, true);
  } catch (e) {
    informe.push('Error descargando HTML: ' + e.message);
  }

  if (html) {
    // Buscar canonicalPath
    var cp = html.match(/"canonicalPath"\s*:\s*"([^"]+)"/);
    informe.push('canonicalPath: ' + (cp ? cp[1] : 'no encontrado'));

    // Buscar uid
    var uid = html.match(/"uid"\s*:\s*"([^"]+)"/);
    informe.push('uid: ' + (uid ? uid[1] : 'no encontrado'));

    // Buscar domain
    var dom = html.match(/"domain"\s*:\s*"([^"]+)"/);
    informe.push('domain: ' + (dom ? dom[1] : 'no encontrado'));

    // Buscar cualquier url con .json o /api/
    var apis = html.match(/["'](\/[a-z0-9_\-\/]*api[a-z0-9_\-\/]*|https?:\/\/[^"']*api[^"']*)["']/gi) || [];
    var apiUniq = {};
    for (var a = 0; a < apis.length; a++) {
      var limpio = apis[a].replace(/["']/g, '');
      if (limpio.length < 150 && !apiUniq[limpio]) {
        apiUniq[limpio] = 1;
      }
    }
    var keys = Object.keys(apiUniq);
    if (keys.length) {
      informe.push('URLs con "api" en el HTML:');
      for (var k = 0; k < Math.min(keys.length, 10); k++) {
        informe.push('  ' + keys[k]);
      }
    }

    // Buscar strings que parezcan endpoints internos
    var internal = html.match(/["'](\/[a-z0-9_\-]+\/[a-z0-9_\-]+\/[a-z0-9_\-]+)["']/gi) || [];
    var intUniq = {};
    for (var i2 = 0; i2 < internal.length; i2++) {
      var l2 = internal[i2].replace(/["']/g, '');
      if (/(content|article|story|npr|api|data|json|feed|v1|v2)/i.test(l2) && !intUniq[l2]) {
        intUniq[l2] = 1;
      }
    }
    var keys2 = Object.keys(intUniq);
    if (keys2.length) {
      informe.push('Rutas internas sospechosas:');
      for (var k2 = 0; k2 < Math.min(keys2.length, 15); k2++) {
        informe.push('  ' + keys2[k2]);
      }
    }
  }
  informe.push('');

  // PASO 2: Probar URLs candidatas automaticamente
  informe.push('=== PASO 2: Probando endpoints automaticamente ===');

  var base = 'https://learningenglish.voanews.com';
  var candidatos = [
    // Variantes de .json en la URL
    base + '/a/' + slug + '.json',
    base + '/a/' + slug,
    // API tipica de NPR Core Publisher
    base + '/api/v1/articles/' + id,
    base + '/api/v1/content/' + id,
    base + '/api/content/' + id,
    base + '/api/article/' + id,
    // Pangea (sistema interno de VOA)
    'https://api.voanews.com/content/' + id,
    'https://api.voanews.com/articles/' + id,
    'https://api.voanews.com/v1/articles/' + id,
    // Con slug
    base + '/api/v1/articles/' + slug,
    base + '/api/content/' + slug,
    // Otra convencion
    base + '/a/' + id + '.json',
    base + '/content/' + id + '.json',
    base + '/_api/articles/' + id,
    base + '/data/' + id + '.json'
  ];

  var encontrado = null;

  for (var c = 0; c < candidatos.length; c++) {
    var u = candidatos[c];
    informe.push('');
    informe.push('→ ' + u);
    try {
      var res = await bajar(u, true);
      var primeros = (res || '').slice(0, 100);
      var pareceJson = /^\s*[\{\[]/.test(primeros);
      informe.push('  Tamaño: ' + (res ? res.length : 0) + ' | JSON: ' + pareceJson);

      if (pareceJson && res.length > 200) {
        informe.push('  ✅ ¡JSON ENCONTRADO!');
        informe.push('  Primeros 800 chars:');
        informe.push('  ' + res.slice(0, 800));
        if (!encontrado) encontrado = { url: u, data: res };
        // No seguir probando, ya tenemos uno
        break;
      }
    } catch (e) {
      informe.push('  Error: ' + e.message.slice(0, 80));
    }
  }

  if (!encontrado) {
    informe.push('');
    informe.push('❌ Ninguna URL devolvio JSON. VOA no expone API publica directamente.');
  } else {
    informe.push('');
    informe.push('🎉 ENCONTRADA: ' + encontrado.url);
  }

  var texto = informe.join('\n');
  cont.textContent = texto;

  try {
    await Filesystem.writeFile({
      path: 'buscar_api.txt',
      data: texto,
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}
}
