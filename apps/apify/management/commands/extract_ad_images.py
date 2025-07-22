import os
import json
import time
import logging
import concurrent.futures
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Extrae imágenes de anuncios de Meta Ads y actualiza el JSON con las URLs de las imágenes'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.playwright = None
        self.browser = None

    def add_arguments(self, parser):
        parser.add_argument(
            '--input-dir',
            type=str,
            default=None,
            help='Directorio que contiene los archivos JSON de Meta Ads (por defecto usa settings.META_ADS_RESULTS_DIR)'
        )
        parser.add_argument(
            '--max-workers',
            type=int,
            default=5,
            help='Número máximo de trabajadores concurrentes'
        )
        parser.add_argument(
            '--json-file',
            type=str,
            help='Ruta específica al archivo JSON a procesar (en lugar de usar el más reciente)'
        )

    def _initialize_playwright(self):
        """Inicializa Playwright y el navegador si aún no están inicializados"""
        if self.playwright is None:
            self.stdout.write("Inicializando Playwright...")
            self.playwright = sync_playwright().start()
            
        if self.browser is None:
            self.stdout.write("Inicializando navegador Chromium...")
            # Opciones optimizadas para reducir uso de memoria y CPU
            self.browser = self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--disable-extensions',
                ]
            )
            self.stdout.write(self.style.SUCCESS("Navegador inicializado correctamente"))
        return self.browser
    
    def _cleanup_playwright(self):
        """Cierra el navegador y Playwright"""
        if self.browser:
            self.browser.close()
            self.browser = None
            
        if self.playwright:
            self.playwright.stop()
            self.playwright = None

    def get_latest_json_file(self, directory):
        """
        Obtiene el archivo JSON más reciente en el directorio especificado
        
        Args:
            directory: Directorio donde buscar archivos JSON
            
        Returns:
            Ruta al archivo JSON más reciente o None si no hay archivos
        """
        try:
            json_files = [os.path.join(directory, f) for f in os.listdir(directory) 
                        if f.endswith('.json') and os.path.isfile(os.path.join(directory, f))]
            
            if not json_files:
                self.stderr.write(self.style.ERROR(f"No se encontraron archivos JSON en {directory}"))
                return None
                
            # Ordenar por fecha de modificación (más reciente primero)
            latest_file = max(json_files, key=os.path.getmtime)
            self.stdout.write(f"Archivo JSON más reciente: {latest_file}")
            return latest_file
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al buscar el archivo JSON más reciente: {str(e)}"))
            return None

    def load_json_file(self, json_file_path):
        """
        Carga un archivo JSON
        
        Args:
            json_file_path: Ruta al archivo JSON
            
        Returns:
            Datos JSON cargados o None si hay error
        """
        try:
            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            return data
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al cargar el archivo JSON {json_file_path}: {str(e)}"))
            return None

    def save_json_file(self, json_file_path, data):
        """
        Guarda datos en un archivo JSON
        
        Args:
            json_file_path: Ruta donde guardar el archivo JSON
            data: Datos a guardar
            
        Returns:
            True si se guardó correctamente, False en caso contrario
        """
        try:
            # Crear una copia de seguridad del archivo original
            if os.path.exists(json_file_path):
                backup_path = f"{json_file_path}.bak"
                with open(backup_path, 'w', encoding='utf-8') as backup_file:
                    with open(json_file_path, 'r', encoding='utf-8') as original_file:
                        backup_file.write(original_file.read())
                self.stdout.write(f"Copia de seguridad creada en {backup_path}")
            
            # Guardar el archivo actualizado
            with open(json_file_path, 'w', encoding='utf-8') as file:
                json.dump(data, file, indent=2, ensure_ascii=False)
            self.stdout.write(self.style.SUCCESS(f"Archivo JSON actualizado guardado en {json_file_path}"))
            return True
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al guardar el archivo JSON {json_file_path}: {str(e)}"))
            return False

    def extract_image_url_from_ad_page(self, snapshot_url):
        """
        Extrae la URL de la imagen principal del anuncio desde la página del anuncio usando Playwright
        
        Args:
            snapshot_url: URL de la página del anuncio de Meta
            
        Returns:
            URL de la imagen o None si no se encuentra
        """
        try:
            # Asegurarse de que la URL esté completa y tenga el token de acceso
            if not snapshot_url or 'facebook.com' not in snapshot_url:
                self.stderr.write(self.style.ERROR(f"URL de snapshot inválida: {snapshot_url}"))
                return None
            
            # Imprimir la URL completa para depuración (ocultando el token por seguridad)
            debug_url = snapshot_url
            if 'access_token=' in debug_url:
                token_part = debug_url.split('access_token=')[1]
                if '&' in token_part:
                    token_part = token_part.split('&')[0]
                masked_token = token_part[:5] + '...' + token_part[-5:] if len(token_part) > 10 else '...'
                debug_url = debug_url.replace(token_part, masked_token)
            self.stdout.write(f"Accediendo a URL con Playwright: {debug_url}")
            
            # Inicializar Playwright y el navegador si es necesario
            browser = self._initialize_playwright()
            
            # Crear una nueva página
            page = browser.new_page()
            
            try:
                # Navegar a la URL con timeout adecuado
                page.goto(snapshot_url, timeout=30000)
                
                # Esperar a que la red esté inactiva (contenido cargado)
                page.wait_for_load_state('networkidle', timeout=10000)
                
                # Estrategia 1: Buscar imágenes con URLs de Facebook (scontent o fbcdn)
                # Usar evaluateHandle para ejecutar JS que filtra las imágenes directamente
                image_urls = page.evaluate("""() => {
                    const images = Array.from(document.querySelectorAll('img'));
                    return images
                        .filter(img => img.src && (img.src.includes('scontent') || img.src.includes('fbcdn')))
                        .map(img => img.src);
                }""")
                
                if image_urls and len(image_urls) > 0:
                    # Ordenar por longitud (las URLs más largas suelen tener más información/calidad)
                    image_urls.sort(key=len, reverse=True)
                    
                    # Eliminar duplicados manteniendo el orden
                    unique_urls = []
                    for url in image_urls:
                        if url not in unique_urls:
                            unique_urls.append(url)
                    
                    if unique_urls:
                        best_image = unique_urls[0]
                        self.stdout.write(self.style.SUCCESS(f"Imagen encontrada para {debug_url}: {best_image[:50]}..."))
                        return best_image
                
                # Estrategia 2: Buscar cualquier imagen que no sea un icono/logo
                fallback_image_urls = page.evaluate("""() => {
                    const images = Array.from(document.querySelectorAll('img'));
                    return images
                        .filter(img => {
                            if (!img.src) return false;
                            const src = img.src.toLowerCase();
                            // Excluir SVGs, iconos y logos
                            if (src.endsWith('.svg') || src.endsWith('.ico')) return false;
                            if (src.includes('icon') || src.includes('logo')) return false;
                            // Excluir imágenes muy pequeñas
                            if (img.width < 50 || img.height < 50) return false;
                            return true;
                        })
                        .map(img => img.src);
                }""")
                
                if fallback_image_urls and len(fallback_image_urls) > 0:
                    best_fallback = fallback_image_urls[0]
                    self.stdout.write(self.style.SUCCESS(f"Imagen de fallback encontrada para {debug_url}: {best_fallback[:50]}..."))
                    return best_fallback
                
                self.stdout.write(self.style.WARNING(f"No se encontró imagen para {debug_url}"))
                return None
                
            except PlaywrightTimeoutError as e:
                self.stderr.write(self.style.ERROR(f"Timeout al cargar {debug_url}: {e}"))
                return None
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error al procesar {debug_url}: {e}"))
                return None
            finally:
                # Cerrar la página para liberar recursos
                page.close()
                
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error general al extraer imagen de {snapshot_url}: {e}"))
            return None

    def process_ad(self, ad_data):
        """
        Procesa un anuncio: extrae la URL de la imagen y actualiza el objeto del anuncio
        
        Args:
            ad_data: Diccionario con los datos del anuncio
            
        Returns:
            Diccionario actualizado del anuncio
        """
        ad_id = ad_data.get('id')
        snapshot_url = ad_data.get('ad_snapshot_url')
        
        if not ad_id or not snapshot_url:
            self.stdout.write(self.style.WARNING(f"Anuncio sin ID o URL: {ad_data}"))
            return ad_data
        
        # Extraer URL de la imagen
        image_url = self.extract_image_url_from_ad_page(snapshot_url)
        
        # Añadir la URL de la imagen al anuncio (None si no se encontró)
        ad_data['ad_image_url'] = image_url
        
        return ad_data

    def process_json_data(self, json_data, max_workers=5):
        """
        Procesa los datos JSON y actualiza cada anuncio con su URL de imagen
        
        Args:
            json_data: Datos JSON cargados
            max_workers: Número máximo de trabajadores concurrentes (no usado en procesamiento secuencial)
            
        Returns:
            Datos JSON actualizados
        """
        # Verificar si el JSON tiene la estructura esperada
        if not isinstance(json_data, dict):
            self.stderr.write(self.style.ERROR("Formato JSON inesperado: no es un diccionario"))
            return json_data
        
        # Comprobar si los anuncios están en 'data' o en 'ads'
        if 'data' in json_data:
            ads_field = 'data'
            ads = json_data.get('data', [])
        elif 'ads' in json_data:
            ads_field = 'ads'
            ads = json_data.get('ads', [])
        else:
            self.stderr.write(self.style.ERROR("Formato JSON inesperado: no se encontró campo 'data' ni 'ads'"))
            return json_data
        
        total_ads = len(ads)
        self.stdout.write(f"Procesando {total_ads} anuncios")
        
        results = {
            'total': total_ads,
            'processed': 0,
            'with_images': 0,
            'without_images': 0
        }
        
        # Inicializar Playwright una sola vez
        try:
            # Asegurarnos de que Playwright esté inicializado
            browser = self._initialize_playwright()
            
            # Procesar anuncios secuencialmente para evitar problemas de hilos con Playwright
            for i, ad in enumerate(ads):
                try:
                    # Procesar el anuncio
                    updated_ad = self.process_ad(ad)
                    ads[i] = updated_ad
                    
                    results['processed'] += 1
                    if updated_ad.get('ad_image_url'):
                        results['with_images'] += 1
                    else:
                        results['without_images'] += 1
                    
                    # Mostrar progreso
                    if results['processed'] % 10 == 0 or results['processed'] == total_ads:
                        self.stdout.write(f"Progreso: {results['processed']}/{total_ads} anuncios procesados")
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error al procesar anuncio en índice {i}: {str(e)}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error en el procesamiento: {str(e)}"))
        
        # Actualizar los datos con los anuncios procesados
        json_data[ads_field] = ads
        
        # Mostrar resumen
        self.stdout.write("Procesamiento completado:")
        self.stdout.write(f"Total de anuncios: {results['total']}")
        self.stdout.write(f"Anuncios con imágenes: {results['with_images']}")
        self.stdout.write(f"Anuncios sin imágenes: {results['without_images']}")
        
        return json_data

    def handle(self, *args, **options):
        try:
            # Configurar directorios
            input_dir = options.get('input_dir') or getattr(settings, 'META_ADS_RESULTS_DIR', 
                                                  os.path.join(settings.BASE_DIR, 'meta_ads_results_backload_1'))
            
            # Determinar el archivo JSON a procesar
            json_file_path = options.get('json_file') if options.get('json_file') else self.get_latest_json_file(input_dir)
            
            if not json_file_path:
                self.stderr.write(self.style.ERROR("No se pudo determinar el archivo JSON a procesar"))
                return
            
            self.stdout.write(self.style.SUCCESS(f"Procesando archivo: {json_file_path}"))
            
            # Cargar el archivo JSON
            json_data = self.load_json_file(json_file_path)
            if not json_data:
                self.stderr.write(self.style.ERROR("No se pudo cargar el archivo JSON"))
                return
            
            # Procesar el JSON y actualizar con URLs de imágenes
            updated_json_data = self.process_json_data(json_data, options.get('max_workers', 5))
            
            # Guardar el JSON actualizado
            self.save_json_file(json_file_path, updated_json_data)
            
            self.stdout.write(self.style.SUCCESS("Procesamiento completado con éxito"))
            
            # Cerrar recursos de Playwright al finalizar
            self._cleanup_playwright()
            
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error: {e}"))
            # Asegurar que se limpien los recursos de Playwright incluso en caso de error
            self._cleanup_playwright()
