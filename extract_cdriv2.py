from cdriv import CDriv
import time

url = "https://learningenglish.voanews.com/a/8006750.html"

with CDriv() as driver:
    driver.new_session()
    
    # User-Agent de Chrome Android real
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    print("Navegando a: " + url)
    driver.navigate(url)

    print("Esperando 20 segundos...")
    time.sleep(20)
    
    # Scroll para disparar lazy loading
    print("Haciendo scroll...")
    for i in range(5):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight * " + str((i+1)/5) + ")")
        time.sleep(1)
    
    time.sleep(5)

    html = driver.get_page_source()
    print("HTML recibido: " + str(len(html)) + " chars")

    with open("voa_render2.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Guardado en voa_render2.html")

    # Buscar el articulo en varios sitios
    checks = ["Springtime", "renewal", "bloom", "tedious", "on-the-go", "Words in This Story", "wsw", "article-body", "transcript"]
    for term in checks:
        if term in html:
            print("OK contiene: " + term)
        else:
            print("NO contiene: " + term)

    driver.close()
