// =================================================================
// DIAGNOSTICO: analiza la pagina de VOA y extrae pistas
// =================================================================

async function diagnosticarVOA() {
  var lista = document.getElementById('lista-lecciones');
  if (!lista) { alert('Ve a la pestaña Let\'s Learn primero'); return; }

  var items = await leerJSON('biblioteca_lecciones.json');
  if (!items || !items.length) {
    alert('Primero toca "Cargar lista de lecciones"');
    return;
  }

  // Probar las primeras 2 URLs para tener variedad
  var urls = [];
  for (var i = 0; i < items.length && urls.length < 2; i++) {
    if (items[i].pagina) urls.push(items[i].pagina);
  }
  if (!urls.length) { alert('No hay paginas para diagnosticar'); return; }

  var cont = document.getElementById('diag-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '60vh';
    lista.parentNode.insertBefore(cont, lista);
  }
  cont.textContent = '⏳ Analizando ' + urls.length + ' paginas...';

  var informe = [];

  for (var u = 0; u < urls.length; u++) {
    var url = urls[u];
    informe.push('========================================');
    informe.push('URL: ' + url);
    informe.push('========================================');

    var html;
    try {
      html = await bajar(url, true);
    } catch (e) {
      informe.push('ERROR al descargar: ' + e.message);
      continue;
    }

    informe.push('Longitud del HTML: ' + html.length + ' caracteres');
    informe.push('');

    // 1) Buscar el dialogo real
    var tieneAnna = html.indexOf('Pete: Hi!') >= 0 || html.indexOf('Are you Anna') >= 0;
    var tieneHi = html.indexOf('Nice to meet you') >= 0;
    informe.push('Contiene "Are you Anna": ' + tieneAnna);
    informe.push('Contiene "Nice to meet you": ' + tieneHi);
    informe.push('');

    // 2) Scripts externos
    informe.push('--- SCRIPTS ---');
    var scripts = html.match(/<script[^>]+src=["']([^"']+)["']/gi) || [];
    var sVistos = {};
    for (var s = 0; s < scripts.length && s < 40; s++) {
      var sm = scripts[s].match(/src=["']([^"']+)["']/i);
      if (sm && !sVistos[sm[1]]) {
        sVistos[sm[1]] = 1;
        informe.push('  ' + sm[1]);
      }
    }
    informe.push('');

    // 3) URLs con palabras clave API
    informe.push('--- URLs API / JSON ---');
    var urls2 = html.match(/https?:\/\/[^\s"'<>()]+/gi) || [];
    var uVistos = {};
    for (var uu = 0; uu < urls2.length; uu++) {
      var candidate = urls2[uu];
      if (/(api|json|graphql|content|article|data|feed)/i.test(candidate) && !uVistos[candidate]) {
        uVistos[candidate] = 1;
        informe.push('  ' + candidate);
        if (Object.keys(uVistos).length > 30) break;
      }
    }
    informe.push('');

    // 4) JSON-LD (contiene datos del articulo)
    informe.push('--- JSON-LD ---');
    var ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    var m2;
    var ldCount = 0;
    while ((m2 = ldRegex.exec(html)) && ldCount < 5) {
      var bloque = m2[1].trim();
      informe.push('  BLOQUE #' + (ldCount+1) + ' (' + bloque.length + ' chars):');
      informe.push('  ' + bloque.slice(0, 1500).replace(/\s+/g, ' '));
      informe.push('');
      ldCount++;
    }
    if (!ldCount) informe.push('  (ninguno)');
    informe.push('');

    // 5) Meta tags importantes
    informe.push('--- META TAGS ---');
    var metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']{0,200})["']/gi;
    var m3, metaCount = 0;
    while ((m3 = metaRegex.exec(html)) && metaCount < 40) {
      if (/article|content|og:|video|audio|lesson|description|title/i.test(m3[1])) {
        informe.push('  ' + m3[1] + ' = ' + m3[2]);
        metaCount++;
      }
    }
    informe.push('');

    // 6) Buscar contentId / articleId
    informe.push('--- IDs POSIBLES ---');
    var idRegex = /(contentId|content_id|articleId|article_id|postId|post_id|lessonId|lesson_id|storyId)["']?\s*[:=]\s*["']?(\d+)/gi;
    var m4, idCount = 0;
    var idVistos = {};
    while ((m4 = idRegex.exec(html)) && idCount < 20) {
      var clave = m4[1] + '=' + m4[2];
      if (!idVistos[clave]) {
        idVistos[clave] = 1;
        informe.push('  ' + clave);
        idCount++;
      }
    }
    informe.push('');

    // 7) data-* attributes sospechosos
    informe.push('--- data-* ATTRIBUTES ---');
    var dataRegex = /data-[a-z0-9-]*(?:id|content|article|lesson|video|audio|story)[a-z0-9-]*=["'][^"']{0,100}["']/gi;
    var m5, dataCount = 0;
    var dVistos = {};
    while ((m5 = dataRegex.exec(html)) && dataCount < 25) {
      var dkey = m5[0].slice(0, 40);
      if (!dVistos[dkey]) {
        dVistos[dkey] = 1;
        informe.push('  ' + m5[0]);
        dataCount++;
      }
    }
    informe.push('');

    // 8) Buscar donde aparece el titulo (para ver la estructura)
    informe.push('--- BUSCAR TITULO ---');
    var tituloFragmento = (items[u] && items[u].titulo || '').split(':')[0].trim().slice(0, 30);
    if (tituloFragmento) {
      var idxT = html.indexOf(tituloFragmento);
      if (idxT >= 0) {
        var inicio = Math.max(0, idxT - 200);
        var fin = Math.min(html.length, idxT + 400);
        informe.push('  Fragmento HTML alrededor del titulo:');
        informe.push('  ' + html.slice(inicio, fin).replace(/\s+/g, ' '));
      } else {
        informe.push('  Titulo no encontrado literalmente');
      }
    }
    informe.push('');
    informe.push('');
  }

  // Mostrar informe
  var texto = informe.join('\n');
  cont.textContent = texto;

  // Guardar en archivo
  try {
    var nombre = 'diag_voa.txt';
    await Filesystem.writeFile({
      path: nombre,
      data: texto,
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
    var uri = await Filesystem.getUri({ path: nombre, directory: Directory.External });
    alert('Informe guardado en:\n' + uri.uri.replace('file://','') +
          '\n\nTambien se muestra en la app.');
  } catch (e) {
    console.log('No se pudo guardar archivo:', e.message);
  }
}
