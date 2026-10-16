// =====================================================================
// APP - Manejador de pestañas y eventos
// =====================================================================

// Lista de programas VOA (mismos IDs que en voa.js)
var TABS_VOA = ['lecciones', 'words', 'science', 'grammar', 'teacher',
                'american_stories', 'us_history', 'presidents', 'arts',
                'health', 'as_it_is'];

// Cambia de pestaña activa
async function cambiarTab(tab) {
  // Actualizar botones de pestañas
  document.querySelectorAll('.tabs button').forEach(function(b) {
    b.classList.remove('activo');
  });
  document.querySelectorAll('.contenido').forEach(function(c) {
    c.classList.remove('activo');
  });
  
  var btn = document.getElementById('tab-' + tab);
  var cont = document.getElementById('contenido-' + tab);
  if (btn) btn.classList.add('activo');
  if (cont) cont.classList.add('activo');
  
  // Cargar contenido según pestaña
  if (tab === 'turismo') {
    cargarTurismo();
  } else if (tab === 'datos') {
    // La pestaña Datos no necesita cargar nada, los botones
    // llaman directamente a exportarTodo() / importarTodo()
    dlogClear();
  } else if (TABS_VOA.indexOf(tab) >= 0) {
    cargarVista(tab);
  }
}

// Botón de exportar (compatible con las 11 pestañas)
function exportarDescargas() {
  // La función exportarDescargas ya está definida en exportar.js
  // Aquí solo la llamamos
  if (typeof exportarDescargas === 'function') {
    // ya está cargada, no hace nada
  }
}

// Manejador de clicks en toda la app
document.addEventListener('click', async function(e) {
  var boton = e.target.closest('button');
  if (!boton) return;
  
  // Ignorar clicks en botones de cambio de pestaña (ya tienen su propio onclick)
  if (boton.id && boton.id.indexOf('tab-') === 0) return;
  
  // Botón Descargar
  if (boton.classList.contains('desc')) {
    await descargarVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  }
  // Botón Audio
  else if (boton.classList.contains('play')) {
    await reproducirVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  }
  // Botón Texto
  else if (boton.classList.contains('texto')) {
    await mostrarTextoVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  }
  // Botón Marcar leído
  else if (boton.classList.contains('leido')) {
    var tab = boton.dataset.tab;
    var titulo = boton.dataset.titulo;
    var ahoraLeido = await toggleLeido(tab, titulo);
    
    // Actualizar visualmente el botón sin recargar todo
    if (ahoraLeido) {
      boton.classList.add('es-leido');
      boton.innerHTML = '✅ Leído';
      // Marcar la tarjeta como leída
      var card = boton.closest('.item');
      if (card) card.classList.add('item-leido');
    } else {
      boton.classList.remove('es-leido');
      boton.innerHTML = '⬜ Marcar leído';
      var card2 = boton.closest('.item');
      if (card2) card2.classList.remove('item-leido');
    }
    
    // Actualizar contadores del filtro (sin recargar la lista completa)
    // Lo mas simple: recargar la vista
    // Pero solo si el filtro actual es 'no_leidos' o 'leidos' (porque cambia la visibilidad)
    var filtroActual = getFiltro(tab);
    if (filtroActual !== 'todos') {
      await cargarVista(tab);
    } else {
      // Actualizar solo el contador en los botones de filtro
      var items = await leerJSON('biblioteca_' + tab + '.json');
      var leidos = await cargarLeidos(tab);
      var totalLeidos = 0;
      for (var k = 0; k < items.length; k++) {
        if (leidos.indexOf(items[k].titulo) >= 0) totalLeidos++;
      }
      var noLeidos = items.length - totalLeidos;
      var filtros = document.querySelectorAll('#lista-' + tab + ' .filtro');
      if (filtros[0]) filtros[0].innerHTML = 'Todos (' + items.length + ')';
      if (filtros[1]) filtros[1].innerHTML = 'No leídos (' + noLeidos + ')';
      if (filtros[2]) filtros[2].innerHTML = 'Leídos (' + totalLeidos + ')';
    }
  }
  // Botón Reproducir local (Turismo)
  else if (boton.classList.contains('play-local')) {
    await reproducirLocal(parseInt(boton.dataset.i, 10), boton);
  }
  // Botón Texto local (Turismo)
  else if (boton.classList.contains('texto-local')) {
    await mostrarTextoLocal(parseInt(boton.dataset.i, 10), boton);
  }
});

// Al iniciar la app, cargar la primera pestaña
document.addEventListener('DOMContentLoaded', function() {
  // Cargar la lista guardada de la primera pestaña (si existe)
  setTimeout(function() {
    cargarVista('lecciones');
  }, 500);
});
