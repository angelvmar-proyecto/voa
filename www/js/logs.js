// Sistema de logs interno
var _logBuffer = [];
var MAX_LOGS = 500;

function log(msg) {
  var t = new Date().toLocaleTimeString('es-MX');
  var linea = '[' + t + '] ' + msg;
  _logBuffer.push(linea);
  if (_logBuffer.length > MAX_LOGS) _logBuffer.shift();
  console.log(linea);
}

async function guardarLogs() {
  try {
    await Filesystem.writeFile({
      path: 'logs.txt',
      data: _logBuffer.join('\n'),
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
  } catch (e) {}
}

async function mostrarLogs() {
  var cont = document.getElementById('logs-output');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'logs-output';
    cont.className = 'texto-box';
    cont.style.marginTop = '12px';
    cont.style.maxHeight = '70vh';
    cont.style.fontSize = '11px';
    cont.style.fontFamily = 'monospace';
    var lista = document.getElementById('lista-words');
    if (lista && lista.parentNode) {
      lista.parentNode.insertBefore(cont, lista);
    }
  }

  if (cont.style.display === 'block' && cont.textContent) {
    cont.style.display = 'none';
    return;
  }

  // Cargar logs guardados + buffer actual
  var guardados = '';
  try {
    var r = await Filesystem.readFile({
      path: 'logs.txt',
      directory: Directory.External,
      encoding: 'utf8',
      recursive: true
    });
    guardados = r.data || '';
  } catch (e) {}

  var todo = guardados;
  if (_logBuffer.length) {
    if (todo) todo += '\n\n--- SESION ACTUAL ---\n';
    todo += _logBuffer.join('\n');
  }

  if (!todo) todo = '(No hay logs todavía. Descarga algo primero.)';

  cont.textContent = todo;
  cont.style.display = 'block';
}

// Logs de arranque
log('=== App iniciada ===');
log('Date: ' + new Date().toISOString());
if (window.Capacitor) {
  log('Capacitor: OK');
  log('Platform: ' + (window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'desconocida'));
}
