#!/bin/bash
# Uso: ./descargar_leccion.sh "URL_DE_LA_LECCION"
URL="$1"
if [ -z "$URL" ]; then
  echo "❌ Debes pasar la URL de la lección entre comillas."
  echo "   Ejemplo: ./descargar_leccion.sh \"https://learningenglish.voanews.com/a/...\""
  exit 1
fi

echo "⏳ Descargando página..."
curl -sL -A "Mozilla/5.0" "$URL" -o leccion.html

# Extraer el título
TITULO=$(grep -o '<title>[^<]*' leccion.html | sed 's/<title>//' | head -1)
[ -z "$TITULO" ] && TITULO="Lección VOA"

echo "📄 Título: $TITULO"

# Extraer el texto del artículo (quitando scripts, estilos y etiquetas HTML)
sed -e 's/<script[^>]*>.*<\/script>//g' \
    -e 's/<style[^>]*>.*<\/style>//g' \
    -e 's/<[^>]*>/ /g' \
    leccion.html | tr -s ' \n' ' \n' | grep -v '^ *$' > texto_crudo.txt

# Convertir saltos de línea a \n para el JSON
TEXTO=$(awk '{printf "%s\\n", $0}' texto_crudo.txt)

# Crear el archivo lecciones.json
cat > lecciones.json << JSON_EOF
[
  {
    "titulo": "$TITULO",
    "texto": "$TEXTO",
    "audio": "audios/leccion1.mp3"
  }
]
JSON_EOF

echo "✅ Listo. Archivos generados: leccion.html, texto_crudo.txt, lecciones.json"
echo "⚠️  Revisa 'texto_crudo.txt' para asegurarte de que el texto sea el correcto."
echo "   Si es así, renómbralo a 'audios/leccion1.mp3' manualmente."
echo "   (El MP3 no se puede descargar automáticamente con este script, hazlo con el navegador)."
