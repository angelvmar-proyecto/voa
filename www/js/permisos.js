// =====================================================================
// Gestion de permisos para escribir en Documents
// =====================================================================

async function pedirPermisosAlmacenamiento() {
  if (!window.Capacitor || !window.Capacitor.Plugins) {
    console.log('Capacitor no disponible');
    return false;
  }
  
  var plugin = window.Capacitor.Plugins.Filesystem;
  if (!plugin) {
    console.log('Filesystem plugin no disponible');
    return false;
  }
  
  try {
    // En Android, pedir acceso a la carpeta publica
    var resultado = await plugin.requestPermissions();
    console.log('Permisos Filesystem:', resultado);
    
    if (resultado && resultado.publicStorage === 'granted') {
      console.log('✅ Permiso de almacenamiento concedido');
      return true;
    } else if (resultado && resultado.publicStorage === 'denied') {
      alert('⚠️ Necesitas dar permiso de acceso a archivos para que las descargas funcionen.\n\nVe a Ajustes > Apps > Mi Inglés VOA > Permisos > Archivos y activa "Permitir administrar todos los archivos".');
      return false;
    }
  } catch (e) {
    console.log('Error pidiendo permisos:', e.message);
  }
  
  return false;
}

// Llamar al inicio
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(pedirPermisosAlmacenamiento, 1000);
});
