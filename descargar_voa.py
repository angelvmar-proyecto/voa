#!/usr/bin/env python3
"""
Descargador masivo de VOA Learning English.
Descarga audio (128 kbps) y texto de todos los programas.
Reanuda automaticamente si se interrumpe.
"""

import os
import sys
import json
import time
import re
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# ==== CONFIGURACION ====
# Guardamos en Descargas, que si es accesible desde Termux
BASE_DIR = "/data/data/com.termux/files/home/storage/shared/Download/MiInglesVOA"
os.makedirs(BASE_DIR, exist_ok=True)

AUDIO_DIR = os.path.join(BASE_DIR, "audios")
TEXTO_DIR = os.path.join(BASE_DIR, "textos")
PROGRESO_FILE = os.path.join(BASE_DIR, "progreso.json")

CHROME = "/data/data/com.termux/files/usr/bin/chromium-browser"
DRIVER = "/data/data/com.termux/files/usr/bin/chromedriver"
UA = "Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

BLOQUE = 50  # episodios por bloque

# ==== UTILIDADES ====
def log(msg):
    print(msg, flush=True)

def slugify(s):
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    return s.strip('_')[:70]

def cargar_json(path, default=None):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return default if default is not None else {}

def guardar_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def cargar_progreso():
    return cargar_json(PROGRESO_FILE, {"episodios": {}, "programas": {}})

def guardar_progreso(p):
    guardar_json(PROGRESO_FILE, p)

# ==== DESCARGAR HTML ====
def descargar_html(url):
    headers = {"User-Agent": UA}
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r.text

# ==== EXTRAER EPISODIOS DE UN FEED ====
def episodios_de_feed(url_feed):
    """Extrae titulo, mp3 y pagina de un feed RSS."""
    xml = descargar_html(url_feed)
    items = re.findall(r'<item[\s>][\s\S]*?</item>', xml)
    episodios = []
    for it in items:
        t = re.search(r'<title>([\s\S]*?)</title>', it)
        mp3 = (re.search(r'<enclosure[^>]+url=["\']([^"\']+\.mp3)["\']', it) or
               re.search(r'<media:content[^>]+url=["\']([^"\']+\.mp3)["\']', it) or
               re.search(r'(https?://[^\s"\'<>\\]+\.mp3)', it))
        link = re.search(r'<link>([\s\S]*?)</link>', it)
        pub = re.search(r'<pubDate>([\s\S]*?)</pubDate>', it)
        if not t:
            continue
        titulo = t.group(1).replace('<![CDATA[', '').replace(']]>', '').strip()
        mp3_url = mp3.group(1).replace('\\/', '/') if mp3 else None
        episodios.append({
            "titulo": titulo,
            "mp3": mp3_url,
            "pagina": link.group(1).strip() if link else None,
            "fecha": pub.group(1).strip() if pub else ''
        })
    return episodios

def episodios_de_indice(url_indice):
    """Extrae lecciones de una pagina indice (Let's Learn English)."""
    html = descargar_html(url_indice)
    soup = BeautifulSoup(html, "html.parser")
    episodios = []
    vistos = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        texto = a.get_text(strip=True)
        if "/a/" not in href:
            continue
        if not re.match(r'^Lesson\s+\d+', texto, re.I):
            continue
        if href.startswith("http"):
            full = href
        else:
            full = "https://learningenglish.voanews.com" + ("" if href.startswith("/") else "/") + href
        if full in vistos:
            continue
        vistos.add(full)
        episodios.append({
            "titulo": texto,
            "mp3": None,
            "pagina": full,
            "fecha": ""
        })
    # Ordenar por numero de leccion
    def num(e):
        m = re.search(r'(\d+)', e["titulo"])
        return int(m.group(1)) if m else 999
    episodios.sort(key=num)
    return episodios

# ==== EXTRAER TEXTO CON CHROMIUM ====
_driver = None

_driver_counter = 0

def reiniciar_driver():
    global _driver, _driver_counter
    if _driver is not None:
        try:
            _driver.quit()
        except:
            pass
    _driver = None
    _driver_counter = 0

