// =====================================================================
// DATOS: Exportar, importar y migrar archivos
// Estructura espejo exacta entre Android/data y Documents
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
// COPIAR CARPETA RECURSIVAMENTE (espejo exacto)
// =====================================================================

async function copiarArbolRecursivo(rutaRel, dirOrigen, dirDestino) {
  var fs = getFilesystem();
  var contador = { copiados: 0, saltados: 0, errores: 0 };
  
  await copiarRecursivo(rutaRel);
  
  async function copiarRecursivo(ruta) {
    var r;
    try {
      r = await fs.readdir({ path: ruta, directory: dirOrigen });
    } catch (e) {
      return;
    }
    
    for (var i = 0; i < r.files.length; i++) {
      var f = r.files[i];
      var rutaHijo = ruta + '/' + f.name;
      
      if (f.type === 'directory') {
        // Crear carpeta destino y recursar
        try {
          await fs.mkdir({ path: rutaHijo, directory: dirDestino, recursive: true });
        } catch (e) {}
        await copiarRecursivo(rutaHijo);
      } else {
        // Copiar archivo
        var rutaDestino = rutaHijo;
        
        // Saltar si ya existe
        try {
          await fs.stat({ path: rutaDestino, directory: dirDestino });
          contador.saltados++;
          continue;
        } catch (e) {}
        
        try {
          var esTexto = f.name.endsWith('.txt') || f.name.endsWith('.json');
          
          var optsLectura = {
            path: rutaHijo,
            directory: dirOrigen
          };
          if (esTexto) optsLectura.encoding = 'utf8';
          
          var contenido = await fs.readFile(optsLectura);
          
          var opts = {
            path: rutaDestino,
            data: contenido.data,
            directory: dirDestino
          };
          if (esTexto) opts.encoding = 'utf8';
          
          await fs.writeFile(opts);
          contador.copiados++;
        } catch (e) {
          contador.errores++;
        }
      }
    }
  }
  
  return contador;
}

// =====================================================================
// EXPORTAR: Android/data -> Documents (espejo exacto)
// =====================================================================

async function exportarTodo() {
  if (!confirm('¿Exportar TODO a Documents?\n\nSe copiará MiInglesVOA/ de la app a Documents/MiInglesVOA/\n\nLos archivos existentes se SALTARÁN.')) return;
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('INICIANDO EXPORTACIÓN');
  dlog('═══════════════════════════════');
  dlog('');
  dlog('Origen: Android/data/.../files/MiInglesVOA/');
  dlog('Destino: Documents/MiInglesVOA/');
  dlog('');
  
  try {
    // 1) Verificar que exista la carpeta origen
    try {
      await getFilesystem().readdir({ path: 'MiInglesVOA', directory: Directory.External });
    } catch (e) {
      dlog('❌ No existe MiInglesVOA/ en Android/data');
      alert('No hay nada descargado todavía.\n\nDescarga algo primero.');
      return;
    }
    
    // 2) Crear carpeta destino
    try {
      await getFilesystem().mkdir({ path: 'MiInglesVOA', directory: Directory.Documents, recursive: true });
    } catch (e) {}
    
    // 3) Copiar recursivamente
    dlog('Copiando...');
    var resultado = await copiarArbolRecursivo('MiInglesVOA', Directory.External, Directory.Documents);
    
    // 4) Reporte
    dlog('');
    dlog('═══════════════════════════════');
    dlog('✅ EXPORTACIÓN COMPLETA');
    dlog('═══════════════════════════════');
    dlog('Copiados: ' + resultado.copiados);
    dlog('Ya existían (saltados): ' + resultado.saltados);
    dlog('Errores: ' + resultado.errores);
    
    alert('✅ Exportación completa\n\nCopiados: ' + resultado.copiados +
          '\nYa existían: ' + resultado.saltados +
          '\nErrores: ' + resultado.errores +
          '\n\nUbicación:\nDocuments/MiInglesVOA/');
    
  } catch (e) {
    dlog('❌ Error: ' + e.message);
    alert('Error al exportar: ' + e.message);
  }
}

// =====================================================================
// IMPORTAR: Documents -> Android/data (espejo exacto)
// =====================================================================

