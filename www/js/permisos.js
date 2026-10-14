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





async function abrirAjustesPermisos() {
  try {
    // Intent directo a los ajustes de la app
    var pkg = 'com.angelvmar.voa';
    var intentUrl = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:' + pkg + ';end';
    window.location.href = intentUrl;
    setTimeout(function() {
      // Fallback si el intent no funciona
      alert('Si no se abrieron los ajustes, ve manualmente:\n\nAjustes > Aplicaciones > Mi Inglés VOA > Permisos > Archivos y medios > Permitir administrar todos los archivos');
    }, 1500);
  } catch (e) {
    alert('Ve manualmente a:\nAjustes > Aplicaciones > Mi Inglés VOA > Permisos');
  }
}
