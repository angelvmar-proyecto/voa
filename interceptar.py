import time
import json
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
opts.add_argument("--lang=en-US")
opts.set_capability("goog:loggingPrefs", {"performance": "ALL"})

service = Service(driver_path)
driver = webdriver.Chrome(service=service, options=opts)

driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
    "source": """
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
        Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
    """
})

url = "https://learningenglish.voanews.com/a/8006750.html"
print("Navegando a: " + url)
driver.get(url)

print("Esperando 25 segundos...")
time.sleep(25)

driver.execute_script("window.scrollTo(0, 500)")
time.sleep(3)
driver.execute_script("window.scrollTo(0, 1500)")
time.sleep(3)
driver.execute_script("window.scrollTo(0, 3000)")
time.sleep(3)

print("Extrayendo peticiones de red...")
logs = driver.get_log("performance")
print("Total peticiones capturadas: " + str(len(logs)))

urls_interesantes = []
for entry in logs:
    try:
        msg = json.loads(entry["message"])["message"]
        if msg["method"] == "Network.responseReceived":
            resp = msg["params"]["response"]
            u = resp.get("url", "")
            mime = resp.get("mimeType", "")
            status = resp.get("status", 0)
            
            if ("json" in mime.lower()
                or "xml" in mime.lower()
                or "/api/" in u
                or "content" in u.lower()
                or "article" in u.lower()
                or "lesson" in u.lower()
                or "story" in u.lower()
                or "transcript" in u.lower()
                or "8006750" in u):
                urls_interesantes.append({
                    "url": u,
                    "mime": mime,
                    "status": status,
                    "size": resp.get("encodedDataLength", 0)
                })
    except Exception as e:
        pass

with open("peticiones_red.txt", "w", encoding="utf-8") as f:
    f.write("Total peticiones: " + str(len(logs)) + "\n\n")
    f.write("=== URLs de interes ===\n")
    for item in urls_interesantes:
        f.write("[{status}] {mime} ({size} bytes)\n  {url}\n\n".format(**item))

print("Guardado en peticiones_red.txt")
print("URLs de interes: " + str(len(urls_interesantes)))
print("")
print("=== PRIMERAS 30 URLs DE INTERES ===")
for item in urls_interesantes[:30]:
    print("[" + str(item["status"]) + "] " + item["mime"])
    print("    " + item["url"][:250])
    print("")

driver.quit()
