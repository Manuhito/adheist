"""
Tasks for the Facebook Ads scraper.
"""
import logging
import time
import random
import os
import re
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
                
                # Primero visitar la página principal de Facebook para obtener cookies adicionales
                await page.goto('https://www.facebook.com/', wait_until='networkidle')
                
                # Añadir un pequeño retraso para simular comportamiento humano
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                # Visitar la página de Facebook Business para obtener más cookies
                await page.goto('https://www.facebook.com/business', wait_until='networkidle')
                
                # Añadir otro pequeño retraso
                await asyncio.sleep(random.uniform(1.0, 2.0))
                
                # Ahora acceder a la biblioteca de anuncios
                response = await page.goto(url, wait_until='networkidle')
                
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
                logger.info(f"HTML guardado para análisis")
                
                
                # Hacer scroll para cargar más anuncios (lazy loading)
                logger.info(f"Procesando anuncios para {fb_page.page_name or 'Unknown'} (ID: {fb_page.page_id})")
                
                # Hacer scroll hacia abajo para cargar más anuncios (lazy loading)
                max_scroll_attempts = 10  # Número máximo de intentos de scroll
                max_ads_to_collect = 50  # Límite máximo de anuncios a recopilar (para evitar procesamiento excesivo)
                
                # Esperar un poco más para asegurar que la página está completamente cargada
                await asyncio.sleep(random.uniform(2.0, 3.0))
                

                last_ad_count = 0
                consecutive_no_change = 0  # Contador de intentos consecutivos sin cambios
                
                for scroll_attempt in range(max_scroll_attempts):
                    # Hacer scroll hacia abajo
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(3)  # Esperar a que se carguen nuevos elementos
                    
                    # Verificar cuántos anuncios hay ahora usando el selector exacto
                    ad_elements = await page.query_selector_all('div[class="x1plvlek xryxfnj x1gzqxud x178xt8z x1lun4ml xso031l xpilrb4 xb9moi8 xe76qn7 x21b0me x142aazg x1i5p2am x1whfx0g xr2y4jy x1ihp6rs x1kmqopl x13fuv20 x18b5jzi x1q0q8m5 x1t7ytsu x9f619"]')
                    current_ad_count = len(ad_elements)
                    
                    # Solo registrar cada 2 intentos de scroll para reducir verbosidad
                    if scroll_attempt % 2 == 0:
                        logger.info(f"Scroll #{scroll_attempt + 1}: {current_ad_count} anuncios encontrados")
                    
                    # Si alcanzamos el límite de anuncios, terminamos
                    if current_ad_count >= max_ads_to_collect:
                        logger.info(f"Se alcanzó el límite de {max_ads_to_collect} anuncios")
                        break
                    
                    # Si no hay más anuncios nuevos después de hacer scroll
                    if current_ad_count == last_ad_count:
                        consecutive_no_change += 1
                        # Si no hay cambios en 2 intentos consecutivos, terminamos
                        if consecutive_no_change >= 2:
                            logger.info("No se encontraron más anuncios nuevos después de varios intentos de scroll")
                            break
                    else:
                        consecutive_no_change = 0  # Reiniciar contador si hay nuevos anuncios
                    
                    last_ad_count = current_ad_count
                    
                    # Hacer scroll adicional en diferentes posiciones para activar el lazy loading
                    if scroll_attempt > 0 and scroll_attempt % 2 == 0:
                        # Scroll a la mitad de la página para activar carga de elementos intermedios
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                        await asyncio.sleep(1.5)
                
                # Verificar si hay anuncios en la página usando el selector exacto
                ad_elements = await page.query_selector_all('div[class="x1plvlek xryxfnj x1gzqxud x178xt8z x1lun4ml xso031l xpilrb4 xb9moi8 xe76qn7 x21b0me x142aazg x1i5p2am x1whfx0g xr2y4jy x1ihp6rs x1kmqopl x13fuv20 x18b5jzi x1q0q8m5 x1t7ytsu x9f619"]')
                if not ad_elements:
                    logger.warning("No se encontraron anuncios en la página")
                    
                    # Verificar si hay mensaje de error o de no hay resultados
                    no_results = await page.query_selector_all('text="No results found", text="No se encontraron resultados"')
                    if no_results:
                        logger.warning("La página indica que no hay resultados")
                else:
                    logger.info(f"Se encontraron {len(ad_elements)} anuncios en total")
                    
                    # Iterar sobre cada anuncio para hacer clic en "Ver detalles del anuncio"
                    # Limitar a un máximo de anuncios para evitar tiempos de ejecución excesivos
                    max_ads_to_process = min(len(ad_elements), max_ads_to_collect)
                    logger.info(f"Procesando {max_ads_to_process} de {len(ad_elements)} anuncios encontrados")
                    
                    for i, ad_element in enumerate(ad_elements[:max_ads_to_process]):
                        try:
                            # Obtener el ID del anuncio si está disponible
                            ad_id = 'Unknown'
                            try:
                                # Buscar texto que contenga "Library ID:" o "Identificador de la biblioteca:"
                                id_elements = await ad_element.query_selector_all('span')
                                for id_el in id_elements:
                                    text = await id_el.evaluate('(element) => element.textContent')
                                    if text and ('Library ID:' in text or 'Identificador de la biblioteca:' in text):
                                        ad_id = text.strip()
                                        logger.info(f"ID de anuncio encontrado: {ad_id}")
                                        break
                            except Exception as id_error:
                                logger.warning(f"Error al extraer ID del anuncio: {str(id_error)}")
                            
                            # Buscar el botón de detalles usando selectores de texto
                            detail_button = None
                            
                            # Buscar por texto exacto (inglés primero, luego español)
                            detail_button = await ad_element.query_selector('text="See ad details"')
                            if detail_button:
                                logger.info(f"Botón de detalles encontrado por texto 'See ad details' para anuncio ID: {ad_id}")
                            else:
                                # Intentar por texto en español
                                detail_button = await ad_element.query_selector('text="Ver detalles del anuncio"')
                                if detail_button:
                                    logger.info(f"Botón de detalles encontrado por texto 'Ver detalles del anuncio' para anuncio ID: {ad_id}")
                                else:
                                    # Intentar con 'See summary details'
                                    detail_button = await ad_element.query_selector('text="See summary details"')
                                    if detail_button:
                                        logger.info(f"Botón de detalles encontrado por texto 'See summary details' para anuncio ID: {ad_id}")
                                    else:
                                        # Intentar con 'Ver detalles del resumen'
                                        detail_button = await ad_element.query_selector('text="Ver detalles del resumen"')
                                        if detail_button:
                                            logger.info(f"Botón de detalles encontrado por texto 'Ver detalles del resumen' para anuncio ID: {ad_id}")
                            
                            if detail_button:
                                logger.info(f"Haciendo clic en botón de detalles para el anuncio ID: {ad_id}")
                                
                                # Implementar múltiples estrategias de clic para evitar timeouts
                                click_success = False
                                click_attempts = 0
                                max_click_attempts = 3
                                
                                while not click_success and click_attempts < max_click_attempts:
                                    click_attempts += 1
                                    try:
                                        # Estrategia 1: Intentar hacer visible el elemento y eliminar interceptores
                                        try:
                                            await page.evaluate('''
                                                (element) => {
                                                    // Hacer que el elemento sea visible y clickeable
                                                    element.style.position = 'relative';
                                                    element.style.zIndex = '9999';
                                                    element.style.pointerEvents = 'auto';
                                                    
                                                    // Eliminar elementos que puedan interceptar clics
                                                    const overlays = document.querySelectorAll('div[class*="overlay"], div[class*="backdrop"], div[class*="modal"], div[aria-hidden="false"]');
                                                    overlays.forEach(overlay => {
                                                        if (overlay !== element && !element.contains(overlay)) {
                                                            overlay.style.pointerEvents = 'none';
                                                        }
                                                    });
                                                }
                                            ''', detail_button)
                                            # Pequeña pausa para que los cambios de CSS surtan efecto
                                            await asyncio.sleep(0.5)
                                        except Exception:
                                            pass
                                        
                                        # Estrategia 2: Usar JavaScript para hacer clic directamente
                                        if click_attempts == 1:
                                            await page.evaluate('(element) => element.click()', detail_button)
                                            click_success = True
                                        
                                        # Estrategia 3: Usar click nativo de Playwright con timeout reducido
                                        elif click_attempts == 2:
                                            # Añadir un pequeño movimiento aleatorio para simular comportamiento humano
                                            await page.mouse.move(
                                                random.randint(5, 10), 
                                                random.randint(5, 10)
                                            )
                                            await asyncio.sleep(random.uniform(0.3, 0.7))
                                            await detail_button.click(timeout=10000)  # Timeout reducido a 10 segundos
                                            click_success = True
                                        
                                        # Estrategia 4: Scroll al elemento y luego click
                                        else:
                                            # Scroll al elemento para asegurarse de que está en la vista
                                            await detail_button.scroll_into_view_if_needed()
                                            await asyncio.sleep(1)
                                            
                                            # Intento de click con force=True
                                            await detail_button.click(force=True, timeout=10000)
                                            click_success = True
                                    
                                    except Exception:
                                        # Pausa antes del siguiente intento
                                        await asyncio.sleep(random.uniform(1.0, 2.0))
                                
                                if not click_success:
                                    logger.warning(f"No se pudo acceder a los detalles del anuncio {ad_id} después de {max_click_attempts} intentos")
                                    # Continuar con el siguiente anuncio
                                    continue
                                
                                # Añadir un pequeño retraso aleatorio después del clic exitoso
                                await asyncio.sleep(random.uniform(0.5, 1.5))
                                
                                # Esperar a que se cargue el modal con detección activa
                                try:
                                    # Añadir un pequeño retraso para permitir que el modal se abra
                                    await asyncio.sleep(random.uniform(1.0, 2.0))
                                    
                                    # Estrategia 1: Esperar por un diálogo o modal
                                    modal_found = False
                                    start_time = time.time()
                                    timeout = 8  # segundos máximos de espera (aumentado para dar más tiempo)
                                    
                                    # Usar waitForSelector con timeout para esperar el modal
                                    try:
                                        await page.wait_for_selector('div[role="dialog"], div[aria-modal="true"]', timeout=5000)
                                        modal_found = True
                                    except Exception:
                                        # Si falla, usar el enfoque anterior
                                        while time.time() - start_time < timeout and not modal_found:
                                            # Buscar indicadores de que el modal está abierto
                                            modal = await page.query_selector('div[role="dialog"], div[aria-modal="true"]')
                                            if modal:
                                                modal_found = True
                                                break
                                        
                                            # Verificar si hay un overlay o backdrop (indicador común de modal)
                                            overlay = await page.query_selector('div[class*="overlay"], div[class*="backdrop"], div[class*="modal"]')
                                            if overlay:
                                                modal_found = True
                                                break
                                                
                                            # Verificar si hay un botón de cierre visible
                                            close_button = await page.query_selector('[aria-label="Close"], button[class*="close"]')
                                            if close_button:
                                                modal_found = True
                                                break
                                                
                                            await asyncio.sleep(0.5)  # Pequeña pausa antes de verificar nuevamente
                                    
                                    if not modal_found:
                                        await asyncio.sleep(2)  # Espera fija como fallback
                                    
                                    # Extraer información básica del modal
                                    ad_info = {"ad_id": ad_id}
                                    
                                    try:
                                        # Extraer detalles adicionales del modal usando la nueva función
                                        ad_info.update(await extract_ad_modal_details(page, ad_id))
                                        
                                        # Intentar extraer texto del anuncio
                                        ad_text_element = await page.query_selector('div[role="dialog"] div[data-ad-preview="message"], div[role="dialog"] div[class*="text"]')
                                        if ad_text_element:
                                            ad_info["ad_text"] = await ad_text_element.evaluate('(element) => element.textContent')
                                            # Texto extraído correctamente
                                        
                                        # Intentar extraer URLs de imágenes
                                        image_elements = await page.query_selector_all('div[role="dialog"] img')
                                        if image_elements:
                                            image_urls = []
                                            for img in image_elements:
                                                src = await img.get_attribute('src')
                                                if src and ('http' in src):
                                                    image_urls.append(src)
                                            if image_urls:
                                                ad_info["image_urls"] = image_urls
                                                # URLs de imágenes extraídas correctamente
                                        
                                        # Guardar la información extraída en el resultado
                                        results.append({
                                            "ad_id": ad_id,
                                            "page_id": fb_page.page_id,
                                            "page_name": fb_page.page_name,
                                            "ad_info": ad_info
                                        })
                                        
                                        logger.info(f"Anuncio {ad_id} procesado correctamente")
                                    except Exception as extract_error:
                                        logger.error(f"Error al extraer información del anuncio ID: {ad_id}: {str(extract_error)}")
                                        # Continuar con el siguiente anuncio
                                    
                                    # Cerrar el modal para continuar con el siguiente anuncio
                                    
                                    # Estrategia 1: Buscar botón de cierre por selectores más amplios
                                    close_button = await page.query_selector('[aria-label="Close"], [aria-label="Cerrar"], button[class*="close"], div[class="xtwfq29"], div[role="button"][class*="x"]')
                                    
                                    try:
                                        if close_button:
                                            # Intentar cerrar usando JavaScript para evitar problemas de intercepción de eventos
                                            try:
                                                await page.evaluate('(element) => element.click()', close_button)
                                            except Exception:
                                                # Intentar con click normal con timeout reducido
                                                try:
                                                    await close_button.click(timeout=5000)  # Timeout reducido a 5 segundos
                                                except Exception:
                                                    pass
                                        else:
                                            logger.warning(f"No se encontró botón para cerrar el modal del anuncio ID: {ad_id}")
                                        
                                        # Estrategia 2: Intentar cerrar con Escape
                                        await page.keyboard.press('Escape')
                                        
                                        # Estrategia 3: Clic fuera del modal
                                        await page.mouse.click(50, 50)  # Clic en una esquina de la página
                                        
                                        # Estrategia 4: Forzar cierre con JavaScript
                                        await page.evaluate("""
                                            (() => {
                                                // Intentar cerrar cualquier diálogo visible
                                                const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]');
                                                dialogs.forEach(dialog => {
                                                    dialog.style.display = 'none';
                                                });
                                                
                                                // Eliminar cualquier overlay
                                                const overlays = document.querySelectorAll('div[class*="overlay"], div[class*="backdrop"], div[class*="modal"]');
                                                overlays.forEach(overlay => {
                                                    overlay.style.display = 'none';
                                                });
                                            })();
                                        """)
                                        
                                        # Breve pausa para permitir que cualquiera de las estrategias surta efecto
                                        await asyncio.sleep(1)
                                    except Exception as close_error:
                                        logger.error(f"Error al intentar cerrar el modal para anuncio ID: {ad_id}: {str(close_error)}")
                                    
                                    # Continuar con el siguiente anuncio independientemente del resultado
                                except Exception:
                                    logger.warning(f"Error al procesar el anuncio {ad_id}")
                                    # Intentar continuar con el siguiente anuncio
                            else:
                                # No se encontró el botón de detalles
                                pass
                                
                        except Exception:
                            logger.warning(f"Error al procesar el anuncio #{i+1}")
                    # Fin del procesamiento de anuncios
                
                # Añadir un retraso más largo entre solicitudes para evitar limitaciones de tasa y detección de automatización
                await asyncio.sleep(random.uniform(3.0, 6.0))
                
                # Añadir resultado básico si no se han agregado anuncios individuales
                if not any(r.get('page_id') == fb_page.page_id and r.get('ad_info') for r in results):

                    results.append({
                        'page_id': fb_page.page_id,
                        'page_name': fb_page.page_name,
                        'html_saved': debug_file,
                        'has_ads': bool(ad_elements),
                        'message': 'No se procesaron anuncios individuales'
                    })
                
            except Exception as e:
                logger.error(f"Error procesando la página {fb_page.page_name or 'Unknown'}: {str(e)}")
                results.append({
                    'page_id': fb_page.page_id,
                    'page_name': fb_page.page_name,
                    'error': str(e)
                })
        
        # Cerrar el navegador
        await browser.close()
    
    return results


