async function diagnosticarEntrevista() {
  var items = await leerJSON('biblioteca_entrevistas.json');
  if (!items || !items.length) {
    alert('Carga la lista de Entrevistas primero');
    return;
  }

  var cont = document.getElementById('diag-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '60vh';
    document.getElementById('lista-entrevistas').parentNode.insertBefore(cont, document.getElementById('lista-entrevistas'));
  }
  cont.textContent = '⏳ Analizando...';

  var informe = [];
  var url = items[0].pagina;
  informe.push('URL original: ' + url);

  // Probar AMP
  var ampUrl = url.replace('/a/', '/amp/');
  informe.push('URL AMP: ' + ampUrl);
  informe.push('');

  var htmlAmp = '';
  try {
    htmlAmp = await bajar(ampUrl, true);
    informe.push('✅ AMP descargado: ' + htmlAmp.length + ' caracteres');
  } catch (e) {
    informe.push('❌ AMP falló: ' + e.message);
  }

  var htmlNorm = '';
  try {
    htmlNorm = await bajar(url, true);
    informe.push('✅ Normal descargado: ' + htmlNorm.length + ' caracteres');
  } catch (e) {
    informe.push('❌ Normal falló: ' + e.message);
  }
  informe.push('');

  // Analizar AMP
  if (htmlAmp) {
    informe.push('=== ANÁLISIS AMP ===');
    informe.push('Contiene <body>: ' + /<body/i.test(htmlAmp));
    informe.push('Contiene class="wsw": ' + /class="wsw"/i.test(htmlAmp));
    informe.push('Contiene id="article-content": ' + /id="article-content"/i.test(htmlAmp));
    informe.push('Contiene <article: ' + /<article/i.test(htmlAmp));
    informe.push('Contiene <p>: ' + /<p[\s>]/i.test(htmlAmp));

    // Buscar primeras palabras del titulo en el HTML
    var tituloCorto = (items[0].titulo || '').split(' - ')[0].slice(0, 30);
    var idx = htmlAmp.indexOf(tituloCorto);
    informe.push('Titulo "' + tituloCorto + '" aparece: ' + (idx >= 0 ? 'SÍ (pos ' + idx + ')' : 'NO'));

    // Contar parrafos
    var doc = new DOMParser().parseFromString(htmlAmp, 'text/html');
    var todosP = doc.querySelectorAll('p');
    informe.push('Total <p> en AMP: ' + todosP.length);

    var wsw = doc.querySelector('.wsw');
    if (wsw) {
      var pWsw = wsw.querySelectorAll('p');
      informe.push('<p> dentro de .wsw: ' + pWsw.length);
      var textoWsw = wsw.innerText || '';
      informe.push('Longitud texto .wsw: ' + textoWsw.length);
      informe.push('');
      informe.push('--- Primeros 600 chars de .wsw ---');
      informe.push(textoWsw.slice(0, 600));
    } else {
      informe.push('⚠️ No hay .wsw en AMP');
      var body = doc.body ? doc.body.innerText : '';
      informe.push('Longitud body: ' + body.length);
      informe.push('--- Primeros 600 chars del body ---');
      informe.push(body.slice(0, 600));
    }
    informe.push('');
  }

  // Analizar normal
  if (htmlNorm) {
    informe.push('=== ANÁLISIS NORMAL ===');
    var doc2 = new DOMParser().parseFromString(htmlNorm, 'text/html');
    var wsw2 = doc2.querySelector('.wsw');
    if (wsw2) {
      var textoWsw2 = wsw2.innerText || '';
      informe.push('Longitud texto .wsw (normal): ' + textoWsw2.length);
      informe.push('Primeros 300 chars:');
      informe.push(textoWsw2.slice(0, 300));
    } else {
      informe.push('⚠️ No hay .wsw en normal');
    }
  }

  var texto = informe.join('\n');
  cont.textContent = texto;

  // Guardar como archivo
  try {
    await Filesystem.writeFile({
      path: 'diag_entrevista.txt',
      data: texto,
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}

  alert('Análisis listo. Copia el texto de la pantalla.');
}
