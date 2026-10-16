// =====================================================================
// EXPORTAR: Copia archivos de Android/data -> Documents
// Escanea dinámicamente todas las carpetas dentro de MiInglesVOA/
// =====================================================================

async function exportarDescargas() {
  // Confirmacion previa (tambien hace que 'event' este disponible)
  if (!confirm('¿Exportar todos los archivos descargados a Documents?\n\nSe copiarán de Android/data a Documents/MiInglesVOA/')) return;
  
  // Buscar el botón que disparó la acción
  var boton = event && event.target ? event.target.closest('button') : null;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>';
  }
  
  try {
    var fs = getFilesystem();
    var baseOrigen = 'MiInglesVOA';
    
    // 1) Listar carpetas dentro de MiInglesVOA/ en Android/data
    var carpetas;
    try {
      carpetas = await fs.readdir({
        path: baseOrigen,
        directory: Directory.External
      });
    } catch (e) {
      throw new Error('No hay nada descargado todavía');
    }
    
    var programas = [];
    for (var i = 0; i < carpetas.files.length; i++) {
      var f = carpetas.files[i];
      if (f.type === 'directory') {
        programas.push(f.name);
      }
    }
    
    if (!programas.length) {
      throw new Error('No hay carpetas de programas en Android/data');
    }
    
    // 2) Asegurar carpeta destino en Documents
    try {
      await fs.mkdir({
        path: 'MiInglesVOA',
        directory: Directory.Documents,
        recursive: true
      });
    } catch (e) {}
    
    var copiados = 0;
    var errores = 0;
    var total = 0;
    
    // 3) Copiar cada programa
    for (var p = 0; p < programas.length; p++) {
      var prog = programas[p];
      await copiarCarpeta(prog, 'audios');
      await copiarCarpeta(prog, 'textos');
    }
    
    async function copiarCarpeta(prog, tipo) {
      try {
        var origen = baseOrigen + '/' + prog + '/' + tipo;
        var destino = 'MiInglesVOA/' + prog + '/' + tipo;
        
        var r;
        try {
          r = await fs.readdir({ path: origen, directory: Directory.External });
        } catch (e) {
          return;
        }
        
        try {
          await fs.mkdir({ path: destino, directory: Directory.Documents, recursive: true });
        } catch (e) {}
        
        for (var j = 0; j < r.files.length; j++) {
          var archivo = r.files[j];
          if (archivo.type === 'directory') continue;
          
          total++;
          try {
            var esTexto = archivo.name.endsWith('.txt');
            
            var optsLectura = {
              path: origen + '/' + archivo.name,
              directory: Directory.External
            };
            if (esTexto) optsLectura.encoding = 'utf8';
            
            var contenido = await fs.readFile(optsLectura);
            
            var opts = {
              path: destino + '/' + archivo.name,
              data: contenido.data,
              directory: Directory.Documents
            };
            if (esTexto) opts.encoding = 'utf8';
            
            await fs.writeFile(opts);
            copiados++;
          } catch (e) {
            errores++;
          }
        }
      } catch (e) {}
    }
    
    alert('📤 Exportación completa\n\nCopiados: ' + copiados + ' de ' + total +
          '\nErrores: ' + errores +
          '\n\nUbicación:\nDocuments/MiInglesVOA/');
    
  } catch (e) {
    alert('❌ Error al exportar: ' + e.message);
  }
  
  if (boton) {
    boton.disabled = false;
    boton.innerHTML = '📤';
  }
}
