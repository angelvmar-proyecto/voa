// =====================================================================
// EXPORTAR: Copia los archivos descargados a Documents/MiInglesVOA/
// =====================================================================

async function exportarDescargas() {
  var boton = document.getElementById('btn-exportar');
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Exportando...';
  }
  
  var info = document.getElementById('exportar-info');
  if (info) info.textContent = 'Iniciando exportación...';
  
  try {
    var fs = getFilesystem();
    
    // 1) Leer el progreso de descargas para saber qué programas hay
    var progreso = await leerJSONDocs('progreso_descargas.json');
    if (!progreso || Object.keys(progreso).length === 0) {
      throw new Error('No hay nada descargado para exportar');
    }
    
    // 2) Identificar programas únicos
    var programas = {};
    for (var clave in progreso) {
      var progId = clave.split('/')[0];
      programas[progId] = true;
    }
    var progs = Object.keys(programas);
    
    // 3) Crear carpeta destino en Documents
    try {
      await fs.mkdir({
        path: 'MiInglesVOA',
        directory: Directory.Documents,
        recursive: true
      });
    } catch (e) {}
    
    // 4) Copiar cada archivo
    var copiados = 0;
    var errores = 0;
    var totalArchivos = 0;
    
    for (var i = 0; i < progs.length; i++) {
      var prog = progs[i];
      
      // Copiar audios
      await copiarCarpeta(prog, 'audios');
      // Copiar textos
      await copiarCarpeta(prog, 'textos');
    }
    
    async function copiarCarpeta(prog, tipo) {
      try {
        var origen = 'MiInglesVOA/' + prog + '/' + tipo;
        var destino = 'MiInglesVOA/' + prog + '/' + tipo;
        
        // Listar archivos en la carpeta origen
        var r = await fs.readdir({
          path: origen,
          directory: Directory.External
        });
        
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
          totalArchivos++;
          try {
            // Leer del origen
            var contenido = await fs.readFile({
              path: origen + '/' + archivo.name,
              directory: Directory.External
            });
            
            // Escribir en destino
            var opts = {
              path: destino + '/' + archivo.name,
              data: contenido.data,
              directory: Directory.Documents
            };
            if (archivo.name.endsWith('.txt')) {
              opts.encoding = 'utf8';
            }
            await fs.writeFile(opts);
            
            copiados++;
            if (info) {
              info.textContent = 'Copiados: ' + copiados + '/' + totalArchivos + ' (' + prog + '/' + archivo.name.slice(0, 40) + ')';
            }
          } catch (e) {
            errores++;
            console.error('Error copiando ' + archivo.name + ': ' + e.message);
          }
        }
      } catch (e) {
        console.log('Sin carpeta ' + prog + '/' + tipo + ': ' + e.message.slice(0, 60));
      }
    }
    
    // 5) Reportar
    if (info) {
      info.textContent = '✅ Listo. Copiados: ' + copiados + ', Errores: ' + errores + '. Carpeta: /Documents/MiInglesVOA/';
    }
    alert('Exportación completa.\n\nCopiados: ' + copiados + '\nErrores: ' + errores + '\n\nUbicación:\nDocuments/MiInglesVOA/');
    
  } catch (e) {
    if (info) info.textContent = '❌ Error: ' + e.message;
    alert('Error al exportar: ' + e.message);
  }
  
  if (boton) {
    boton.disabled = false;
    boton.innerHTML = '📤 Exportar a Documents';
  }
}
