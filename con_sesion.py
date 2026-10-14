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

driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
    "source": """
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
        Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
        window.chrome = { runtime: {} };
    """
})

print("PASO 1: Navegando a la home...")
driver.get("https://learningenglish.voanews.com/")
time.sleep(8)
print("URL actual: " + driver.current_url)
print("Cookies: " + str(len(driver.get_cookies())))

print("")
print("PASO 2: Navegando a Words & Their Stories...")
driver.get("https://learningenglish.voanews.com/z/987")
time.sleep(8)
print("Cookies ahora: " + str(len(driver.get_cookies())))

print("")
print("PASO 3: Navegando al articulo...")
driver.get("https://learningenglish.voanews.com/a/8006750.html")
time.sleep(20)

# Scroll
for i in range(5):
    driver.execute_script("window.scrollTo(0, " + str((i+1)*800) + ")")
    time.sleep(2)

html = driver.page_source
print("HTML: " + str(len(html)) + " chars")

with open("voa_sesion.html", "w", encoding="utf-8") as f:
    f.write(html)

checks = ["Springtime", "renewal", "bloom", "tedious", "Words in This Story", "wsw", "article-body"]
for term in checks:
    if term in html:
        print("*** OK contiene: " + term)
    else:
        print("    NO contiene: " + term)

# Mostrar cookies
print("")
print("=== COOKIES FINALES ===")
for c in driver.get_cookies():
    print(c.get("name") + " = " + str(c.get("value"))[:60])

driver.quit()
