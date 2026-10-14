import sys
sys.path.insert(0, '.')
from descargar_voa import episodios_de_feed, procesar_episodio, cargar_progreso, guardar_progreso, AUDIO_DIR, TEXTO_DIR

print("=" * 60)
print("PRUEBA: 3 episodios de Science & Technology")
print("=" * 60)
print("Guardando en: " + AUDIO_DIR)
print("")

progreso = cargar_progreso()

episodios = episodios_de_feed("https://learningenglish.voanews.com/api/zmg_pe$myp")
print("Total episodios en el feed: " + str(len(episodios)))
print("")

# Tomar solo los primeros 3
prueba = episodios[:3]

for i, ep in enumerate(prueba, 1):
    procesar_episodio("science_tech", "Science & Technology", ep, i, 3, progreso)

guardar_progreso(progreso)

print("")
print("=" * 60)
print("PRUEBA COMPLETADA")
print("=" * 60)

# Verificar archivos creados
import os
audio_path = os.path.join(AUDIO_DIR, "science_tech")
texto_path = os.path.join(TEXTO_DIR, "science_tech")

if os.path.exists(audio_path):
    print("Audios descargados: " + str(len(os.listdir(audio_path))))
if os.path.exists(texto_path):
    print("Textos extraidos: " + str(len(os.listdir(texto_path))))
