Procesador de Artículos con IA

Este script automatiza el proceso de descargar el contenido de artículos web, reescribirlos utilizando la API de Anthropic (Claude) según una guía de estilo específica, y guardar los resultados.

Características

- Descarga de Contenido: Extrae el texto de artículos a partir de una lista de URLs.
- Extracción Inteligente: Identifica y extrae encabezados (H1-H6) y párrafos (p), conservando la estructura.
- Reescritura con IA: Utiliza un modelo de lenguaje de Anthropic (Claude) para reescribir el contenido basándose en un prompt de sistema detallado que define el tono, estilo y formato.
- Gestión de Costes: Calcula y muestra el coste estimado de cada llamada a la API de Claude.
- Registro Detallado: Guarda logs de cada operación, incluyendo el prompt enviado, el uso de tokens y el coste.
- Organización de Archivos: Almacena el contenido original, los artículos procesados y los logs en directorios separados para una fácil gestión.

Requisitos Previos

- Python 3.7 o superior.
- Una clave de API de Anthropic.

Instalación

1. Clonar el repositorio (si aplica) o descargar los archivos.

2. Crear un entorno virtual (recomendado):
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate

3. Instalar las dependencias:
   pip install -r requirements.txt

Configuración

1. Configurar la API Key de Anthropic:
   El script requiere que tu clave de API de Anthropic esté configurada como una variable de entorno. Puedes hacerlo de la siguiente manera en tu terminal:
   export ANTHROPIC_API_KEY="tu_api_key_aqui"

   *Recuerda reemplazar "tu_api_key_aqui" con tu clave real. Para que la variable sea permanente, añádela al archivo de configuración de tu shell (ej. .zshrc, .bash_profile).*

2. Añadir las URLs a procesar:
   Abre el archivo `process_articles.py` y modifica la lista `URLS_TO_PROCESS` para incluir las URLs de los artículos que deseas procesar.

   URLS_TO_PROCESS = [
       "https://www.ejemplo.com/tu-articulo-1",
       "https://www.ejemplo.com/tu-articulo-2"
       # Añade más URLs aquí
   ]

Uso

Una vez completada la instalación y configuración, ejecuta el script desde tu terminal:

python process_articles.py

El script comenzará a procesar cada URL de la lista. Verás en la consola el progreso de la descarga, el envío a la API y el resumen de costes.

Estructura de Archivos de Salida

El script creará automáticamente los siguientes directorios en la raíz del proyecto:

- contenido_descargado/: Contiene los archivos de texto (.txt) del contenido original extraído de cada URL. Los encabezados se prefijan con su etiqueta (ej. <h2>).
- articulos_procesados/: Contiene los artículos finales reescritos por la IA.
- logs_claude/: Contiene los logs de cada llamada a la API, incluyendo el prompt completo, el uso de tokens y el coste detallado. Esto es útil para depuración y control de gastos.
