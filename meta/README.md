# Meta Ad Library API Fetcher

Script para consultar la API de Meta Ad Library usando una lista de IDs de páginas desde un archivo CSV y guardar los resultados en formato JSON.

## Requisitos

- Python 3.6 o superior
- Paquete `requests` de Python

Para instalar las dependencias:

```bash
pip install requests
```

## Preparación

1. **Token de acceso**: Necesitarás un token de acceso válido para la API de Meta. Puedes obtenerlo desde [Meta for Developers](https://developers.facebook.com/).

2. **Archivo CSV**: Prepara un archivo CSV con los IDs de las páginas que quieres consultar. Cada ID debe estar en una línea separada.

   Ejemplo (`page_ids_example.csv`):
   ```
   820882001277849
   2020587948180288
   102814038776857
   ...
   ```

## Uso

Ejecuta el script con los siguientes parámetros:

```bash
python fetch_meta_ads.py --csv RUTA_AL_CSV --token TU_TOKEN_DE_ACCESO [opciones]
```

### Parámetros obligatorios

- `--csv`: Ruta al archivo CSV con los IDs de página
- `--token`: Token de acceso para la API de Meta

### Parámetros opcionales

- `--countries`: Lista de países donde se muestran los anuncios (por defecto: US, GB)
- `--languages`: Lista de idiomas del contenido (por defecto: EN)
- `--media-types`: Tipos de medios a incluir (por defecto: MEME, IMAGE)
- `--fields`: Campos a incluir en la respuesta
- `--limit`: Número máximo de anuncios por página (por defecto: 100)
- `--output`: Ruta de salida para el archivo JSON (por defecto: meta_ads_YYYYMMDD_HHMMSS.json)

## Ejemplos

### Ejemplo básico

```bash
python fetch_meta_ads.py --csv page_ids_example.csv --token EAAgZBpjGewbsBO374pWC6ZAFpCcrpSLd81xZBGeS99dknygGF6OW6dJ4gvSG6DtLZAKx6uYogFxwAPD7M7eWKJywdPTtZBFCKuz6ttuKV1TNUXZBgPpKqpjYIZAxiKiPKYkHx6DKpIHdDeBYsQ34qKBRQLnBkZCHfVMEKXk3i4BeQ5WsP2oAFVpugveEtQJo8NH8f1QRaFP7ZBuBfQIMt5HnplEHn9FyQ22e61Ho5XcGCc3A9ZA1PfDQQZD
```

### Personalizar países y idiomas

```bash
python fetch_meta_ads.py --csv page_ids_example.csv --token TU_TOKEN --countries ES MX --languages ES
```

### Especificar campos personalizados

```bash
python fetch_meta_ads.py --csv page_ids_example.csv --token TU_TOKEN --fields "page_name,ad_creative_bodies,ad_snapshot_url,impressions,spend"
```

### Guardar en un archivo específico

```bash
python fetch_meta_ads.py --csv page_ids_example.csv --token TU_TOKEN --output mis_anuncios.json
```

## Notas importantes

1. La API de Meta Ad Library tiene límites de tasa. El script incluye pausas entre llamadas para evitar errores.

2. Se pueden enviar hasta 10 IDs de página en una sola llamada a la API. El script procesa automáticamente los IDs en lotes de 10.

3. Los resultados se guardan en un archivo JSON con la siguiente estructura:
   ```json
   {
     "total_ads": 123,
     "timestamp": "2023-06-10T12:34:56.789012",
     "ads": [
       {
         "id": "123456789",
         "page_name": "Nombre de la página",
         ...
       },
       ...
     ]
   }
   ```

4. Si ocurre un error al guardar los resultados, el script intentará guardarlos en un archivo alternativo con el prefijo `meta_ads_fallback_`.

## Solución de problemas

- **Error de autenticación**: Verifica que tu token de acceso sea válido y tenga los permisos necesarios.
- **Sin resultados**: Asegúrate de que los IDs de página sean correctos y que esas páginas tengan anuncios activos.
- **Límite de tasa excedido**: Aumenta los tiempos de espera entre llamadas modificando los valores de `time.sleep()` en el código.