async function importarTodo() {
  if (!confirm('¿Importar TODO desde Documents?\n\nSe copiará Documents/MiInglesVOA/ a la app.\n\nLos archivos existentes se SALTARÁN.')) return;
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('INICIANDO IMPORTACIÓN');
  dlog('═══════════════════════════════');
  dlog('');
  dlog('Origen: Documents/MiInglesVOA/');
  dlog('Destino: Android/data/.../files/MiInglesVOA/');
  dlog('');
  
  try {
    // 1) Verificar origen
    try {
      await getFilesystem().readdir({ path: 'MiInglesVOA', directory: Directory.Documents });
    } catch (e) {
      dlog('❌ No existe MiInglesVOA/ en Documents');
      alert('No hay nada exportado.\n\nUsa "Exportar" primero.');
      return;
    }
    
    // 2) Copiar recursivamente
    dlog('Copiando...');
    var resultado = await copiarArbolRecursivo('MiInglesVOA', Directory.Documents, Directory.External);
    
    // 3) Reporte
    dlog('');
    dlog('═══════════════════════════════');
    dlog('✅ IMPORTACIÓN COMPLETA');
    dlog('═══════════════════════════════');
    dlog('Copiados: ' + resultado.copiados);
    dlog('Ya existían (saltados): ' + resultado.saltados);
    dlog('Errores: ' + resultado.errores);
    
    alert('✅ Importación completa\n\nCopiados: ' + resultado.copiados +
          '\nYa existían: ' + resultado.saltados +
          '\nErrores: ' + resultado.errores);
    
    // 4) Recargar todas las vistas
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
    dlog('❌ Error: ' + e.message);
    alert('Error al importar: ' + e.message);
  }
}

// =====================================================================
// DETECTAR Y MIGRAR ARCHIVOS VIEJOS
// Si hay una estructura vieja: audios/<tab>/  y  textos/<tab>/
// Mover a: MiInglesVOA/audios/<tab>/  y  MiInglesVOA/textos/<tab>/
// =====================================================================

async function hayArchivosViejos() {
  var fs = getFilesystem();
  
  // Buscar audios/ o textos/ en la raíz (estructura vieja)
  try {
    var r1 = await fs.readdir({ path: 'audios', directory: Directory.External });
    if (r1.files && r1.files.length > 0) return true;
  } catch (e) {}
  
  try {
    var r2 = await fs.readdir({ path: 'textos', directory: Directory.External });
    if (r2.files && r2.files.length > 0) return true;
  } catch (e) {}
  
  return false;
}

async function preguntarMigracion() {
  var hay = await hayArchivosViejos();
  if (!hay) return;
  
  var respuesta = confirm(
    '🔄 Detecté archivos de una versión anterior en la estructura vieja.\n\n' +
    '¿Quieres migrarlos a MiInglesVOA/ ?\n\n' +
    'Esto moverá tus audios y textos descargados para que sigan apareciendo en la app.'
  );
  
  if (respuesta) {
    await migrarArchivosViejos();
  }
}

