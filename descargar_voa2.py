#!/usr/bin/env python3
"""
Descargador masivo de VOA Learning English - Version sin Chromium.
Usa solo requests + BeautifulSoup. 30x mas rapido.
"""

import os
import sys
import json
import time
import re
import requests
from bs4 import BeautifulSoup

# ==== CONFIGURACION ====
BASE_DIR = "/data/data/com.termux/files/home/storage/shared/Download/MiInglesVOA"
AUDIO_DIR = os.path.join(BASE_DIR, "audios")
TEXTO_DIR = os.path.join(BASE_DIR, "textos")
PROGRESO_FILE = os.path.join(BASE_DIR, "progreso2.json")

UA = "Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

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
    return cargar_json(PROGRESO_FILE, {"episodios": {}})

def guardar_progreso(p):
    guardar_json(PROGRESO_FILE, p)

# ==== DESCARGAR ====
def descargar_html(url):
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    return r.text

# ==== EPISODIOS DE UN FEED ====

def decodificar_entidades(s):
    if not s:
        return ""
    return (s.replace("&apos;", "'")
             .replace("&#0?39;", "'")
             .replace("&quot;", '"')
             .replace("&amp;", "&")
             .replace("&lt;", "<")
             .replace("&gt;", ">")
             .replace("&nbsp;", " ")
             .replace("&mdash;", "-")
             .replace("&ndash;", "-")
             .replace("&hellip;", "..."))

def episodios_de_feed(url_feed):
    xml = descargar_html(url_feed)
    items = re.findall(r'<item[\s>][\s\S]*?</item>', xml)
    episodios = []
    for it in items:
        t = re.search(r'<title>([\s\S]*?)</title>', it)
        link = re.search(r'<link>([\s\S]*?)</link>', it)
        pub = re.search(r'<pubDate>([\s\S]*?)</pubDate>', it)
        if not t:
            continue
        titulo = t.group(1).replace('<![CDATA[', '').replace(']]>', '').strip()
        titulo = decodificar_entidades(titulo)
        episodios.append({
            "titulo": titulo,
            "pagina": link.group(1).strip() if link else None,
            "fecha": pub.group(1).strip() if pub else ''
        })
    # Eliminar duplicados por titulo (quedarse con el que tiene slug en la URL)
    vistos = {}
    unicos = []
    for e in episodios:
        t = e["titulo"].lower()
        url = e.get("pagina") or ""
        # Preferir URLs con slug (tienen letras despues de /a/)
        tiene_slug = bool(re.search(r'/a/[a-z0-9-]+/', url))
        if t not in vistos:
            vistos[t] = e
            vistos[t]["_slug"] = tiene_slug
        elif tiene_slug and not vistos[t].get("_slug"):
            vistos[t] = e
            vistos[t]["_slug"] = True
    for e in vistos.values():
        e.pop("_slug", None)
        unicos.append(e)
    return unicos

def episodios_de_indice(url_indice):
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
        episodios.append({"titulo": texto, "pagina": full, "fecha": ""})
    def num(e):
        m = re.search(r'(\d+)', e["titulo"])
        return int(m.group(1)) if m else 999
    episodios.sort(key=num)
    return episodios

# ==== EXTRAER TEXTO Y MP3 DE UNA PAGINA ====
def extraer_pagina(url):
    """Devuelve (texto, mp3_url_128kbps, mp3_url_64kbps)."""
    if not url:
        return "", None, None
    # Agregar parametro magico
    if "?withmediaplayer=1" not in url:
        url = url + ("&" if "?" in url else "?") + "withmediaplayer=1"
    
    try:
        html = descargar_html(url)
    except Exception as e:
        log("  Error HTTP: " + str(e)[:80])
        return "", None, None
    
    soup = BeautifulSoup(html, "html.parser")
    wsw = soup.find("div", class_="wsw")
    
    texto = ""
    if wsw:
        t = wsw.get_text("\n", strip=True)
        lineas = [l.strip() for l in t.split("\n") if len(l.strip()) > 3]
        texto = "\n\n".join(lineas)
    
    # Buscar MP3 (128 = hq, 64 = normal)
    mp3_128 = None
    mp3_64 = None
    for m in re.findall(r'(https?://[^\s"\'<>\\&]+\.mp3)', html):
        if "_hq" in m and not mp3_128:
            mp3_128 = m
        elif "_hq" not in m and not mp3_64:
            mp3_64 = m
    
    return texto, mp3_128, mp3_64

