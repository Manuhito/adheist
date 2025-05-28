# Comando fetch_apify_ads

Este comando permite obtener anuncios de Facebook a través de la API de Apify y guardarlos en un archivo JSON para su posterior análisis o integración en la aplicación.

## Requisitos

- Django 3.x o superior
- Paquete `apify-client` instalado
- Token de API de Apify válido

## Instalación

El comando ya está instalado como parte de la aplicación Django. No se requiere ninguna instalación adicional.

## Uso básico

```bash
python manage.py fetch_apify_ads
```

Este comando utilizará los valores predeterminados para obtener anuncios relacionados con la palabra clave "digital" desde 2018 hasta la fecha actual.

## Opciones disponibles

| Opción | Descripción | Valor predeterminado |
|--------|-------------|----------------------|
| `--keyword` | Palabra clave para buscar anuncios | `digital` |
| `--country` | País para filtrar anuncios | `ALL 🌍` |
| `--maxitems` | Número máximo de elementos a obtener | `40` |
| `--start-date` | Fecha de inicio para los anuncios (YYYY-MM-DD) | `2018-05-09` |
| `--end-date` | Fecha de fin para los anuncios (YYYY-MM-DD) | Fecha actual |
| `--output` | Ruta del archivo de salida | `apify_ads_KEYWORD_YYYY-MM-DD_HH-MM-SS.json` en la carpeta `apify-files` |

## Ejemplos de uso

### Obtener anuncios con valores predeterminados

```bash
python manage.py fetch_apify_ads
```

### Personalizar la palabra clave y el número máximo de elementos

```bash
python manage.py fetch_apify_ads --keyword=marketing --maxitems=100
```

### Especificar un rango de fechas personalizado

```bash
python manage.py fetch_apify_ads --start-date=2023-01-01 --end-date=2023-12-31
```

### Guardar resultados en una ubicación específica

```bash
python manage.py fetch_apify_ads --output=/ruta/personalizada/resultados.json
```

### Importar anuncios desde un archivo JSON

```bash
python manage.py import_apify_ads apify-files/apify_ads_KEYWORD_YYYY-MM-DD_HH-MM-SS.json
```

### Combinar múltiples opciones

```bash
python manage.py fetch_apify_ads --keyword=ecommerce --country="United States" --start-date=2024-01-01 --maxitems=200 --output=apify-files/ecommerce_us_ads.json
```

## Formato de salida

El comando genera un archivo JSON con un array de objetos, donde cada objeto representa un anuncio con la siguiente estructura:

```json
[
  {
    "page_name": "Nombre de la página",
    "ad_id": "123456789",
    "ad_text": "Texto del anuncio",
    "images": [
      {
        "src": "URL de la imagen"
      }
    ],
    "category": "Categoría del anuncio",
    "ad_type": "Tipo de anuncio",
    // Otros campos proporcionados por la API de Apify
  },
  // Más anuncios...
]
```

## Notas adicionales

- El token de API de Apify está configurado directamente en el código. Si necesitas cambiar el token, edita el archivo `fetch_apify_ads.py`.
- Para obtener mejores resultados, utiliza palabras clave específicas y rangos de fechas acotados.
- Los resultados se guardan con indentación para facilitar su lectura.
- Los archivos JSON se guardan automáticamente en la carpeta `apify-files` en la raíz del proyecto.
- Para importar anuncios, usa el comando `import_apify_ads` seguido de la ruta al archivo JSON dentro de la carpeta `apify-files`.
