# Actualiza la ruta de descarga en descargar_voa.py
import re

with open("descargar_voa.py", "r", encoding="utf-8") as f:
    contenido = f.read()

# Cambiar la ruta base por una accesible en Termux
viejo = '''BASE_DIR = "/data/data/com.termux/files/home/storage/shared/Android/data/com.angelvmar.voa/files"
if not os.path.exists(os.path.dirname(BASE_DIR)):
    # Fallback: usar carpeta local si no existe la del telefono
    BASE_DIR = os.path.expanduser("~/voa_descargas")'''

nuevo = '''# Guardamos en Descargas, que si es accesible desde Termux
BASE_DIR = "/data/data/com.termux/files/home/storage/shared/Download/MiInglesVOA"
os.makedirs(BASE_DIR, exist_ok=True)'''

contenido = contenido.replace(viejo, nuevo)

with open("descargar_voa.py", "w", encoding="utf-8") as f:
    f.write(contenido)

print("✅ Ruta actualizada a: Download/MiInglesVOA")
