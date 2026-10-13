async function verEstructuraDialogo() {
  var items = await leerJSON('biblioteca_lecciones.json');
  if (!items || !items.length) { alert('Carga la lista primero'); return; }

  var url = items[0].pagina;
  var html = await bajar(url, true);

  // Buscar el dialogo por su frase unica
  var anclas = ['Nice to meet you', 'Are you Anna', 'Pete: Hi', 'Anna:'];
  var idx = -1;
  var anclaUsada = '';
  for (var i = 0; i < anclas.length; i++) {
    idx = html.indexOf(anclas[i]);
    if (idx >= 0) { anclaUsada = anclas[i]; break; }
  }

  if (idx < 0) {
    alert('No se encontro el dialogo');
    return;
  }

  // Extraer 3000 caracteres antes y 5000 despues
  var inicio = Math.max(0, idx - 3000);
  var fin = Math.min(html.length, idx + 5000);
  var fragmento = html.slice(inicio, fin);

  // Guardar en archivo
  var nombre = 'estructura_dialogo.txt';
  await Filesystem.writeFile({
    path: nombre,
    data: 'ANCLA USADA: ' + anclaUsada + '\n\n' + fragmento,
    directory: Directory.External,
    encoding: 'utf8',
    recursive: true
  });

  // Copiar al portapapeles
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fragmento);
      alert('HTML copiado al portapapeles (' + fragmento.length + ' caracteres).\n\nPegalo en el chat.');
    } else {
      // Fallback: mostrar en pantalla
      var cont = document.getElementById('diag-output');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'diag-output';
        cont.className = 'texto-box';
        document.getElementById('lista-lecciones').parentNode.insertBefore(cont, document.getElementById('lista-lecciones'));
      }
      cont.textContent = fragmento;
      alert('No hay portapapeles. El HTML esta en pantalla. Copialo con el dedo.');
    }
  } catch (e) {
    alert('Guardado como estructura_dialogo.txt. No se pudo copiar: ' + e.message);
  }
}
