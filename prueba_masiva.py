import time
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
opts.add_argument("--lang=en-US")
opts.add_argument("--disable-blink-features=AutomationControlled")

service = Service(driver_path)
driver = webdriver.Chrome(service=service, options=opts)

# 5 URLs de prueba del feed de Science & Tech
urls = [
    "https://learningenglish.voanews.com/a/wilbur-and-orville-wright-the-first-airplane/7998765.html",
    "https://learningenglish.voanews.com/a/methods-for-protecting-earth-against-an-asteroid-strike/7989189.html",
    "https://learningenglish.voanews.com/a/total-lunar-eclipse-to-turn-moon-red/8005741.html",
    "https://learningenglish.voanews.com/a/study-shows-how-earth-s-orbit-affects-ice-ages/7997495.html",
    "https://learningenglish.voanews.com/a/scientists-link-gene-to-human-speech/7985890.html",
]

exitosos = 0
fallidos = 0

for i, base_url in enumerate(urls, 1):
    url = base_url + "?withmediaplayer=1"
    print("")
    print("=" * 60)
    print("[" + str(i) + "/5] " + base_url.split("/")[-1][:50])
    print("=" * 60)
    
    try:
        driver.get(url)
        time.sleep(12)
        html = driver.page_source
        
        # Buscar el contenedor .wsw
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        wsw = soup.find("div", class_="wsw")
        
        if wsw:
            texto = wsw.get_text("\n", strip=True)
            # Limpiar lineas vacias
            lineas = [l.strip() for l in texto.split("\n") if len(l.strip()) > 3]
            texto_limpio = "\n\n".join(lineas)
            
            if len(texto_limpio) > 200:
                print("*** EXITO: " + str(len(texto_limpio)) + " chars")
                print("    Preview: " + texto_limpio[:100].replace("\n", " ") + "...")
                exitosos += 1
            else:
                print("FALLO: texto muy corto (" + str(len(texto_limpio)) + " chars)")
                fallidos += 1
        else:
            print("FALLO: no encontro .wsw")
            fallidos += 1
    except Exception as e:
        print("FALLO: " + str(e)[:100])
        fallidos += 1

print("")
print("=" * 60)
print("RESUMEN: " + str(exitosos) + " exitos, " + str(fallidos) + " fallos")
print("=" * 60)

driver.quit()
