// =====================================================================
// DATOS: Exportar e importar archivos entre Android/data y Documents
// Sin uso de 'event'. Con panel de log visible.
// =====================================================================

// =====================================================================
// LOG VISIBLE
// =====================================================================

function dlog(msg) {
  var panel = document.getElementById('datos-log');
  if (!panel) return;
  var t = new Date().toLocaleTimeString('es-MX');
  var linea = '[' + t + '] ' + msg;
  panel.textContent = linea + '\n' + panel.textContent;
  // Limitar a 200 lineas
  var lineas = panel.textContent.split('\n');
  if (lineas.length > 200) {
    panel.textContent = lineas.slice(0, 200).join('\n');
  }
}

function dlogClear() {
  var panel = document.getElementById('datos-log');
  if (panel) panel.textContent = '(Sin actividad)';
}

// =====================================================================
// EXPORTAR: Android/data -> Documents
// =====================================================================

async function exportarTodo() {
  if (!confirm('¿Exportar TODOS los archivos a Documents?\n\nSe copiarán de Android/data a Documents/MiInglesVOA/\n\nLos archivos existentes se SOBREESCRIBIRÁN.')) return;
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('INICIANDO EXPORTACIÓN');
  dlog('═══════════════════════════════');
  
  var fs = getFilesystem();
  var baseOrigen = 'MiInglesVOA';
  
  try {
    // 1) Verificar que exista la carpeta origen
    dlog('Buscando carpeta origen: ' + baseOrigen + '/');
    var carpetas;
    try {
      carpetas = await fs.readdir({
        path: baseOrigen,
        directory: Directory.External
      });
    } catch (e) {
      dlog('❌ No hay nada descargado en Android/data');
      alert('No hay nada descargado todavía.\n\nDescarga algo primero.');
      return;
    }
    
    // 2) Listar programas (carpetas dentro de MiInglesVOA/)
    var programas = [];
    for (var i = 0; i < carpetas.files.length; i++) {
      var f = carpetas.files[i];
      if (f.type === 'directory') {
        programas.push(f.name);
      }
    }
    
    dlog('Programas encontrados: ' + programas.length);
    for (var k = 0; k < programas.length; k++) {
      dlog('  - ' + programas[k]);
    }
    
    if (!programas.length) {
      dlog('❌ No hay programas para exportar');
      alert('No hay carpetas de programas');
      return;
    }
    
    // 3) Crear carpeta destino
    dlog('');
    dlog('Preparando carpeta destino: Documents/MiInglesVOA/');
    try {
      await fs.mkdir({
        path: 'MiInglesVOA',
        directory: Directory.Documents,
        recursive: true
      });
      dlog('✅ Carpeta destino lista');
    } catch (e) {
      dlog('⚠️ Carpeta destino: ' + e.message);
    }
    
    // 4) Contadores
    var copiados = 0;
    var errores = 0;
    var total = 0;
    
    // 5) Copiar cada programa
    for (var p = 0; p < programas.length; p++) {
      var prog = programas[p];
      dlog('');
      dlog('📁 Programa: ' + prog);
      await copiarCarpetaPrograma(prog, 'audios');
      await copiarCarpetaPrograma(prog, 'textos');
    }
    
    async function copiarCarpetaPrograma(prog, tipo) {
      var origen = baseOrigen + '/' + prog + '/' + tipo;
      var destino = 'MiInglesVOA/' + prog + '/' + tipo;
      
      var r;
      try {
        r = await fs.readdir({ path: origen, directory: Directory.External });
      } catch (e) {
        dlog('  (' + tipo + ': no existe)');
        return;
      }
      
      if (!r.files.length) {
        dlog('  (' + tipo + ': vacío)');
        return;
      }
      
      // Crear carpeta destino
      try {
        await fs.mkdir({ path: destino, directory: Directory.Documents, recursive: true });
      } catch (e) {}
      
      dlog('  Copiando ' + tipo + ': ' + r.files.length + ' archivos');
      
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
          dlog('    ⚠️ Error: ' + archivo.name + ' - ' + e.message.slice(0, 40));
        }
      }
    }
    
    // 6) Reporte final
    dlog('');
    dlog('═══════════════════════════════');
    dlog('✅ EXPORTACIÓN COMPLETA');
    dlog('═══════════════════════════════');
    dlog('Copiados: ' + copiados);
    dlog('Errores: ' + errores);
    dlog('Total procesados: ' + total);
    dlog('');
    dlog('Ubicación: Documents/MiInglesVOA/');
    
    alert('✅ Exportación completa\n\nCopiados: ' + copiados + ' de ' + total +
          '\nErrores: ' + errores +
          '\n\nUbicación:\nDocuments/MiInglesVOA/');
    
  } catch (e) {
    dlog('❌ Error general: ' + e.message);
    alert('Error al exportar: ' + e.message);
  }
}

