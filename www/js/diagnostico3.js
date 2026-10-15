async function diagnosticarEstructura() {
  var cont = document.getElementById('diag3-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'diag3-output';
    cont.className = 'log-panel';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '400px';
    cont.style.overflowY = 'auto';
    var lista = document.getElementById('progreso-programas');
    if (lista && lista.parentNode) {
      lista.parentNode.insertBefore(cont, lista.nextSibling);
    }
  }
  
  cont.textContent = 'Analizando...';
  var fs = getFilesystem();
  var informe = [];
  
  async function listar(ruta, nivel, maxNivel) {
    if (nivel > maxNivel) return;
    try {
      var r = await fs.readdir({ path: ruta, directory: Directory.External });
      for (var i = 0; i < r.files.length; i++) {
        var f = r.files[i];
        var indent = '  '.repeat(nivel);
        if (f.type === 'directory') {
          informe.push(indent + '📁 ' + f.name + '/');
          await listar(ruta + '/' + f.name, nivel + 1, maxNivel);
        } else {
          var size = f.size ? Math.round(f.size / 1024) + ' KB' : '?';
          informe.push(indent + '📄 ' + f.name + ' (' + size + ')');
        }
      }
    } catch (e) {
      informe.push('  ❌ Error en ' + ruta + ': ' + e.message.slice(0, 80));
    }
  }
  
  // Ver RAIZ de Directory.External (donde Capacitor pone todo)
  informe.push('═══════════════════════════════════════════════');
  informe.push('RAIZ de Directory.External:');
  informe.push('═══════════════════════════════════════════════');
  await listar('', 0, 2);
  
  // Ver dentro de MiInglesVOA
  informe.push('');
  informe.push('═══════════════════════════════════════════════');
  informe.push('Contenido de MiInglesVOA/:');
  informe.push('═══════════════════════════════════════════════');
  await listar('MiInglesVOA', 0, 3);
  
  // Buscar archivos sueltos en cualquier lado
  informe.push('');
  informe.push('═══════════════════════════════════════════════');
  informe.push('Verificacion final de rutas');
  informe.push('═══════════════════════════════════════════════');
  informe.push('BASE configurado: ' + DESCARGAS.BASE);
  
  cont.textContent = informe.join('\n');
}
