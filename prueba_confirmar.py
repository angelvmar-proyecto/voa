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

url = "https://learningenglish.voanews.com/a/wilbur-and-orville-wright-the-first-airplane/7998765.html?withmediaplayer=1"
print("Probando URL del feed de Science & Tech")
driver.get(url)
time.sleep(15)

html = driver.page_source
print("HTML: " + str(len(html)) + " chars")

with open("confirmacion.html", "w", encoding="utf-8") as f:
    f.write(html)

checks = ["Wilbur", "Orville", "Wright", "wsw"]
for term in checks:
    if term in html:
        print("*** OK contiene: " + term)
    else:
        print("    NO contiene: " + term)

driver.quit()