def get_driver():
    global _driver, _driver_counter
    # Reiniciar cada 20 usos para evitar crash
    if _driver_counter >= 20:
        print("    [Reiniciando Chromium por precaucion]")
        reiniciar_driver()
    _driver_counter += 1
    if _driver is not None:
        return _driver
    opts = Options()
    opts.binary_location = CHROME
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--user-agent=" + UA)
    opts.add_argument("--lang=en-US")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    service = Service(DRIVER)
    _driver = webdriver.Chrome(service=service, options=opts)
    return _driver

def extraer_texto(url_pagina):
    """Extrae el texto del articulo usando Chromium headless."""
    if not url_pagina:
        return ""
    for intento in range(2):
        try:
            return _extraer_texto_intento(url_pagina)
        except Exception as e:
            if "invalid session id" in str(e):
                print("    Chromium crasheo, reiniciando...")
                reiniciar_driver()
                time.sleep(3)
                continue
            raise
    return ""

def _extraer_texto_intento(url_pagina):
    # Agregar parametro magico si no esta
    if "?withmediaplayer=1" not in url_pagina:
        url_pagina = url_pagina + ("&" if "?" in url_pagina else "?") + "withmediaplayer=1"
    try:
        driver = get_driver()
        driver.get(url_pagina)
        time.sleep(12)
        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")
        wsw = soup.find("div", class_="wsw")
        if not wsw:
            return ""
        texto = wsw.get_text("\n", strip=True)
        lineas = [l.strip() for l in texto.split("\n") if len(l.strip()) > 3]
        return "\n\n".join(lineas)
    except Exception as e:
        log("  Error extrayendo texto: " + str(e)[:80])
        return ""

# ==== DESCARGAR MP3 ====
def descargar_mp3(url, destino):
    if os.path.exists(destino):
        return True
    try:
        headers = {"User-Agent": UA}
        r = requests.get(url, headers=headers, stream=True, timeout=60)
        r.raise_for_status()
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        log("  Error MP3: " + str(e)[:80])
        return False

# ==== PROCESAR UN EPISODIO ====
def procesar_episodio(prog_id, prog_nombre, episodio, num, total, progreso):
    """Descarga audio + texto de un episodio."""
    titulo = episodio["titulo"]
    slug = slugify(titulo)
    nombre_base = "l" + str(num).zfill(4) + "_" + slug
    
    audio_path = os.path.join(AUDIO_DIR, prog_id, nombre_base + ".mp3")
    texto_path = os.path.join(TEXTO_DIR, prog_id, nombre_base + ".txt")
    clave = prog_id + "/" + nombre_base
    
    # Si ya esta en progreso, saltar
    if clave in progreso["episodios"] and progreso["episodios"][clave].get("completo"):
        log("  [" + str(num) + "/" + str(total) + "] YA COMPLETO: " + titulo[:60])
        return True
    
    log("  [" + str(num) + "/" + str(total) + "] " + titulo[:60])
    
    estado = progreso["episodios"].get(clave, {})
    estado["titulo"] = titulo
    estado["fecha"] = episodio.get("fecha", "")
    
    # 1) Descargar MP3
    if "mp3_url" not in estado:
        mp3_url = episodio.get("mp3")
        if not mp3_url and episodio.get("pagina"):
            try:
                log("    Extrayendo MP3 con Chromium...")
                pagina = episodio["pagina"]
                if "?withmediaplayer=1" not in pagina:
                    pagina = pagina + "?withmediaplayer=1"
                driver = get_driver()
                driver.get(pagina)
                time.sleep(5)
                html = driver.page_source
                # Buscar el primer MP3 que aparezca
                m = re.search(r'(https?://[^\s"\'<>\\]+\.mp3)', html)
                if m:
                    mp3_url = m.group(1).replace('\\/', '/')
            except Exception as e:
                log("    Error extrayendo MP3: " + str(e)[:80])
        if mp3_url:
            estado["mp3_url"] = mp3_url
            log("    MP3 URL: " + mp3_url[:80] + "...")
    
    if "mp3_url" in estado and not os.path.exists(audio_path):
        if descargar_mp3(estado["mp3_url"], audio_path):
            estado["audio_completo"] = True
            log("    Audio OK")
        else:
            estado["audio_completo"] = False
    elif os.path.exists(audio_path):
        estado["audio_completo"] = True
    
    # 2) Extraer texto
    if not os.path.exists(texto_path) and episodio.get("pagina"):
        texto = extraer_texto(episodio["pagina"])
        if texto and len(texto) > 200:
            os.makedirs(os.path.dirname(texto_path), exist_ok=True)
            with open(texto_path, 'w', encoding='utf-8') as f:
                f.write(texto)
            estado["texto_completo"] = True
            log("    Texto OK (" + str(len(texto)) + " chars)")
        else:
            estado["texto_completo"] = False
            estado["sin_texto"] = True
            log("    Sin texto")
    elif os.path.exists(texto_path):
        estado["texto_completo"] = True
    
    # Marcar como completo si al menos tiene audio
    estado["completo"] = estado.get("audio_completo", False)
    progreso["episodios"][clave] = estado
    guardar_progreso(progreso)
    
    return estado.get("completo", False)

