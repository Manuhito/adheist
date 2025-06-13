"""
Django command to query the Meta Ad Library API using configuration models.

This command uses the Backload and FacebookPage models to query the Meta Ads Library API
and save the results to a JSON file.
"""

import json
import os
import requests
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.meta.models import FacebookPage, MetaApiToken, Backload


class Command(BaseCommand):
    help = "Query the Meta Ad Library API using configuration models"

    def add_arguments(self, parser):
        parser.add_argument(
            "--token", 
            required=False, 
            help="Access token for the Meta API. If not provided, will use the active token from the database."
        )
        parser.add_argument(
            "--output-dir", 
            default="meta_ads_results", 
            help="Directory to save the JSON result files"
        )
        parser.add_argument(
            "--active-only", 
            action="store_true", 
            help="Query only pages marked as active"
        )
        parser.add_argument(
            "--page-ids", 
            nargs="+", 
            help="Specific page IDs to query (optional)"
        )
        parser.add_argument(
            "--delay", 
            type=int, 
            default=2, 
            help="Seconds to wait between batch queries"
        )
        # New arguments for configuration parameters
        parser.add_argument(
            "--ad-reached-countries",
            nargs="+",
            help="List of country codes where ads are shown"
        )
        parser.add_argument(
            "--content-languages",
            nargs="+",
            help="List of content language codes"
        )
        parser.add_argument(
            "--media-types",
            nargs="+",
            help="Media types to include in the search"
        )
        parser.add_argument(
            "--fields",
            help="Fields to include in the response, comma-separated"
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Maximum number of ads per page in the response"
        )
        parser.add_argument(
            "--backload-id",
            type=int,
            help="ID of the Backload object to update with error logs"
        )

    def handle(self, *args, **options):
        # Debug logs para identificar el error
        self.stdout.write("DEBUG - Command options:")
        for key, value in options.items():
            if key != "token":  # No mostrar el token por seguridad
                self.stdout.write(f"DEBUG - {key}: type={type(value)}, value={value}")
                
        # Get token from options or from the database
        token = options["token"]
        if not token:
            token = MetaApiToken.get_active_token()
            if not token:
                raise CommandError("No token provided and no active token found in the database. Please provide a token or add one in the admin.")
            self.stdout.write(f"Using active token from database")
            
        # Obtener IDs de página
        if options["page_ids"]:
            page_ids = options["page_ids"]
            self.stdout.write(f"Using {len(page_ids)} page IDs provided via command line")
        else:
            # Filtrar páginas según la opción active-only
            pages_query = FacebookPage.objects.all()
            if options["active_only"]:
                pages_query = pages_query.filter(is_active=True)
            
            # Obtener los IDs de página
            pages = pages_query.values_list('page_id', flat=True)
            page_ids = list(pages)
            
            if not page_ids:
                raise CommandError("No page IDs found. Add pages in the admin or provide IDs with --page-ids")
            
            self.stdout.write(f"Using {len(page_ids)} page IDs from the database")

        # Crear el directorio de salida si no existe
        output_dir = options["output_dir"]
        os.makedirs(output_dir, exist_ok=True)
        
        # Configure API parameters
        ad_reached_countries = options.get("ad_reached_countries") or ["US", "GB"]
        content_languages = options.get("content_languages") or ["EN"]
        media_types = options.get("media_types") or ["MEME", "IMAGE"]
        fields = options.get("fields") or "page_name,ad_creative_bodies,ad_snapshot_url,impressions,spend"
        limit = options.get("limit") or 100
        
        # Consultar la API y guardar los resultados
        try:
            ads, error_messages = self.fetch_ads_for_page_ids(
                page_ids=page_ids,
                access_token=token,
                ad_reached_countries=ad_reached_countries,
                content_languages=content_languages,
                media_types=media_types,
                fields=fields,
                limit=limit,
                delay=options["delay"]
            )
            
            self.stdout.write(self.style.SUCCESS(f"Total ads found: {len(ads)}"))
            
            # Save the results
            output_file = self.save_results_to_json(ads, output_dir)
            self.stdout.write(self.style.SUCCESS(f"Results saved to {output_file}"))
            
            # Update Backload object with error logs if provided
            backload_id = options.get("backload_id")
            if backload_id:
                try:
                    backload = Backload.objects.get(id=backload_id)
                    backload.error_log = "\n".join(error_messages)
                    backload.save()
                    self.stdout.write(self.style.SUCCESS(f"Error logs saved to Backload {backload_id}"))
                except Backload.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"Backload {backload_id} not found"))
            
            # Return any error messages
            return error_messages
            
        except Exception as e:
            raise CommandError(f"Error during API query: {e}")

    def fetch_ads_for_page_ids(
        self,
        page_ids: List[str],
        access_token: str,
        ad_reached_countries: List[str] = None,
        content_languages: List[str] = None,
        media_types: List[str] = None,
        fields: str = None,
        limit: int = 100,
        delay: int = 2
    ) -> tuple[List[Dict[str, Any]], List[str]]:
        """
        Query the Meta Ad Library API to get ads for the specified pages.
        
        Args:
            page_ids: List of page IDs
            access_token: Access token for the Meta API
            ad_reached_countries: Countries where ads are shown
            content_languages: Content languages
            media_types: Media types to include
            fields: Fields to include in the response
            limit: Maximum number of ads per page
            delay: Seconds to wait between batches
            
        Returns:
            Tuple containing (list of ads, list of error messages)
        """
        base_url = "https://graph.facebook.com/v23.0/ads_archive"
        all_ads = []
        error_messages = []
        
        # Procesar los page_ids en grupos de 10 (límite de la API)
        for i in range(0, len(page_ids), 10):
            batch_ids = page_ids[i:i+10]
            self.stdout.write(f"Querying ads for pages {i+1}-{i+len(batch_ids)} of {len(page_ids)}...")
            
            # Debug logs para identificar el error
            self.stdout.write("DEBUG - fetch_ads_for_page_ids parameters:")
            self.stdout.write(f"DEBUG - ad_reached_countries: type={type(ad_reached_countries)}, value={ad_reached_countries}")
            self.stdout.write(f"DEBUG - content_languages: type={type(content_languages)}, value={content_languages}")
            self.stdout.write(f"DEBUG - media_types: type={type(media_types)}, value={media_types}")
            self.stdout.write(f"DEBUG - fields: type={type(fields)}, value={fields}")
            self.stdout.write(f"DEBUG - limit: type={type(limit)}, value={limit}")
        
            # Construir los parámetros exactamente como en Postman
            params = {
                "access_token": access_token,
                "fields": fields,
                "limit": limit
            }
            
            # Añadir parámetros en el mismo orden que Postman
            if ad_reached_countries:
                try:
                    self.stdout.write(f"DEBUG - Processing ad_reached_countries: {ad_reached_countries}")
                    # Manejar el campo ad_reached_countries que ahora es un TextField con JSON
                    if isinstance(ad_reached_countries, str):
                        # Si es un string, verificar si ya es JSON o necesita ser parseado
                        if ad_reached_countries.startswith('[') and ad_reached_countries.endswith(']'):
                            # Ya es una cadena JSON, usarla directamente
                            params["ad_reached_countries"] = ad_reached_countries
                        else:
                            try:
                                # Intentar parsear como JSON
                                countries = json.loads(ad_reached_countries)
                                params["ad_reached_countries"] = json.dumps(countries)
                            except json.JSONDecodeError:
                                # Si no es JSON válido, tratarlo como un solo país
                                params["ad_reached_countries"] = f'["{ad_reached_countries}"]'
                    elif isinstance(ad_reached_countries, list):
                        # Si es una lista, convertirla a JSON
                        params["ad_reached_countries"] = json.dumps(ad_reached_countries)
                    else:
                        # Valor por defecto: todos los países
                        all_countries = ["BR","IN","GB","US","CA","AR","AU","AT","BE","CL","CN","CO","HR","DK","DO","EG","FI","FR","DE","GR","HK","ID","IE","IL","IT","JP","JO","KW","LB","MY","MX","NL","NZ","NG","NO","PK","PA","PE","PH","PL","RU","SA","RS","SG","ZA","KR","ES","SE","CH","TW","TH","TR","AE","VE","PT","LU","BG","CZ","SI","IS","SK","LT","TT","BD","LK","KE","HU","MA","CY","JM","EC","RO","BO","GT","CR","QA","SV","HN","NI","PY","UY","PR","BA","PS","TN","BH","VN","GH","MU","UA","MT","BS","MV","OM","MK","LV","EE","IQ","DZ","AL","NP","MO","ME","SN","GE","BN","UG","GP","BB","AZ","TZ","LY","MQ","CM","BW","ET","KZ","NA","MG","NC","MD","FJ","BY","JE","GU","YE","ZM","IM","HT","KH","AW","PF","AF","BM","GY","AM","MW","AG","RW","GG","GM","FO","LC","KY","BJ","AD","GD","VI","BZ","VC","MN","MZ","ML","AO","GF","UZ","DJ","BF","MC","TG","GL","GA","GI","CD","KG","PG","BT","KN","SZ","LS","LA","LI","MP","SR","SC","VG","TC","DM","MR","AX","SM","SL","NE","CG","AI","YT","CV","GN","TM","BI","TJ","VU","SB","ER","WS","AS","FK","GQ","TO","KM","PW","FM","CF","SO","MH","VA","TD","KI","ST","TV","NR","RE","LR","ZW","CI","MM","AN","AQ","BQ","BV","IO","CX","CC","CK","CW","TF","GW","HM","XK","MS","NU","NF","PN","BL","SH","MF","PM","SX","GS","SS","SJ","TL","TK","UM","WF","EH"]
                        params["ad_reached_countries"] = json.dumps(all_countries)
                    self.stdout.write(f"DEBUG - Final ad_reached_countries param: {params['ad_reached_countries']}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"ERROR processing ad_reached_countries: {e}"))
                    # En caso de error, usar el valor por defecto
                    all_countries = ["BR","IN","GB","US","CA","AR","AU","AT","BE","CL","CN","CO","HR","DK","DO","EG","FI","FR","DE","GR","HK","ID","IE","IL","IT","JP","JO","KW","LB","MY","MX","NL","NZ","NG","NO","PK","PA","PE","PH","PL","RU","SA","RS","SG","ZA","KR","ES","SE","CH","TW","TH","TR","AE","VE","PT","LU","BG","CZ","SI","IS","SK","LT","TT","BD","LK","KE","HU","MA","CY","JM","EC","RO","BO","GT","CR","QA","SV","HN","NI","PY","UY","PR","BA","PS","TN","BH","VN","GH","MU","UA","MT","BS","MV","OM","MK","LV","EE","IQ","DZ","AL","NP","MO","ME","SN","GE","BN","UG","GP","BB","AZ","TZ","LY","MQ","CM","BW","ET","KZ","NA","MG","NC","MD","FJ","BY","JE","GU","YE","ZM","IM","HT","KH","AW","PF","AF","BM","GY","AM","MW","AG","RW","GG","GM","FO","LC","KY","BJ","AD","GD","VI","BZ","VC","MN","MZ","ML","AO","GF","UZ","DJ","BF","MC","TG","GL","GA","GI","CD","KG","PG","BT","KN","SZ","LS","LA","LI","MP","SR","SC","VG","TC","DM","MR","AX","SM","SL","NE","CG","AI","YT","CV","GN","TM","BI","TJ","VU","SB","ER","WS","AS","FK","GQ","TO","KM","PW","FM","CF","SO","MH","VA","TD","KI","ST","TV","NR","RE","LR","ZW","CI","MM","AN","AQ","BQ","BV","IO","CX","CC","CK","CW","TF","GW","HM","XK","MS","NU","NF","PN","BL","SH","MF","PM","SX","GS","SS","SJ","TL","TK","UM","WF","EH"]
                    params["ad_reached_countries"] = json.dumps(all_countries)
                    
            if content_languages:
                try:
                    self.stdout.write(f"DEBUG - Processing content_languages: {content_languages}")
                    # Usar solo el primer idioma como valor simple, no como lista JSON
                    if isinstance(content_languages, list) and content_languages:
                        params["languages"] = content_languages[0]
                    elif isinstance(content_languages, str):
                        params["languages"] = content_languages
                    else:
                        params["languages"] = "EN"  # Valor por defecto
                    self.stdout.write(f"DEBUG - Final languages param: {params['languages']}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"ERROR processing content_languages: {e}"))
                    params["languages"] = "EN"  # Valor por defecto en caso de error
            
            if media_types:
                try:
                    self.stdout.write(f"DEBUG - Processing media_types: {media_types}")
                    # Usar solo el primer tipo de medio como valor simple, no como lista JSON
                    if isinstance(media_types, list) and media_types:
                        params["media_type"] = media_types[0]
                    elif isinstance(media_types, str):
                        params["media_type"] = media_types
                    else:
                        params["media_type"] = "MEME"  # Valor por defecto
                    self.stdout.write(f"DEBUG - Final media_type param: {params['media_type']}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"ERROR processing media_types: {e}"))
                    params["media_type"] = "MEME"  # Valor por defecto en caso de error
                
            # Añadir page_ids al final como en Postman
            params["search_page_ids"] = json.dumps(batch_ids)
            
            try:
                # Construir la URL completa para el log (sin el token)
                log_params = params.copy()
                log_params["access_token"] = "[TOKEN_HIDDEN]"
                log_url = base_url + "?" + "&".join([f"{k}={v}" for k, v in log_params.items()])
                self.stdout.write(f"  API Call URL: {log_url}")
                
                # Realizar la consulta a la API
                response = requests.get(base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if "data" in data:
                    all_ads.extend(data["data"])
                    self.stdout.write(f"  Found {len(data['data'])} ads")
                else:
                    self.stdout.write(self.style.WARNING(f"  No ads found for this group of pages"))
                    
                # Implementar paginación si hay más resultados
                next_page = data.get("paging", {}).get("next")
                while next_page:
                    self.stdout.write("  Getting additional page of results...")
                    # Log de la URL de paginación (ocultando el token)
                    log_next_page = next_page.replace(access_token, "[TOKEN_HIDDEN]")
                    self.stdout.write(f"  API Call URL (pagination): {log_next_page}")
                    
                    response = requests.get(next_page)
                    response.raise_for_status()
                    data = response.json()
                    
                    if "data" in data:
                        all_ads.extend(data["data"])
                        self.stdout.write(f"  Found {len(data['data'])} additional ads")
                    
                    next_page = data.get("paging", {}).get("next")
                    
                    # Small pause to avoid rate limits
                    time.sleep(1)
            
            except requests.RequestException as e:
                error_msg = f"Error querying API for pages {batch_ids}: {e}"
                self.stdout.write(self.style.ERROR(error_msg))
                error_messages.append(error_msg)
                
                if hasattr(e, 'response') and e.response:
                    try:
                        error_json = e.response.json()
                        error_details = f"Error details: {json.dumps(error_json, indent=2)}"
                        self.stdout.write(self.style.ERROR(error_details))
                        error_messages.append(error_details)
                    except:
                        error_response = f"Error response: {e.response.text}"
                        self.stdout.write(self.style.ERROR(error_response))
                        error_messages.append(error_response)
                        
                # Mostrar la URL exacta que causó el error (sin el token)
                error_url = e.request.url.replace(access_token, "[TOKEN_HIDDEN]")
                failed_url = f"Failed URL: {error_url}"
                self.stdout.write(self.style.ERROR(failed_url))
                error_messages.append(failed_url)
            
            # Small pause between batches to avoid rate limits
            time.sleep(delay)
        
        return all_ads, error_messages

    def save_results_to_json(self, ads: List[Dict[str, Any]], output_dir: str) -> str:
        """
        Save the results to a JSON file.
        
        Args:
            ads: List of ads
            output_dir: Directory to save the JSON file
            
        Returns:
            Path to the saved JSON file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f"meta_ads_{timestamp}.json")
        
        try:
            with open(output_path, 'w', encoding='utf-8') as jsonfile:
                json.dump({
                    "total_ads": len(ads),
                    "timestamp": datetime.now().isoformat(),
                    "ads": ads
                }, jsonfile, indent=2, ensure_ascii=False)
            
            return output_path
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error saving results: {e}"))
            fallback_path = os.path.join(output_dir, f"meta_ads_fallback_{timestamp}.json")
            
            try:
                with open(fallback_path, 'w', encoding='utf-8') as jsonfile:
                    json.dump({
                        "total_ads": len(ads),
                        "timestamp": datetime.now().isoformat(),
                        "ads": ads
                    }, jsonfile, indent=2, ensure_ascii=False)
                
                self.stdout.write(self.style.WARNING(f"Results saved to fallback file: {fallback_path}"))
                return fallback_path
            
            except Exception as e2:
                self.stdout.write(self.style.ERROR(f"Critical error saving results: {e2}"))
                return ""
