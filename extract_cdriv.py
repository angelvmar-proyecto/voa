from cdriv import CDriv
import time

url = "https://learningenglish.voanews.com/a/8006750.html"

with CDriv() as driver:
    driver.new_session()
    print("Navegando a: " + url)
    driver.navigate(url)

    # Esperar a que cargue el JS de VOA
    print("Esperando 10 segundos...")
    time.sleep(10)

    html = driver.get_page_source()
    print("HTML recibido: " + str(len(html)) + " chars")

    # Guardar para inspeccionar
    with open("voa_render.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Guardado en voa_render.html")

    if "Springtime is a time of renewal" in html:
        print("OK: EL TEXTO DEL ARTICULO ESTA EN EL HTML RENDERIZADO")
    else:
        print("FALLO: El texto del articulo NO aparece")

    if "content-offset" in html:
        print("OK: contiene content-offset")
    if ".wsw" in html or "wsw" in html:
        print("OK: contiene wsw")
    if "article-content" in html:
        print("OK: contiene article-content")

    driver.close()