# ==== DESCARGAR MP3 ====
def descargar_mp3(url, destino):
    if os.path.exists(destino) and os.path.getsize(destino) > 10000:
        return True
    try:
        r = requests.get(url, headers={"User-Agent": UA}, stream=True, timeout=120)
        r.raise_for_status()
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'wb') as f:
            for chunk in r.iter_content(chunk_size=16384):
                f.write(chunk)
        return True
    except Exception as e:
        log("  Error MP3: " + str(e)[:80])
        return False

# ==== PROCESAR EPISODIO ====
def procesar_episodio(prog_id, episodio, num, total, progreso):
    titulo = episodio["titulo"]
    slug = slugify(titulo)
    nombre_base = "l" + str(num).zfill(4) + "_" + slug
    
    audio_path = os.path.join(AUDIO_DIR, prog_id, nombre_base + ".mp3")
    texto_path = os.path.join(TEXTO_DIR, prog_id, nombre_base + ".txt")
    clave = prog_id + "/" + nombre_base
    
    # Ya completo?
    if clave in progreso["episodios"] and progreso["episodios"][clave].get("completo"):
        return True
    
    log("  [" + str(num) + "/" + str(total) + "] " + titulo[:70])
    
    estado = progreso["episodios"].get(clave, {})
    estado["titulo"] = titulo
    estado["fecha"] = episodio.get("fecha", "")
    
    # Extraer texto y MP3 de la pagina
    texto = ""
    mp3_url = None
    
    if episodio.get("pagina"):
        texto, mp3_128, mp3_64 = extraer_pagina(episodio["pagina"])
        mp3_url = mp3_128 or mp3_64
        if mp3_url:
            estado["mp3_url"] = mp3_url
    
    # Guardar audio
    if mp3_url:
        if not os.path.exists(audio_path):
            if descargar_mp3(mp3_url, audio_path):
                estado["audio_completo"] = True
            else:
                estado["audio_completo"] = False
        else:
            estado["audio_completo"] = True
    
    # Guardar texto
    if texto and len(texto) > 200:
        os.makedirs(os.path.dirname(texto_path), exist_ok=True)
        with open(texto_path, 'w', encoding='utf-8') as f:
            f.write(texto)
        estado["texto_completo"] = True
        estado["chars_texto"] = len(texto)
    else:
        estado["sin_texto"] = True
    
    estado["completo"] = estado.get("audio_completo", False)
    progreso["episodios"][clave] = estado
    guardar_progreso(progreso)
    
    return estado.get("completo", False)

# ==== PROCESAR PROGRAMA ====
def procesar_programa(prog_id, config_prog, progreso):
    log("")
    log("=" * 70)
    log("PROGRAMA: " + config_prog["nombre"])
    log("=" * 70)
    
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
        return
    
    exitos = 0
    for i, ep in enumerate(episodios, 1):
        try:
            if procesar_episodio(prog_id, ep, i, total, progreso):
                exitos += 1
        except Exception as e:
            log("  Error: " + str(e)[:100])
        
        # Pausa cada 10 para no saturar
        if i % 10 == 0:
            time.sleep(1)
    
    log("")
    log("Programa terminado: " + str(exitos) + "/" + str(total))

# ==== MAIN ====
def main():
    if len(sys.argv) < 2:
        print("Uso: python descargar_voa2.py [1a|1b|1c|1d|todo|programa_id]")
        sys.exit(1)
    
    arg = sys.argv[1]
    config = cargar_json("voa_config.json")
    progreso = cargar_progreso()
    
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(TEXTO_DIR, exist_ok=True)
    
    log("=" * 70)
    log("DESCARGADOR VOA (sin Chromium)")
    log("=" * 70)
    log("Carpeta: " + BASE_DIR)
    log("")
    
    if arg in config["fases"]:
        fase = config["fases"][arg]
        log("FASE: " + arg + " - " + fase["descripcion"])
        log("")
        for prog_id in fase["programas"]:
            if prog_id in config["programas"]:
                procesar_programa(prog_id, config["programas"][prog_id], progreso)
    elif arg in config["programas"]:
        procesar_programa(arg, config["programas"][arg], progreso)
    else:
        log("Opcion no reconocida: " + arg)
        sys.exit(1)
    
    # Resumen
    log("")
    log("=" * 70)
    log("RESUMEN")
    log("=" * 70)
    total = len(progreso["episodios"])
    completos = sum(1 for e in progreso["episodios"].values() if e.get("completo"))
    con_texto = sum(1 for e in progreso["episodios"].values() if e.get("texto_completo"))
    log("Total: " + str(total))
    log("Completos: " + str(completos))
    log("Con texto: " + str(con_texto))

if __name__ == "__main__":
    main()