# ==== PROCESAR UN PROGRAMA ====
def procesar_programa(prog_id, config_prog, progreso):
    log("")
    log("=" * 70)
    log("PROGRAMA: " + config_prog["nombre"])
    log("=" * 70)
    
    # Obtener lista de episodios
    try:
        if config_prog.get("feed"):
            log("Cargando feed RSS...")
            episodios = episodios_de_feed(config_prog["feed"])
        elif config_prog.get("indice"):
            log("Cargando pagina indice...")
            episodios = episodios_de_indice(config_prog["indice"])
        else:
            log("Sin feed ni indice configurado")
            return
    except Exception as e:
        log("Error obteniendo lista: " + str(e)[:100])
        return
    
    total = len(episodios)
    log("Total episodios: " + str(total))
    
    if total == 0:
        log("No hay episodios")
        return
    
    # Procesar en bloques
    exitos = 0
    for i, ep in enumerate(episodios, 1):
        try:
            if procesar_episodio(prog_id, config_prog["nombre"], ep, i, total, progreso):
                exitos += 1
        except Exception as e:
            log("  Error en episodio " + str(i) + ": " + str(e)[:100])
        
        # Pausa cada 5 episodios para no saturar VOA
        if i % 5 == 0:
            log("  (pausa 3s)")
            time.sleep(3)
        
        # Pausa cada BLOQUE
        if i % BLOQUE == 0:
            log("")
            log("  === BLOQUE " + str(i // BLOQUE) + " COMPLETADO ===")
            log("  Progreso: " + str(i) + "/" + str(total))
            log("  Pausa larga (15s)...")
            time.sleep(15)
    
    log("")
    log("Programa terminado: " + str(exitos) + "/" + str(total))

# ==== MAIN ====
def main():
    if len(sys.argv) < 2:
        print("Uso: python descargar_voa.py [1a|1b|1c|1d|todo|programa_id]")
        print("")
        print("Fases:")
        print("  1a = Let's Learn + Words & Stories (~600 episodios)")
        print("  1b = Science & Technology (~1500)")
        print("  1c = Gramatica e historia (~1000)")
        print("  1d = Cultura y estilo de vida (~1500)")
        print("  todo = Todos")
        print("")
        print("Tambien puedes pasar un programa_id especifico:")
        print("  lets_learn_1, lets_learn_2, words_stories, science_tech...")
        sys.exit(1)
    
    arg = sys.argv[1]
    
    config = cargar_json("voa_config.json")
    progreso = cargar_progreso()
    
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(TEXTO_DIR, exist_ok=True)
    
    log("=" * 70)
    log("DESCARGADOR VOA LEARNING ENGLISH")
    log("=" * 70)
    log("Carpeta base: " + BASE_DIR)
    log("")
    
    if arg in config["fases"]:
        fase = config["fases"][arg]
        log("FASE: " + arg + " - " + fase["descripcion"])
        log("Programas: " + ", ".join(fase["programas"]))
        log("")
        
        for prog_id in fase["programas"]:
            if prog_id in config["programas"]:
                procesar_programa(prog_id, config["programas"][prog_id], progreso)
    elif arg in config["programas"]:
        procesar_programa(arg, config["programas"][arg], progreso)
    else:
        log("Opcion no reconocida: " + arg)
        sys.exit(1)
    
    # Resumen final
    log("")
    log("=" * 70)
    log("RESUMEN")
    log("=" * 70)
    total = len(progreso["episodios"])
    completos = sum(1 for e in progreso["episodios"].values() if e.get("completo"))
    log("Episodios registrados: " + str(total))
    log("Episodios completos: " + str(completos))
    log("Progreso guardado en: " + PROGRESO_FILE)

if __name__ == "__main__":
    main()
