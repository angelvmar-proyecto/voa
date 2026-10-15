// =====================================================================
// EXPORTAR: Copia los archivos descargados a Documents/MiInglesVOA/
// Escanea la carpeta MiInglesVOA/ directamente, sin depender de JSONs
// =====================================================================

async function exportarDescargas() {
  var boton = document.getElementById('btn-exportar');
  // Buscar el botón por texto (por si hay varios)
  if (!boton) {
    var botones = document.querySelectorAll('button');
    for (var i = 0; i < botones.length; i++) {
      if (botones[i].innerHTML.indexOf('📤') >= 0) {
        boton = botones[i];
        break;
      }
    }
  }
  
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>';
  }
  
  try {
    var fs = getFilesystem();
    var baseOrigen = 'MiInglesVOA';
    
    // 1) Listar las pestañas dentro de MiInglesVOA/
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
      throw new Error('No hay carpetas de programas en MiInglesVOA/');
    }
    
    // 2) Crear carpeta destino en Documents
    try {
      await fs.mkdir({
        path: 'MiInglesVOA',
        directory: Directory.Documents,
        recursive: true
      });
    } catch (e) {}
    
    // 3) Contadores
    var copiados = 0;
    var errores = 0;
    var total = 0;
    
    // 4) Copiar cada carpeta
    for (var p = 0; p < programas.length; p++) {
      var prog = programas[p];
      
      // Copiar audios
      await copiarCarpeta(prog, 'audios');
      // Copiar textos
      await copiarCarpeta(prog, 'textos');
    }
    
    async function copiarCarpeta(prog, tipo) {
      try {
        var origen = baseOrigen + '/' + prog + '/' + tipo;
        var destino = 'MiInglesVOA/' + prog + '/' + tipo;
        
        var r;
        try {
          r = await fs.readdir({
            path: origen,
            directory: Directory.External
          });
        } catch (e) {
          return;  // Sin esta carpeta, seguir
        }
        
        // Crear carpeta destino
        try {
          await fs.mkdir({
            path: destino,
            directory: Directory.Documents,
            recursive: true
          });
        } catch (e) {}
        
        // Copiar cada archivo
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
            console.error('Error copiando ' + archivo.name + ':', e.message);
          }
        }
      } catch (e) {
        // Silencioso
      }
    }
    
    // 5) Reportar
    alert('Exportación completa.\n\nCopiados: ' + copiados + ' de ' + total +
          '\nErrores: ' + errores +
          '\n\nUbicación:\nDocuments/MiInglesVOA/');
    
  } catch (e) {
    alert('Error al exportar: ' + e.message);
  }
  
  if (boton) {
    boton.disabled = false;
    boton.innerHTML = '📤';
  }
}
