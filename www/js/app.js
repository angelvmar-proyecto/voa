function cambiarTab(tab) {
  document.querySelectorAll('.tabs button').forEach(function(b) { b.classList.remove('activo'); });
  document.querySelectorAll('.contenido').forEach(function(c) { c.classList.remove('activo'); });
  document.getElementById('tab-' + tab).classList.add('activo');
  document.getElementById('contenido-' + tab).classList.add('activo');
  if (tab === 'turismo') cargarTurismo();
  else cargarVista(tab);
}

document.addEventListener('click', async function(e) {
  var boton = e.target.closest('button');
  if (!boton) return;

  if (boton.classList.contains('desc')) {
    await descargarVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  } else if (boton.classList.contains('play')) {
    await reproducirVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  } else if (boton.classList.contains('texto')) {
    await mostrarTextoVOA(boton.dataset.tab, parseInt(boton.dataset.i, 10), boton);
  } else if (boton.classList.contains('play-local')) {
    await reproducirLocal(parseInt(boton.dataset.i, 10), boton);
  } else if (boton.classList.contains('texto-local')) {
    await mostrarTextoLocal(parseInt(boton.dataset.i, 10), boton);
  }
});

cargarVista('lecciones');
cargarVista('entrevistas');
