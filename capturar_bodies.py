import time
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

chrome_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
driver_path = "/data/data/com.termux/files/usr/bin/chromedriver"

opts = Options()
opts.binary_location = chrome_path
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-gpu")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--window-size=1920,1080")
opts.add_argument("--user-agent=Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
opts.add_argument("--disable-blink-features=AutomationControlled")
opts.set_capability("goog:loggingPrefs", {"performance": "ALL"})

service = Service(driver_path)
driver = webdriver.Chrome(service=service, options=opts)

url = "https://learningenglish.voanews.com/a/8006750.html"
print("Navegando...")
driver.get(url)

# Instalar interceptor ANTES del scroll
driver.execute_cdp_cmd("Network.enable", {})

print("Esperando 25s...")
time.sleep(25)
driver.execute_script("window.scrollTo(0, 1500)")
time.sleep(3)
driver.execute_script("window.scrollTo(0, 3000)")
time.sleep(3)

# Obtener todos los logs
logs = driver.get_log("performance")
print("Logs capturados: " + str(len(logs)))

# Recolectar requestIds que hayan devuelto JSON o JS de VOA
request_ids = {}
for entry in logs:
    try:
        msg = json.loads(entry["message"])["message"]
        if msg["method"] == "Network.responseReceived":
            params = msg["params"]
            resp = params["response"]
            u = resp.get("url", "")
            mime = resp.get("mimeType", "")
            status = resp.get("status", 0)
            req_id = params["requestId"]
            
            # Solo learningenglish.voanews.com y mime json/js
            if ("learningenglish.voanews.com" in u 
                and ("json" in mime.lower() or "javascript" in mime.lower())
                and status == 200):
                request_ids[req_id] = {"url": u, "mime": mime, "size": resp.get("encodedDataLength", 0)}
    except Exception as e:
        pass

print("Respuestas JSON/JS de VOA: " + str(len(request_ids)))

# Guardar cada body
os.makedirs("bodies", exist_ok=True)
interesantes = 0

with open("bodies_index.txt", "w", encoding="utf-8") as idx:
    for i, (req_id, info) in enumerate(request_ids.items()):
        try:
            body_result = driver.execute_cdp_cmd("Network.getResponseBody", {"requestId": req_id})
            body = body_result.get("body", "")
            base64_encoded = body_result.get("base64Encoded", False)
            
            if base64_encoded:
                import base64
                body = base64.b64decode(body).decode("utf-8", errors="replace")
            
            # Nombre del archivo
            url_safe = info["url"].split("/")[-1].split("?")[0][:40]
            if not url_safe:
                url_safe = "body_" + str(i)
            filename = "bodies/" + str(i).zfill(3) + "_" + url_safe + ".txt"
            
            with open(filename, "w", encoding="utf-8") as f:
                f.write("URL: " + info["url"] + "\n")
                f.write("MIME: " + info["mime"] + "\n")
                f.write("SIZE: " + str(len(body)) + " chars\n")
                f.write("=" * 60 + "\n\n")
                f.write(body)
            
            # Buscar si contiene el texto del articulo
            contiene = "Springtime" in body or "renewal" in body or "Words in This Story" in body
            
            idx.write("[" + str(i) + "] " + info["mime"] + " (" + str(len(body)) + " chars)")
            if contiene:
                idx.write(" ** CONTIENE TEXTO **")
                interesantes += 1
            idx.write("\n    " + info["url"][:200] + "\n\n")
            
        except Exception as e:
            pass

print("Cuerpos guardados en carpeta bodies/")
print("Respuestas que contienen el articulo: " + str(interesantes))

driver.quit()
