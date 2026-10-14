import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

chrome_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
driver_path = "/data/data/com.termux/files/usr/bin/chromedriver"

def probar(driver, url):
    print("")
    print("=" * 70)
    print("URL: " + url)
    driver.get(url)
    time.sleep(15)
    html = driver.page_source
    tiene_texto = "Springtime" in html or "renewal" in html
    tiene_wsw = 'class="wsw"' in html
    print("HTML: " + str(len(html)) + " chars")
    print("Contiene texto: " + ("SI" if tiene_texto else "NO"))
    print("Contiene .wsw: " + ("SI" if tiene_wsw else "NO"))
    return html

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

# URLs reales del RSS (con slug) + el parametro
urls = [
    "https://learningenglish.voanews.com/a/what-does-it-mean-to-mushroom/8008674.html?withmediaplayer=1",
    "https://learningenglish.voanews.com/a/green-means-spring-and-other-things/8001669.html?withmediaplayer=1",
]

for u in urls:
    probar(driver, u)

driver.quit()
