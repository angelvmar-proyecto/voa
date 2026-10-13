async function verRSSCompleto() {
  var url = 'https://learningenglish.voanews.com/podcast/?zoneId=1579';
  var xml = await bajar(url, true);

  // Extraer el primer item
  var items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  if (!items.length) { alert('No items'); return; }

  var primero = items[0];

  var cont = document.getElementById('diag-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '70vh';
    document.getElementById('lista-entrevistas').parentNode.insertBefore(cont, document.getElementById('lista-entrevistas'));
  }

  var info = [];
  info.push('Total items en RSS: ' + items.length);
  info.push('Longitud del item #1: ' + primero.length + ' chars');
  info.push('');
  info.push('--- ETIQUETAS PRESENTES ---');
  info.push('<content:encoded>: ' + (primero.indexOf('<content:encoded>') >= 0 ? 'SÍ' : 'no'));
  info.push('<description>: ' + (primero.indexOf('<description>') >= 0 ? 'SÍ' : 'no'));
  info.push('<itunes:summary>: ' + (primero.indexOf('<itunes:summary>') >= 0 ? 'SÍ' : 'no'));
  info.push('<media:content>: ' + (primero.indexOf('<media:content>') >= 0 ? 'SÍ' : 'no'));
  info.push('');

  // Longitudes de contenido
  var m1 = primero.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/);
  var m2 = primero.match(/<description[^>]*>([\s\S]*?)<\/description>/);
  var m3 = primero.match(/<itunes:summary[^>]*>([\s\S]*?)<\/itunes:summary>/);

  if (m1) info.push('Tamaño content:encoded: ' + m1[1].length + ' chars');
  if (m2) info.push('Tamaño description: ' + m2[1].length + ' chars');
  if (m3) info.push('Tamaño itunes:summary: ' + m3[1].length + ' chars');
  info.push('');

  // Mostrar primeros 1500 chars de cada uno
  if (m1) {
    info.push('--- content:encoded (primeros 1500) ---');
    info.push(m1[1].slice(0, 1500).replace(/</g, '\n<'));
  }
  info.push('');
  if (m2) {
    info.push('--- description (primeros 800) ---');
    info.push(m2[1].slice(0, 800).replace(/</g, '\n<'));
  }

  var texto = info.join('\n');
  cont.textContent = texto;

  try {
    await Filesystem.writeFile({
      path: 'diag_rss.txt',
      data: texto,
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}
}
