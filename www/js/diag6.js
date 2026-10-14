async function verItemGuardado() {
  var items = await leerJSON('biblioteca_words.json');
  if (!items || !items.length) { alert('No hay items'); return; }

  // Buscar el de Grass Grow
  var encontrado = null;
  for (var i = 0; i < items.length; i++) {
    if (/grass grow/i.test(items[i].titulo)) { encontrado = items[i]; break; }
  }
  if (!encontrado) { encontrado = items[0]; }

  var cont = document.getElementById('diag-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '60vh';
    document.getElementById('lista-words').parentNode.insertBefore(cont, document.getElementById('lista-words'));
  }

  var info = [];
  info.push('ITEM GUARDADO EN biblioteca_words.json:');
  info.push('');
  info.push('titulo: ' + encontrado.titulo);
  info.push('fecha: ' + encontrado.fecha);
  info.push('mp3: ' + encontrado.mp3);
  info.push('pagina: ' + encontrado.pagina);
  info.push('');

  // Ahora probar la extraccion en vivo
  info.push('=== Probando extraccion ===');
  if (encontrado.pagina) {
    var aAmpUrl = encontrado.pagina.replace('learningenglish.voanews.com/a/', 'learningenglish.voanews.com/amp/');
    info.push('AMP URL: ' + aAmpUrl);

    try {
      var htmlAmp = await bajar(aAmpUrl, true);
      info.push('  AMP: ' + htmlAmp.length + ' chars');
      var textoAmp = extraerTexto(htmlAmp);
      info.push('  Texto extraido de AMP: ' + (textoAmp || '').length + ' chars');
    } catch (e) {
      info.push('  AMP fallo: ' + e.message);
    }

    var jinaUrl = 'https://r.jina.ai/' + encontrado.pagina;
    info.push('JINA URL: ' + jinaUrl);

    try {
      var md = await bajar(jinaUrl, true);
      info.push('  JINA: ' + (md || '').length + ' chars');
      var textoJina = limpiarMarkdownJina(md, encontrado.titulo);
      info.push('  Texto limpiado: ' + (textoJina || '').length + ' chars');
      info.push('');
      info.push('Primeros 400 chars del texto:');
      info.push((textoJina || '').slice(0, 400));
    } catch (e) {
      info.push('  JINA fallo: ' + e.message);
    }
  }

  var texto = info.join('\n');
  cont.textContent = texto;

  try {
    await Filesystem.writeFile({
      path: 'diag_item.txt',
      data: texto,
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}
}
