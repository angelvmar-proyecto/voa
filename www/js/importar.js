// =====================================================================
// IMPORTAR: Copia archivos de Documents -> Android/data
// Solo copia los que NO existan (no sobreescribe)
// =====================================================================

async function importarDescargas(tab) {
  if (!confirm('¿Importar archivos desde Documents?\n\nSe copiarán solo los que falten.\n\nPestaña: ' + tab)) {
    return;
  }
  
  var boton = event && event.target ? event.target.closest('button') : null;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>';
  }
  
  try {
    var fs = getFilesystem();
    var baseOrigen = 'MiInglesVOA';       // carpeta en Documents
    var baseDestino = 'MiInglesVOA';      // carpeta en Android/data
    
    var copiados = 0;
    var saltados = 0;
    var errores = 0;
    var total = 0;
    
    // Copiar audios y textos
    await importarCarpeta(tab, 'audios');
    await importarCarpeta(tab, 'textos');
    
    async function importarCarpeta(programa, tipo) {
      var origen = baseOrigen + '/' + programa + '/' + tipo;
      var destino = baseDestino + '/' + programa + '/' + tipo;
      
      var r;
      try {
        r = await fs.readdir({ path: origen, directory: Directory.Documents });
      } catch (e) {
        return;  // No existe esa carpeta en Documents
      }
      
      // Asegurar carpeta destino en Android/data
      try {
        await fs.mkdir({ path: destino, directory: Directory.External, recursive: true });
      } catch (e) {}
      
      for (var j = 0; j < r.files.length; j++) {
        var archivo = r.files[j];
        if (archivo.type === 'directory') continue;
        
        total++;
        var rutaDestino = destino + '/' + archivo.name;
        
        // Verificar si ya existe
        var existe = false;
        try {
          await fs.stat({ path: rutaDestino, directory: Directory.External });
          existe = true;
        } catch (e) { existe = false; }
        
        if (existe) {
          saltados++;
          continue;
        }
        
        // Copiar
        try {
          var esTexto = archivo.name.endsWith('.txt');
          
          var optsLectura = {
            path: origen + '/' + archivo.name,
            directory: Directory.Documents
          };
          if (esTexto) optsLectura.encoding = 'utf8';
          
          var contenido = await fs.readFile(optsLectura);
          
          var opts = {
            path: rutaDestino,
            data: contenido.data,
            directory: Directory.External
          };
          if (esTexto) opts.encoding = 'utf8';
          
          await fs.writeFile(opts);
          copiados++;
        } catch (e) {
          errores++;
        }
      }
    }
    
    alert('📥 Importación completa\n\nCopiados: ' + copiados +
          '\nYa existían (saltados): ' + saltados +
          '\nErrores: ' + errores +
          '\nTotal en Documents: ' + total);
    
    // Recargar la vista para que aparezcan en verde
    await cargarVista(tab);
    
  } catch (e) {
    alert('❌ Error al importar: ' + e.message);
  }
  
  if (boton) {
    boton.disabled = false;
    boton.innerHTML = '📥';
  }
}
