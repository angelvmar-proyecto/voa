import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    url = "https://learningenglish.voanews.com/a/8006750.html"
    
    # Ruta al Chromium instalado en Termux
    chromium_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
    if not os.path.exists(chromium_path):
        # Intentar otras rutas comunes
        for p in ["/data/data/com.termux/files/usr/bin/chromium",
                  "/data/data/com.termux/files/usr/bin/chromium-browser"]:
            if os.path.exists(p):
                chromium_path = p
                break
    
    print("Usando Chromium en: " + chromium_path)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executablePath=chromium_path,
            headless=True,
            args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
        )
        page = await browser.new_page()
        
        print("Cargando pagina...")
        await page.goto(url, wait_until="networkidle", timeout=60000)
        
        # Esperar a que el articulo este renderizado
        try:
            await page.wait_for_selector("#article-content", timeout=15000)
        except:
            print("No se encontro #article-content, intentando de todos modos...")
        
        # Extraer el texto de los parrafos dentro del contenedor del articulo
        texto = await page.evaluate('''() => {
            const el = document.querySelector("#article-content .wsw") 
                    || document.querySelector("#article-content") 
                    || document.querySelector(".content-offset")
                    || document.body;
            return el ? el.innerText : "";
        }''')
        
        print("--- TEXTO EXTRAIDO (" + str(len(texto)) + " chars) ---")
        print(texto[:3000])
        print("--- FIN ---")
        
        await browser.close()

asyncio.run(main())
