"""
Django command to query the Meta Ad Library API using configuration models.

This command uses the Backload, Periodicload, and FacebookPage models to query the API
and save the results to a JSON file.
"""

import json
import os
import requests
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from apps.meta.models import FacebookPage


class Command(BaseCommand):
    help = "Query the Meta Ad Library API using configuration models"

    def add_arguments(self, parser):
        parser.add_argument(
            "--token", 
            required=True, 
            help="Access token for the Meta API"
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

    def handle(self, *args, **options):
        # Obtener los IDs de página
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
            ads = self.fetch_ads_for_page_ids(
                page_ids=page_ids,
                access_token=options["token"],
                ad_reached_countries=ad_reached_countries,
                content_languages=content_languages,
                media_types=media_types,
                fields=fields,
                limit=limit,
                delay=options["delay"]
            )
            
            self.stdout.write(self.style.SUCCESS(f"Total ads found: {len(ads)}"))
            
            # Save the results
            output_path = self.save_results_to_json(ads, output_dir)
            self.stdout.write(self.style.SUCCESS(f"Results saved to {output_path}"))
            
        except Exception as e:
            raise CommandError(f"Error during API query: {e}")

    def fetch_ads_for_page_ids(
        self,
        page_ids: List[str],
        access_token: str,
        ad_reached_countries: List[str],
        content_languages: List[str],
        media_types: List[str],
        fields: str,
        limit: int,
        delay: int = 2
    ) -> List[Dict[str, Any]]:
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
            List of ads
        """
        base_url = "https://graph.facebook.com/v23.0/ads_archive"
        all_ads = []
        
        # Procesar los page_ids en grupos de 10 (límite de la API)
        for i in range(0, len(page_ids), 10):
            batch_ids = page_ids[i:i+10]
            self.stdout.write(f"Querying ads for pages {i+1}-{i+len(batch_ids)} of {len(page_ids)}...")
            
            params = {
                "access_token": access_token,
                "ad_reached_countries": json.dumps(ad_reached_countries),
                "fields": fields,
                "limit": limit
            }
            
            # Añadir content_languages si se proporciona
            if content_languages:
                for idx, lang in enumerate(content_languages):
                    params[f"content_languages[{idx}]"] = json.dumps([lang])
            
            # Añadir media_types si se proporciona
            if media_types:
                for media_type in media_types:
                    params["media_type"] = media_type
            
            # Añadir search_page_ids
            params["search_page_ids"] = ",".join(batch_ids)
            
            try:
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
                self.stdout.write(self.style.ERROR(f"Error querying API for pages {batch_ids}: {e}"))
                if hasattr(e, 'response') and e.response:
                    self.stdout.write(self.style.ERROR(f"Error response: {e.response.text}"))
            
            # Small pause between batches to avoid rate limits
            time.sleep(delay)
        
        return all_ads

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