async def extract_ad_modal_details(page, ad_id):
    """
    Extracts detailed information from the ad modal.
    
    Args:
        page: Playwright page object
        ad_id: ID of the ad being processed
        
    Returns:
        dict: Extracted information from the modal
    """
    ad_info = {"ad_id": ad_id}
    
    try:
        # Extraer el ID directamente del parámetro ad_id (limpiando el texto si es necesario)
        if isinstance(ad_id, str) and ":" in ad_id:
            clean_id = ad_id.split(":", 1)[1].strip()
            ad_info["library_id"] = clean_id
        
        # Intentar múltiples selectores para encontrar el contenedor del modal
        # Las clases de Facebook cambian frecuentemente, así que probamos varios patrones
        selectors = [
            'div[class*="x78zum5"]',  # Clase original parcial
            'div[aria-label*="anuncio"]',  # Etiqueta aria en español
            'div[aria-label*="ad details"]',  # Etiqueta aria en inglés
            'div[role="dialog"]',  # Cualquier diálogo modal
            'div.xeuugli',  # Otra clase posible
            'div[class*="modal"]'  # Clase genérica de modal
        ]
        
        target_component = None
        for selector in selectors:
            try:
                found = await page.query_selector(selector)
                if found:
                    target_component = found
                    logger.info(f"Componente de detalles encontrado con selector: {selector}")
                    break
            except Exception:
                continue
        
        # Si no encontramos el componente con los selectores específicos, usar el body como fallback
        if not target_component:
            target_component = await page.query_selector('body')
            logger.warning(f"Usando body como fallback para extraer información del anuncio ID: {ad_id}")
        
        # Buscar todos los elementos de texto para analizar su contenido
        text_elements = await target_component.query_selector_all('div, span, p')
        
        # Variables para almacenar información encontrada
        found_date = False
        found_platforms = False
        found_versions = False
        
        # Patrones para fechas en español e inglés
        date_patterns = [
            "Comenzó a publicarse", "Started running", "Fecha de inicio", "Start date",
            "Comenzó el", "Started on", "Desde el", "From", "En circulación desde"
        ]
        
        # Analizar cada elemento de texto
        all_texts = []
        for element in text_elements:
            try:
                text = await element.evaluate('(element) => element.textContent')
                if not text or len(text.strip()) < 3:  # Ignorar textos muy cortos
                    continue
                    
                all_texts.append(text.strip())
                
                # Buscar fecha de inicio con patrones más flexibles
                if not found_date:
                    for pattern in date_patterns:
                        if pattern.lower() in text.lower():
                            found_date = True
                            # Extraer la fecha después del patrón
                            parts = re.split(pattern, text, flags=re.IGNORECASE)
                            if len(parts) > 1:
                                # Obtener solo la parte de la fecha (primeras palabras después del patrón)
                                date_text = parts[1].strip()
                                # Limpiar posibles caracteres iniciales como ':', 'el', etc.
                                date_text = re.sub(r'^[:\s,el]+', '', date_text).strip()
                                
                                # Limitar la extracción hasta el cierre de la etiqueta </span> si existe
                                span_end = date_text.find('</span>')
                                if span_end > 0:
                                    date_text = date_text[:span_end].strip()
                                
                                # Limitar la extracción a solo la fecha (máximo 30 caracteres)
                                # y detener en el primer carácter no válido para una fecha
                                clean_date = ""
                                valid_chars = set("0123456789./- abcdefghijklmnopqrstuvwxyzáéíóúñ")
                                for i, char in enumerate(date_text.lower()):
                                    if i >= 30 or char not in valid_chars:
                                        break
                                    clean_date += date_text[i]
                                
                                ad_info["start_date"] = clean_date.strip()
                                logger.info(f"Fecha de inicio encontrada: {clean_date.strip()}")
                                break
            except Exception as e:
                logger.warning(f"Error al procesar elemento de texto: {e}")
                continue
                
            # Buscar plataformas (Facebook, Instagram) - evitar confusión con versiones
            if not found_platforms and ("Facebook" in text or "Instagram" in text) and not any(v in text.lower() for v in ["versiones", "versions", "version"]):
                # Extraer solo los nombres de las plataformas, no todo el texto
                platforms = []
                if "Facebook" in text:
                    platforms.append("Facebook")
                if "Instagram" in text:
                    platforms.append("Instagram")
                
                # Solo marcar como encontrado si realmente identificamos plataformas
                if platforms:
                    found_platforms = True
                    platform_text = ", ".join(platforms)
                    ad_info["platforms"] = platform_text
                    logger.info(f"Plataformas: {platform_text}")
                        
        # Si no se encontraron plataformas por texto, intentar detectarlas por atributos de imagen
        if not found_platforms:
            try:
                # Buscar elementos de imagen que puedan contener iconos de plataformas
                image_elements = await target_component.query_selector_all('img')
                platforms = []
                
                for img in image_elements:
                    try:
                        alt_text = await img.get_attribute('alt') or ''
                        aria_label = await img.get_attribute('aria-label') or ''
                        img_class = await img.get_attribute('class') or ''
                        
                        # Verificar si las propiedades de la imagen sugieren que es un icono de plataforma
                        if 'Facebook' in alt_text or 'Facebook' in aria_label:
                            platforms.append('Facebook')
                        if 'Instagram' in alt_text or 'Instagram' in aria_label:
                            platforms.append('Instagram')
                            
                    except Exception as e:
                        logger.warning(f"Error al procesar imagen para detectar plataformas: {e}")
                
                # Eliminar duplicados y actualizar información
                if platforms:
                    platforms = list(set(platforms))
                    found_platforms = True
                    platform_text = ", ".join(platforms)
                    ad_info["platforms"] = platform_text
                    logger.info(f"Plataformas detectadas por iconos: {platform_text}")
            except Exception as e:
                logger.warning(f"Error al intentar detectar plataformas por iconos: {e}")
                
                
                # Buscar información sobre versiones
                if not found_versions and any(v in text.lower() for v in ["versiones", "versions", "version"]):
                    found_versions = True
                    # Determinar si tiene múltiples versiones basado en el texto
                    has_multiple = any(num in text for num in ["2", "3", "4", "5", "6", "7", "8", "9"])
                    has_multiple = has_multiple or ("multiple" in text.lower() or "varias" in text.lower())
                    ad_info["has_versions"] = has_multiple
                    logger.info(f"Tiene múltiples versiones: {has_multiple}")
            except Exception as elem_error:
                logger.debug(f"Error al procesar elemento de texto: {str(elem_error)}")
        
        # Segundo intento para plataformas si no se encontraron
        if not found_platforms:
            # Buscar secciones específicas que puedan contener información de plataformas
            platform_keywords = ["Plataformas", "Platforms", "Platform", "Plataforma"]
            
            # Primero buscar textos que contengan palabras clave de plataformas
            platform_section_index = -1
            for i, text in enumerate(all_texts):
                if any(keyword.lower() in text.lower() for keyword in platform_keywords):
                    platform_section_index = i
                    break
            
            # Si encontramos una sección de plataformas, buscar en ese texto y en los siguientes
            if platform_section_index >= 0:
                # Buscar en el texto actual y en los 3 siguientes (si existen)
                for i in range(platform_section_index, min(platform_section_index + 4, len(all_texts))):
                    text = all_texts[i]
                    platforms = []
                    if "Facebook" in text:
                        platforms.append("Facebook")
                    if "Instagram" in text:
                        platforms.append("Instagram")
                    
                    if platforms:
                        found_platforms = True
                        platform_text = ", ".join(platforms)
                        ad_info["platforms"] = platform_text
                        logger.info(f"Plataformas (segundo intento): {platform_text}")
                        break
        
        # Tercer intento para plataformas - buscar cualquier mención de Facebook o Instagram
        if not found_platforms:
            platforms = []
            # Buscar primero en textos cortos que probablemente sean etiquetas o títulos
            for text in all_texts:
                if len(text) < 30 and ("Facebook" in text or "Instagram" in text):
                    if "Facebook" in text and "Facebook" not in platforms:
                        platforms.append("Facebook")
                    if "Instagram" in text and "Instagram" not in platforms:
                        platforms.append("Instagram")
            
            # Si no encontramos en textos cortos, buscar en cualquier texto
            if not platforms:
                for text in all_texts:
                    if "Facebook" in text and "Facebook" not in platforms:
                        platforms.append("Facebook")
                    if "Instagram" in text and "Instagram" not in platforms:
                        platforms.append("Instagram")
            
            if platforms:
                platform_text = ", ".join(platforms)
                ad_info["platforms"] = platform_text
                logger.info(f"Plataformas (tercer intento): {platform_text}")
                found_platforms = True
        
        # Segundo intento para fecha de inicio
        if not found_date:
            # Buscar patrones de fecha (dd/mm/yyyy, mm/dd/yyyy, etc.)
            date_regex_patterns = [
                r'\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}',  # dd/mm/yyyy o mm/dd/yyyy
                r'\d{1,2}\s+de\s+[a-zA-Z]+\s+de\s+\d{4}',  # dd de mes de yyyy (español)
                r'[a-zA-Z]+\s+\d{1,2},\s+\d{4}',  # mes dd, yyyy (inglés)
                r'\d{1,2}\s+[a-zA-Z]{3,10}\.?\s+\d{4}'  # dd mes. yyyy (formato abreviado)
            ]
            
            # Buscar primero en textos cortos que probablemente sean fechas
            for text in all_texts:
                if len(text) < 30:  # Probablemente una fecha o etiqueta
                    for regex in date_regex_patterns:
                        match = re.search(regex, text)
                        if match:
                            ad_info["start_date"] = match.group(0)
                            logger.info(f"Fecha de inicio (segundo intento): {match.group(0)}")
                            found_date = True
                            break
                if found_date:
                    break
            
            # Si no encontramos en textos cortos, buscar en cualquier texto
            if not found_date:
                for text in all_texts:
                    for regex in date_regex_patterns:
                        match = re.search(regex, text)
                        if match:
                            ad_info["start_date"] = match.group(0)
                            logger.info(f"Fecha de inicio (segundo intento): {match.group(0)}")
                            found_date = True
                            break
                    if found_date:
                        break
        
        # Verificar si los datos extraídos son válidos
        if 'start_date' in ad_info and len(ad_info['start_date']) > 50:
            # La fecha parece contener demasiado texto, probablemente es incorrecta
            logger.warning(f"Fecha de inicio demasiado larga, posible error: {ad_info['start_date'][:30]}...")
            ad_info['start_date'] = 'Error: fecha no válida'
        
        if 'platforms' in ad_info and len(ad_info['platforms']) > 30:
            # Las plataformas parecen contener demasiado texto
            logger.warning(f"Texto de plataformas demasiado largo, posible error: {ad_info['platforms'][:30]}...")
            # Intentar extraer solo los nombres de plataformas conocidas
            platforms = []
            if "Facebook" in ad_info['platforms']:
                platforms.append("Facebook")
            if "Instagram" in ad_info['platforms']:
                platforms.append("Instagram")
            ad_info['platforms'] = ", ".join(platforms) if platforms else 'Error: plataformas no válidas'
        
        # Imprimir la información extraída en la consola
        print(f"\n--- DETALLES DEL ANUNCIO {ad_id} ---")
        print(f"Identificador de biblioteca: {ad_info.get('library_id', 'No encontrado')}")
        print(f"Fecha de inicio: {ad_info.get('start_date', 'No encontrado')}")
        print(f"Plataformas: {ad_info.get('platforms', 'No encontrado')}")
        print(f"Tiene versiones: {ad_info.get('has_versions', 'No detectado')}")
        print("-----------------------------------\n")
        
        return ad_info
    except Exception as e:
        logger.error(f"Error al extraer detalles del modal para anuncio ID: {ad_id}: {str(e)}")
        return ad_info


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
        
        logger.info(f"Iniciando scraper de Facebook Ads: {scraper.name}")
        
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
        
        logger.info(f"Completado scraper de Facebook Ads: {scraper.name}")
        
        return {'scraper_id': scraper_id, 'status': 'completed', 'result': result}
        
    except Exception as e:
        logger.error(f"Error al ejecutar scraper de Facebook Ads {scraper_id}: {e}")
        
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
