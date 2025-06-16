import os
import json
import requests
from bs4 import BeautifulSoup
import time
import logging
import concurrent.futures
from datetime import datetime

from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Extrae imágenes de anuncios de Meta Ads y actualiza el JSON con las URLs de las imágenes'

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

    def handle(self, *args, **options):
        # Configurar directorios
        input_dir = options['input_dir'] or getattr(settings, 'META_ADS_RESULTS_DIR', 
                                                  os.path.join(settings.BASE_DIR, 'meta_ads_results_backload_1'))
        
        # Determinar el archivo JSON a procesar
        json_file_path = options['json_file'] if options['json_file'] else self.get_latest_json_file(input_dir)
        
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
        updated_json_data = self.process_json_data(json_data, options['max_workers'])
        
        # Guardar el JSON actualizado
        self.save_json_file(json_file_path, updated_json_data)
        
        self.stdout.write(self.style.SUCCESS("Procesamiento completado con éxito"))

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
        Extrae la URL de la imagen principal del anuncio desde la página del anuncio
        
        Args:
            snapshot_url: URL de la página del anuncio de Meta
            
        Returns:
            URL de la imagen o None si no se encuentra
        """
        try:
            # NO eliminar el token de acceso - es necesario para autenticar la solicitud
            # Asegurarse de que la URL esté completa
            if not snapshot_url or 'facebook.com' not in snapshot_url:
                self.stderr.write(self.style.ERROR(f"URL de snapshot inválida: {snapshot_url}"))
                return None
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
            
            # Añadir un pequeño retraso para evitar bloqueos
            time.sleep(1.5)
            
            # Imprimir la URL completa para depuración
            self.stdout.write(f"Accediendo a URL: {snapshot_url}")
            
            response = requests.get(snapshot_url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Estrategia 1: Buscar imágenes dentro de contenedores de anuncios
            ad_containers = soup.select('div[data-testid="ad_creative"]')
            if ad_containers:
                for container in ad_containers:
                    images = container.select('img')
                    if images and len(images) > 0:
                        for img in images:
                            if img.get('src') and not img.get('src').endswith('.svg'):
                                return img.get('src')
            
            # Estrategia 2: Buscar imágenes grandes que probablemente sean del anuncio
            all_images = soup.select('img')
            ad_images = []
            
            for img in all_images:
                src = img.get('src')
                if not src or src.endswith('.svg'):
                    continue
                    
                # Filtrar imágenes pequeñas o iconos
                width = img.get('width')
                height = img.get('height')
                
                if width and height:
                    try:
                        w, h = int(width), int(height)
                        if w >= 200 and h >= 200:  # Imágenes de tamaño significativo
                            ad_images.append(src)
                    except ValueError:
                        pass
                elif 'scontent' in src:  # URLs de imágenes de Facebook suelen contener 'scontent'
                    ad_images.append(src)
            
            if ad_images:
                return ad_images[0]  # Devolver la primera imagen grande encontrada
                
            self.stdout.write(self.style.WARNING(f"No se encontró imagen para {snapshot_url}"))
            return None
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al extraer imagen de {snapshot_url}: {str(e)}"))
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
            max_workers: Número máximo de trabajadores concurrentes
            
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
        
        # Procesar anuncios en paralelo
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Mapear cada anuncio a un futuro
            future_to_ad_index = {
                executor.submit(self.process_ad, ad): i 
                for i, ad in enumerate(ads)
            }
            
            # Procesar resultados a medida que se completan
            for future in concurrent.futures.as_completed(future_to_ad_index):
                ad_index = future_to_ad_index[future]
                try:
                    # Actualizar el anuncio con el resultado
                    updated_ad = future.result()
                    ads[ad_index] = updated_ad
                    
                    results['processed'] += 1
                    if updated_ad.get('ad_image_url'):
                        results['with_images'] += 1
                    else:
                        results['without_images'] += 1
                    
                    # Mostrar progreso
                    if results['processed'] % 10 == 0 or results['processed'] == total_ads:
                        self.stdout.write(f"Progreso: {results['processed']}/{total_ads} anuncios procesados")
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error al procesar anuncio en índice {ad_index}: {str(e)}"))
        
        # Actualizar los datos con los anuncios procesados
        json_data[ads_field] = ads
        
        self.stdout.write(self.style.SUCCESS(f"Procesamiento completado:"))
        self.stdout.write(f"Total de anuncios: {results['total']}")
        self.stdout.write(f"Anuncios con imágenes: {results['with_images']}")
        self.stdout.write(f"Anuncios sin imágenes: {results['without_images']}")
        
        return json_data
