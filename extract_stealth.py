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
opts.add_argument("--disable-blink-features=AutomationControlled")
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_experimental_option("useAutomationExtension", False)
opts.add_argument("--lang=en-US")

service = Service(driver_path)
driver = webdriver.Chrome(service=service, options=opts)

# Ocultar webdriver
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

print("Esperando 15 segundos...")
time.sleep(15)

# Scroll para cargar lazy content
driver.execute_script("window.scrollTo(0, 800)")
time.sleep(3)
driver.execute_script("window.scrollTo(0, 1600)")
time.sleep(3)

html = driver.page_source
print("HTML: " + str(len(html)) + " chars")

with open("voa_stealth.html", "w", encoding="utf-8") as f:
    f.write(html)

checks = ["Springtime", "renewal", "Words in This Story", "wsw", "content-offset", "article-content"]
for term in checks:
    if term in html:
        print("OK contiene: " + term)
    else:
        print("NO contiene: " + term)

driver.quit()