// =====================================================================
// IMPORTAR: Documents -> Android/data
// =====================================================================

async function importarTodo() {
  if (!confirm('¿Importar TODOS los archivos desde Documents?\n\nSe copiarán de Documents/MiInglesVOA/ a Android/data\n\nSolo se copiarán los que NO existan.')) return;
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('INICIANDO IMPORTACIÓN');
  dlog('═══════════════════════════════');
  
  var fs = getFilesystem();
  var baseOrigen = 'MiInglesVOA';       // Documents
  var baseDestino = 'MiInglesVOA';      // Android/data
  
  try {
    // 1) Verificar carpeta origen en Documents
    dlog('Buscando carpeta origen en Documents: MiInglesVOA/');
    var carpetas;
    try {
      carpetas = await fs.readdir({
        path: baseOrigen,
        directory: Directory.Documents
      });
    } catch (e) {
      dlog('❌ No hay nada exportado en Documents');
      alert('No hay nada exportado en Documents.\n\nPrimero usa "Exportar todo".');
      return;
    }
    
    // 2) Listar programas
    var programas = [];
    for (var i = 0; i < carpetas.files.length; i++) {
      var f = carpetas.files[i];
      if (f.type === 'directory') {
        programas.push(f.name);
      }
    }
    
    dlog('Programas encontrados: ' + programas.length);
    for (var k = 0; k < programas.length; k++) {
      dlog('  - ' + programas[k]);
    }
    
    if (!programas.length) {
      dlog('❌ No hay programas en Documents');
      alert('No hay programas en Documents');
      return;
    }
    
    // 3) Contadores
    var copiados = 0;
    var saltados = 0;
    var errores = 0;
    var total = 0;
    
    // 4) Copiar cada programa
    for (var p = 0; p < programas.length; p++) {
      var prog = programas[p];
      dlog('');
      dlog('📁 Programa: ' + prog);
      await importarCarpetaPrograma(prog, 'audios');
      await importarCarpetaPrograma(prog, 'textos');
    }
    
    async function importarCarpetaPrograma(prog, tipo) {
      var origen = baseOrigen + '/' + prog + '/' + tipo;
      var destino = baseDestino + '/' + prog + '/' + tipo;
      
      var r;
      try {
        r = await fs.readdir({ path: origen, directory: Directory.Documents });
      } catch (e) {
        dlog('  (' + tipo + ': no existe)');
        return;
      }
      
      if (!r.files.length) {
        dlog('  (' + tipo + ': vacío)');
        return;
      }
      
      // Crear carpeta destino en Android/data
      try {
        await fs.mkdir({ path: destino, directory: Directory.External, recursive: true });
      } catch (e) {}
      
      var copiadosAqui = 0;
      var saltadosAqui = 0;
      
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
          saltadosAqui++;
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
          copiadosAqui++;
        } catch (e) {
          errores++;
          dlog('    ⚠️ Error: ' + archivo.name + ' - ' + e.message.slice(0, 40));
        }
      }
      
      dlog('  ' + tipo + ': ' + copiadosAqui + ' copiados, ' + saltadosAqui + ' saltados');
    }
    
    // 5) Reporte final
    dlog('');
    dlog('═══════════════════════════════');
    dlog('✅ IMPORTACIÓN COMPLETA');
    dlog('═══════════════════════════════');
    dlog('Copiados: ' + copiados);
    dlog('Ya existían: ' + saltados);
    dlog('Errores: ' + errores);
    dlog('Total en Documents: ' + total);
    
    alert('✅ Importación completa\n\nCopiados: ' + copiados +
          '\nYa existían (saltados): ' + saltados +
          '\nErrores: ' + errores +
          '\nTotal: ' + total);
    
    // Recargar todas las vistas
    dlog('');
    dlog('Recargando vistas...');
    var tabs = ['lecciones', 'words', 'science', 'grammar', 'teacher',
                'american_stories', 'us_history', 'presidents', 'arts',
                'health', 'as_it_is'];
    for (var t = 0; t < tabs.length; t++) {
      try { await cargarVista(tabs[t]); } catch (e) {}
    }
    dlog('✅ Vistas actualizadas');
    
  } catch (e) {
    dlog('❌ Error general: ' + e.message);
    alert('Error al importar: ' + e.message);
  }
}
