// Verificar archivos descargados desde dentro de la app
async function verificarArchivos() {
  var cont = document.getElementById('verificar-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'verificar-output';
    cont.className = 'log-panel';
    cont.style.marginTop = '12px';
    var lista = document.getElementById('progreso-programas');
    if (lista && lista.parentNode) {
      lista.parentNode.insertBefore(cont, lista.nextSibling);
    }
  }
  
  cont.textContent = 'Verificando archivos...';
  
  var fs = getFilesystem();
  var base = 'MiInglesVOA';
  var informe = [];
  
  // Listar la carpeta base
  async function listar(ruta, nivel) {
    try {
      var r = await fs.readdir({ path: ruta, directory: Directory.External });
      for (var i = 0; i < r.files.length; i++) {
        var f = r.files[i];
        var indent = '  '.repeat(nivel);
        if (f.type === 'directory') {
          informe.push(indent + '📁 ' + f.name + '/');
          if (nivel < 2) {
            await listar(ruta + '/' + f.name, nivel + 1);
          }
        } else {
          var size = f.size ? Math.round(f.size / 1024) + ' KB' : '?';
          informe.push(indent + '📄 ' + f.name + ' (' + size + ')');
        }
      }
    } catch (e) {
      informe.push('  ❌ Error leyendo ' + ruta + ': ' + e.message);
    }
  }
  
  informe.push('=== Estructura de ' + base + '/ ===');
  await listar(base, 0);
  
  // Leer un txt de muestra para verificar el contenido
  informe.push('');
  informe.push('=== Contenido de un texto de muestra ===');
  try {
    var r2 = await fs.readdir({ path: base + '/textos', directory: Directory.External });
    var progId = null;
    for (var j = 0; j < r2.files.length; j++) {
      if (r2.files[j].type === 'directory') {
        progId = r2.files[j].name;
        break;
      }
    }
    if (progId) {
      var r3 = await fs.readdir({ path: base + '/textos/' + progId, directory: Directory.External });
      if (r3.files.length > 0) {
        var txtFile = r3.files[0].name;
        informe.push('Archivo: ' + progId + '/' + txtFile);
        informe.push('');
        var r4 = await fs.readFile({
          path: base + '/textos/' + progId + '/' + txtFile,
          directory: Directory.External,
          encoding: 'utf8'
        });
        informe.push('--- Primeros 2000 chars ---');
        informe.push(r4.data.slice(0, 2000));
      }
    }
  } catch (e) {
    informe.push('Error leyendo texto: ' + e.message);
  }
  
  cont.textContent = informe.join('\n');
}
