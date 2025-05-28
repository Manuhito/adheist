import json
import os
from datetime import datetime, timezone
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils.dateparse import parse_datetime
from apps.ads.models import AdLibrary, IndustryList, TagList, AppConfiguration

class Command(BaseCommand):
    help = 'Import ads from Apify JSON file to the database'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            help='Path to the JSON file with Apify data'
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing ads if they already exist in the database'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        update_existing = options['update_existing']
        
        if not os.path.exists(json_file):
            raise CommandError(f'File not found: {json_file}')
            
        self.stdout.write(self.style.SUCCESS(f'Importing ads from {json_file}'))
        
        try:
            # Cargar datos del archivo JSON
            with open(json_file, 'r', encoding='utf-8') as f:
                ads_data = json.load(f)
                
            self.stdout.write(self.style.SUCCESS(f'Loaded {len(ads_data)} ads from file'))
            
            # Contadores para estadísticas
            created_count = 0
            updated_count = 0
            skipped_count = 0
            
            # Procesar cada anuncio
            for ad_data in ads_data:
                try:
                    # Verificar si el anuncio ya existe
                    ad_id = ad_data.get('ad archive ID')
                    existing_ad = None
                    
                    if ad_id:
                        existing_ad = AdLibrary.objects.filter(ad_id=ad_id).first()
                    
                    if existing_ad and not update_existing:
                        skipped_count += 1
                        continue
                        
                    # Crear o actualizar el anuncio
                    if existing_ad:
                        ad = existing_ad
                        updated_count += 1
                    else:
                        ad = AdLibrary()
                        created_count += 1
                    
                    # Asignar campos básicos
                    ad.company_name = ad_data.get('Page Name', 'Unknown')
                    ad.ad_id = ad_data.get('ad archive ID')
                    ad.page_id = ad_data.get('Page ID')
                    ad.ad_text = ad_data.get('ad_text', '')
                    ad.ad_url = ad_data.get('link_url', '')
                    ad.ad_snapshot_url = ad_data.get('ad_snapshot_url', '')
                    ad.country = ad_data.get('country', '')
                    ad.publisher_platforms = ','.join(ad_data.get('publisher_platforms', []))
                    ad.cta_text = ad_data.get('CTA Text', '')
                    ad.source = 'apify'
                    ad.is_fav = False
                    
                    # Procesar fechas
                    if 'start_date_timestamp' in ad_data and ad_data['start_date_timestamp']:
                        timestamp = ad_data['start_date_timestamp']
                        ad.ad_delivery_start_time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                    elif 'start_date_formatted' in ad_data and ad_data['start_date_formatted']:
                        ad.ad_delivery_start_time = datetime.strptime(ad_data['start_date_formatted'], '%Y-%m-%d')
                        
                    if 'end_date_timestamp' in ad_data and ad_data['end_date_timestamp']:
                        timestamp = ad_data['end_date_timestamp']
                        ad.ad_delivery_stop_time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                    elif 'end_date_formatted' in ad_data and ad_data['end_date_formatted']:
                        ad.ad_delivery_stop_time = datetime.strptime(ad_data['end_date_formatted'], '%Y-%m-%d')
                    
                    # Process images as JSON list
                    image_urls = []
                    if 'image_urls' in ad_data and ad_data['image_urls'] and ad_data['image_urls'] != 'N/A':
                        if isinstance(ad_data['image_urls'], list):
                            image_urls = ad_data['image_urls']
                        elif isinstance(ad_data['image_urls'], str):
                            # Si es una cadena, intentamos convertirla a lista
                            try:
                                parsed = json.loads(ad_data['image_urls'])
                                if isinstance(parsed, list):
                                    image_urls = parsed
                            except:
                                # Si falla, lo dejamos como lista vacía
                                pass
                    
                    ad.ad_image = image_urls  # Store as JSON list
                    
                    # Guardar datos completos
                    ad.raw_data = ad_data
                    
                    # Guardar el anuncio para poder asignar relaciones M2M
                    ad.save()
                    
                    # Procesar industrias (Page Categories)
                    if 'Page Categories' in ad_data and ad_data['Page Categories']:
                        for category in ad_data['Page Categories']:
                            industry, created = IndustryList.objects.get_or_create(name=category)
                            ad.industries.add(industry)
                    
                    # Procesar tags (Categories)
                    if 'categories' in ad_data and ad_data['categories']:
                        for category in ad_data['categories']:
                            tag, created = TagList.objects.get_or_create(name=category)
                            ad.tags.add(tag)
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error processing ad: {str(e)}'))
            
            # Mostrar estadísticas
            self.stdout.write(self.style.SUCCESS(f'Import completed:'))
            self.stdout.write(self.style.SUCCESS(f'  - Created: {created_count}'))
            self.stdout.write(self.style.SUCCESS(f'  - Updated: {updated_count}'))
            self.stdout.write(self.style.SUCCESS(f'  - Skipped: {skipped_count}'))
            self.stdout.write(self.style.SUCCESS(f'  - Total processed: {created_count + updated_count + skipped_count}'))
            
        except Exception as e:
            raise CommandError(f'Error importing ads: {str(e)}')
