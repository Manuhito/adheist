"""
Tasks for the Facebook Ads scraper.
"""
import logging
import time
import random
import os
import asyncio
from django.utils import timezone
from celery import shared_task
from urllib.parse import urlencode
from playwright.async_api import async_playwright
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


async def scrape_facebook_ads_with_playwright(scraper):
    """
    Scraper de Facebook Ads usando Playwright para ejecutar JavaScript.
    Solo carga las páginas y guarda el HTML para análisis.
    """
    results = []
    
    logger.info("Iniciando scraper con Playwright")
    
    # Obtener las páginas de forma síncrona antes de iniciar el contexto asíncrono
    # Convertimos el QuerySet a una lista para evitar problemas de contexto asíncrono
    get_pages = sync_to_async(lambda s: list(s.pages.all()))
    fb_pages = await get_pages(scraper)
    
    async with async_playwright() as p:
        # Iniciar un navegador en modo headless
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        
        # Configurar cookies genéricas
        await context.add_cookies([
            {'name': 'locale', 'value': 'es_ES', 'domain': '.facebook.com', 'path': '/'},
            {'name': 'wd', 'value': '1920x1080', 'domain': '.facebook.com', 'path': '/'},
            {'name': 'dpr', 'value': '1', 'domain': '.facebook.com', 'path': '/'},
        ])
        
        # Crear una nueva página
        page = await context.new_page()
        
        # Iterar sobre las páginas seleccionadas
        for fb_page in fb_pages:
            try:
                # Construir la URL exacta con los parámetros necesarios
                params = {
                    'active_status': scraper.active_status,
                    'ad_type': scraper.ad_type,
                    'country': 'ALL',
                    'is_targeted_country': 'false',
                    'media_type': 'all',
                    'search_type': 'page',
                    'source': 'fb-logo',
                    'view_all_page_id': fb_page.page_id
                }
                url = f"https://www.facebook.com/ads/library/?{urlencode(params)}"
                
                logger.info(f"Accediendo a Facebook Ads Library para la página {fb_page.page_name or 'Unknown'} (ID: {fb_page.page_id})")
                logger.info(f"URL: {url}")
                
                # Primero visitar la página principal de Facebook para obtener cookies adicionales
                logger.info("Visitando la página principal de Facebook para obtener cookies")
                await page.goto('https://www.facebook.com/', wait_until='networkidle')
                
                # Añadir un pequeño retraso para simular comportamiento humano
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                # Visitar la página de Facebook Business para obtener más cookies
                logger.info("Visitando la página de Facebook Business")
                await page.goto('https://www.facebook.com/business', wait_until='networkidle')
                
                # Añadir otro pequeño retraso
                await asyncio.sleep(random.uniform(1.0, 2.0))
                
                # Ahora acceder a la biblioteca de anuncios
                logger.info(f"Accediendo a la biblioteca de anuncios: {url}")
                response = await page.goto(url, wait_until='networkidle')
                
                # Registrar información sobre la respuesta
                logger.info(f"Response status: {response.status}")
                logger.info(f"Response URL: {response.url}")
                
                # Esperar a que la página cargue completamente y se ejecute el JavaScript
                await page.wait_for_load_state('networkidle')
                
                # Esperar un poco más para asegurarnos de que todo el contenido dinámico se ha cargado
                await asyncio.sleep(5)
                
                # Obtener el contenido HTML completo después de que se haya ejecutado JavaScript
                html_content = await page.content()
                
                # Guardar el HTML para análisis
                debug_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'debug')
                os.makedirs(debug_dir, exist_ok=True)
                debug_file = os.path.join(debug_dir, f'facebook_response_playwright_{fb_page.page_id}_{int(time.time())}.html')
                
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                logger.info(f"HTML guardado en: {debug_file}")
                
                # Verificar si estamos en una página de inicio de sesión
                login_elements = await page.query_selector_all('text=Log In, text=Iniciar sesión, text=Login')
                if login_elements:
                    logger.warning("Detectada página de inicio de sesión - Facebook requiere autenticación")
                else:
                    logger.info("Página cargada correctamente sin requerir autenticación")
                
                # Verificar si hay anuncios en la página (solo para logging)
                ad_elements = await page.query_selector_all('[data-testid="ad_library_card"]')
                if ad_elements:
                    logger.info(f"Se encontraron {len(ad_elements)} anuncios en la página")
                else:
                    logger.warning("No se encontraron anuncios en la página")
                    
                    # Verificar si hay mensaje de error o de no hay resultados
                    no_results = await page.query_selector_all('text=No results found, text=No se encontraron resultados')
                    if no_results:
                        logger.warning("La página indica que no hay resultados")
                
                # Añadir un pequeño retraso entre solicitudes para evitar limitaciones de tasa
                await asyncio.sleep(random.uniform(2.0, 4.0))
                
                # Añadir resultado básico
                results.append({
                    'page_id': fb_page.page_id,
                    'page_name': fb_page.page_name,
                    'html_saved': debug_file,
                    'requires_login': bool(login_elements),
                    'has_ads': bool(ad_elements)
                })
                
            except Exception as e:
                logger.error(f"Error procesando la página {fb_page.page_name or 'Unknown'} (ID: {fb_page.page_id}): {str(e)}")
                results.append({
                    'page_id': fb_page.page_id,
                    'page_name': fb_page.page_name,
                    'error': str(e)
                })
        
        # Cerrar el navegador
        await browser.close()
    
    return results


@shared_task
def run_facebook_ads_scraper(scraper_id):
    """
    Run Facebook Ads Library scraper.
    
    Args:
        scraper_id: ID of the FacebookAdsScraper
        
    Returns:
        dict: Information about the run
    """
    from apps.scraper.models import FacebookAdsScraper
    
    try:
        # Obtener el scraper por ID
        scraper = FacebookAdsScraper.objects.get(id=scraper_id)
        
        # Actualizar estado a "running"
        scraper.last_run_status = 'running'
        scraper.last_run_time = timezone.now()
        scraper.save(update_fields=['last_run_status', 'last_run_time'])
        
        logger.info(f"Starting Facebook Ads scraper: {scraper.name}")
        
        # Verificar que hay páginas seleccionadas
        pages = list(scraper.pages.all())
        if not pages:
            scraper.last_run_status = 'failed'
            scraper.last_run_error = "No Facebook pages selected"
            scraper.save()
            return {
                'scraper_id': scraper_id,
                'status': 'failed',
                'error': "No Facebook pages selected"
            }
        
        # Ejecutar el scraper asíncrono
        result = asyncio.run(scrape_facebook_ads_with_playwright(scraper))
        
        # Actualizar estado a "completed"
        scraper.last_run_status = 'completed'
        scraper.last_run_time = timezone.now()
        scraper.save(update_fields=['last_run_status', 'last_run_time'])
        
        logger.info(f"Completed Facebook Ads scraper: {scraper.name}")
        
        return {'scraper_id': scraper_id, 'status': 'completed', 'result': result}
        
    except Exception as e:
        logger.exception(f"Error running Facebook Ads scraper {scraper_id}: {e}")
        
        # Update the scraper status if it exists
        try:
            scraper.last_run_status = 'failed'
            scraper.last_run_error = str(e)
            scraper.save()
        except:
            pass
            
        return {
            'scraper_id': scraper_id,
            'status': 'error',
            'error': str(e)
        }
