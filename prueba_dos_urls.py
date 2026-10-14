import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

chrome_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
driver_path = "/data/data/com.termux/files/usr/bin/chromedriver"

def probar_url(driver, url):
    print("")
    print("=" * 70)
    print("URL: " + url)
    driver.get(url)
    time.sleep(12)
    html = driver.page_source
    print("HTML: " + str(len(html)) + " chars")
    print("URL final: " + driver.current_url)
    
    tiene_texto = "Springtime" in html or "renewal" in html
    tiene_wsw = 'class="wsw"' in html or 'class="wsw ' in html
    
    print("Contiene texto del articulo: " + ("SI" if tiene_texto else "NO"))
    print("Contiene <div class=wsw>: " + ("SI" if tiene_wsw else "NO"))
    return tiene_texto

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

# URL 1: la que funciona (slug + withmediaplayer)
probar_url(driver, "https://learningenglish.voanews.com/a/watching-the-grass-grow-is-not-fun/8003108.html?withmediaplayer=1")

# URL 2: la que da el RSS (solo ID) + withmediaplayer
probar_url(driver, "https://learningenglish.voanews.com/a/8006750.html?withmediaplayer=1")

# URL 3: URL corta del RSS SIN withmediaplayer (la que fallaba)
probar_url(driver, "https://learningenglish.voanews.com/a/8006750.html")

driver.quit()