async function migrarArchivosViejos() {
  if (!confirm('¿Migrar archivos viejos a la nueva estructura?\n\nMoverá audios/ y textos/ a MiInglesVOA/audios/ y MiInglesVOA/textos/')) return;
  
  var fs = getFilesystem();
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('INICIANDO MIGRACIÓN');
  dlog('═══════════════════════════════');
  
  // Crear carpeta destino
  try {
    await fs.mkdir({ path: 'MiInglesVOA', directory: Directory.External, recursive: true });
    await fs.mkdir({ path: 'MiInglesVOA/audios', directory: Directory.External, recursive: true });
    await fs.mkdir({ path: 'MiInglesVOA/textos', directory: Directory.External, recursive: true });
  } catch (e) {}
  
  var movidos = 0;
  var errores = 0;
  
  await migrarTipo('audios');
  await migrarTipo('textos');
  
  async function migrarTipo(tipo) {
    var subcarpetas;
    try {
      subcarpetas = await fs.readdir({ path: tipo, directory: Directory.External });
    } catch (e) {
      dlog('  (' + tipo + '/ no existe en estructura vieja)');
      return;
    }
    
    dlog('');
    dlog('📁 Migrando ' + tipo + '/');
    
    for (var i = 0; i < subcarpetas.files.length; i++) {
      var sub = subcarpetas.files[i];
      if (sub.type !== 'directory') continue;
      
      var prog = sub.name;
      var origen = tipo + '/' + prog;
      var destino = 'MiInglesVOA/' + tipo + '/' + prog;
      
      try {
        await fs.mkdir({ path: destino, directory: Directory.External, recursive: true });
      } catch (e) {}
      
      var archivos;
      try {
        archivos = await fs.readdir({ path: origen, directory: Directory.External });
      } catch (e) { continue; }
      
      var movidosAqui = 0;
      
      for (var j = 0; j < archivos.files.length; j++) {
        var arch = archivos.files[j];
        if (arch.type === 'directory') continue;
        
        try {
          var esTexto = arch.name.endsWith('.txt');
          
          var optsLectura = {
            path: origen + '/' + arch.name,
            directory: Directory.External
          };
          if (esTexto) optsLectura.encoding = 'utf8';
          
          var contenido = await fs.readFile(optsLectura);
          
          var optsEscritura = {
            path: destino + '/' + arch.name,
            data: contenido.data,
            directory: Directory.External
          };
          if (esTexto) optsEscritura.encoding = 'utf8';
          
          await fs.writeFile(optsEscritura);
          
          try {
            await fs.deleteFile({ path: origen + '/' + arch.name, directory: Directory.External });
          } catch (e) {}
          
          movidosAqui++;
          movidos++;
        } catch (e) {
          errores++;
        }
      }
      
      if (movidosAqui > 0) {
        dlog('  ' + prog + ': ' + movidosAqui + ' archivos movidos');
      }
      
      try {
        await fs.rmdir({ path: origen, directory: Directory.External });
      } catch (e) {}
    }
    
    try {
      await fs.rmdir({ path: tipo, directory: Directory.External });
      dlog('  ✅ Carpeta ' + tipo + '/ eliminada');
    } catch (e) {}
  }
  
  dlog('');
  dlog('═══════════════════════════════');
  dlog('✅ MIGRACIÓN COMPLETA');
  dlog('═══════════════════════════════');
  dlog('Archivos movidos: ' + movidos);
  dlog('Errores: ' + errores);
  
  alert('✅ Migración completa\n\nArchivos movidos: ' + movidos + '\nErrores: ' + errores);
}

// =====================================================================
// DIAGNOSTICO: Lista la estructura de ambas carpetas
// =====================================================================

async function diagnosticarEstructura() {
  var fs = getFilesystem();
  
  dlogClear();
  dlog('═══════════════════════════════');
  dlog('DIAGNÓSTICO DE ESTRUCTURA');
  dlog('═══════════════════════════════');
  
  dlog('');
  dlog('📍 ANDROID/DATA');
  dlog('───────────────────────────────');
  await listarRecursivo('MiInglesVOA', 0, 3, Directory.External);
  
  dlog('');
  dlog('📍 DOCUMENTS');
  dlog('───────────────────────────────');
  await listarRecursivo('MiInglesVOA', 0, 3, Directory.Documents);
  
  alert('Diagnóstico completo. Revisa el panel de log.');
  
  async function listarRecursivo(ruta, nivel, maxNivel, dir) {
    if (nivel > maxNivel) return;
    var indent = '  '.repeat(nivel);
    try {
      var r = await fs.readdir({ path: ruta, directory: dir });
      for (var i = 0; i < r.files.length; i++) {
        var f = r.files[i];
        if (f.type === 'directory') {
          dlog(indent + '📁 ' + f.name + '/');
          await listarRecursivo(ruta + '/' + f.name, nivel + 1, maxNivel, dir);
        } else {
          var size = f.size ? ' (' + Math.round(f.size / 1024) + ' KB)' : '';
          dlog(indent + '📄 ' + f.name + size);
        }
      }
    } catch (e) {
      dlog(indent + '❌ ' + e.message.slice(0, 60));
    }
  }
}
