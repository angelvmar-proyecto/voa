const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function downloadBinary(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al bajar MP3`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function extractTitle(html) {
  let m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1].trim();
  m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) return m[1].replace(/\s*[-|].*$/, '').trim();
  m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Lección VOA';
}

function extractMp3(html) {
  const patterns = [
    /<audio[^>]+src=["']([^"']+\.mp3[^"']*)["']/i,
    /<source[^>]+src=["']([^"']+\.mp3[^"']*)["']/i,
    /<a[^>]+href=["']([^"']*voa-audio[^"']*\.mp3[^"']*)["']/i,
    /"contentUrl"\s*:\s*"([^"]+\.mp3[^"]*)"/i,
    /"audio"\s*:\s*"([^"]+\.mp3[^"]*)"/i,
    /data-audio=["']([^"']+\.mp3[^"']*)["']/i,
    /href=["']([^"']+\.mp3[^"']*)["']/i,
    /(https?:\/\/[^\s"'<>\\]+\.mp3)/i
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].replace(/\\\//g, '/');
  }
  return null;
}

function extractArticle(html) {
  const patterns = [
    /<div[^>]*class="[^"]*\bwsw\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    /<div[^>]*id="article-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1].length > 200) return cleanHtml(m[1]);
  }
  return '';
}

function cleanHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'leccion';
}

function limpiarTexto(bruto) {
  let t = bruto;

  // Cortar todo lo que venga después de marcadores de navegación/footer
  const cortes = [
    /\n\s*Related\s*\n/i,
    /\n\s*Follow Us\s*\n/i,
    /\n\s*About Learning English\s*\n/i,
    /\n\s*Video Programs\s*\n/i,
    /\n\s*Audio Programs\s*\n/i,
    /\n\s*Subscribe to Podcast/i,
    /\n\s*Find Us on Satellite/i,
    /\n\s*Our Policy About Comments/i
  ];
  for (const c of cortes) {
    const m = t.search(c);
    if (m > 200) { t = t.slice(0, m); break; }
  }

  // Cortar todo lo que venga ANTES del título de la lección o de la primera sección real
  const inicios = [
    /Let[''']?s Learn English[^\n]*Lesson[^\n]*/i,
    /Speaking Practice/i,
    /Conversation/i
  ];
  for (const i of inicios) {
    const m = t.search(i);
    if (m > 0) { t = t.slice(m); break; }
  }

  // Quitar líneas que son solo basura
  t = t.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      if (/^Download Lesson/i.test(l)) return false;
      if (/^Your browser doesn/i.test(l)) return false;
      if (/^Quiz - Lesson/i.test(l)) return false;
      if (/^\d{1,2}:\d{2}/.test(l)) return false;
      if (l.length < 2 && !/[a-zA-Z]/.test(l)) return false;
      return true;
    })
    .join('\n');

  // Colapsar múltiples saltos de línea
  t = t.replace(/\n{3,}/g, '\n\n');

  // Quitar líneas en blanco al inicio y fin
  return t.trim();
}

async function procesar(url, lecciones, idx) {
  // 1. Transformar a URL AMP
  const urlAmp = url.replace('learningenglish.voanews.com/a/', 'learningenglish.voanews.com/amp/');
  console.log(`\n📥 [${idx}] ${url}`);
  console.log(`   Usando AMP: ${urlAmp}`);

  const html = await fetchText(urlAmp); // Usamos la URL AMP
  const titulo = extractTitle(html);
  const mp3Url = extractMp3(html);
  
  // 2. Extracción de texto mejorada para AMP (más simple y directa)
const texto = limpiarTexto(cleanHtml(html.replace(/[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '')));  

  console.log(`   Título: ${titulo}`);

  if (!mp3Url) { console.log('   ⚠️  Sin MP3, saltando'); return false; }
  if (!texto || texto.length < 100) { console.log('   ⚠️  Texto insuficiente, saltando'); return false; }

  const nombre = `l${String(idx).padStart(3, '0')}_${slugify(titulo)}.mp3`;
  const rutaRel = `audios/${nombre}`;
  const rutaAbs = path.join('www', rutaRel);

  const bytes = await downloadBinary(mp3Url, rutaAbs);
  console.log(`   🎵 MP3: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   📖 Texto: ${texto.length} caracteres`);

  lecciones.push({ titulo, texto, audio: rutaRel });
  return true;
}

async function main() {
  if (!fs.existsSync('urls.txt')) {
    console.log('❌ Crea un archivo urls.txt con una URL por línea.');
    process.exit(1);
  }

  const urls = fs.readFileSync('urls.txt', 'utf8')
    .split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.startsWith('http'));

  if (!urls.length) {
    console.log('❌ urls.txt está vacío o no tiene URLs válidas.');
    process.exit(1);
  }

  fs.mkdirSync('www/audios', { recursive: true });

  const jsonPath = 'www/lecciones.json';
  let lecciones = [];
  if (fs.existsSync(jsonPath)) {
    try { lecciones = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch {}
  }
  console.log(`📚 Ya tienes ${lecciones.length} lecciones guardadas.`);

  let ok = 0, idx = lecciones.length + 1;
  for (const url of urls) {
    try {
      if (await procesar(url, lecciones, idx)) { ok++; idx++; }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(lecciones, null, 2), 'utf8');
  console.log(`\n✅ Añadidas: ${ok} | Total: ${lecciones.length}`);
  console.log(`📁 Actualizado: ${jsonPath}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
