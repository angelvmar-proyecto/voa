const fs = require('fs');

// URL del feed RSS del podcast principal de VOA Learning English
const RSS_URL = 'https://learningenglish.voanews.com/podcast/?zoneId=5535';

async function obtenerBiblioteca() {
  console.log('📡 Obteniendo feed RSS de VOA...');
  try {
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    // Extraer los ítems (cada lección es un <item> en el XML)
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📚 Encontradas ${items.length} lecciones en el feed.`);

    const lecciones = [];
    for (const item of items) {
      const tituloMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const mp3Match = item.match(/<enclosure[^>]+url=["']([^"']+\.mp3)["']/i) || 
                       item.match(/<media:content[^>]+url=["']([^"']+\.mp3)["']/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);

      if (tituloMatch && mp3Match) {
        lecciones.push({
          titulo: tituloMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          audio: mp3Match[1],
          // Guardamos la URL de la página de la lección por si luego queremos el texto
          pagina: linkMatch ? linkMatch[1] : null
        });
      }
    }

    // Guardar la lista en un archivo JSON
    fs.writeFileSync('www/biblioteca.json', JSON.stringify(lecciones, null, 2), 'utf8');
    console.log(`✅ Biblioteca guardada en www/biblioteca.json (${lecciones.length} lecciones).`);
    console.log('👉 Ahora sube este archivo a GitHub y recompila el APK.');

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

obtenerBiblioteca();
