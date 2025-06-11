#!/usr/bin/env python3
"""
Script para consultar la API de Meta Ad Library usando una lista de page IDs desde un CSV.
Guarda los resultados en un archivo JSON.

Uso:
    python fetch_meta_ads.py --csv page_ids.csv --token YOUR_ACCESS_TOKEN [opciones]
"""

import argparse
import csv
import json
import os
import requests
import time
from datetime import datetime
from typing import Dict, List, Any, Optional


def read_page_ids_from_csv(csv_path: str) -> List[str]:
    """
    Lee los IDs de página desde un archivo CSV.
    
    Args:
        csv_path: Ruta al archivo CSV
        
    Returns:
        Lista de IDs de página
    """
    page_ids = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            for row in reader:
                if row and row[0].strip():  # Asegurarse de que la fila no esté vacía
                    page_ids.append(row[0].strip())
    except Exception as e:
        print(f"Error al leer el archivo CSV: {e}")
        exit(1)
    
    return page_ids


def fetch_ads_for_page_ids(
    page_ids: List[str],
    access_token: str,
    ad_reached_countries: List[str] = ["US", "GB"],
    content_languages: List[str] = ["EN"],
    media_types: List[str] = ["MEME", "IMAGE"],
    fields: str = "impressions,page_name,spend,target_gender,ad_snapshot_url,ad_creative_link_titles,ad_delivery_start_time,demographic_distribution,estimated_audience_size",
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Consulta la API de Meta Ad Library para obtener anuncios de las páginas especificadas.
    
    Args:
        page_ids: Lista de IDs de página
        access_token: Token de acceso para la API de Meta
        ad_reached_countries: Países donde se muestran los anuncios
        content_languages: Idiomas del contenido
        media_types: Tipos de medios a incluir
        fields: Campos a incluir en la respuesta
        limit: Número máximo de anuncios por página
        
    Returns:
        Lista de anuncios
    """
    base_url = "https://graph.facebook.com/v23.0/ads_archive"
    all_ads = []
    
    # Procesar los page_ids en grupos de 10 (límite de la API)
    for i in range(0, len(page_ids), 10):
        batch_ids = page_ids[i:i+10]
        print(f"Consultando anuncios para las páginas {i+1}-{i+len(batch_ids)} de {len(page_ids)}...")
        
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
                print(f"  Encontrados {len(data['data'])} anuncios")
            else:
                print(f"  No se encontraron anuncios para este grupo de páginas")
            
            # Implementar paginación si hay más resultados
            next_page = data.get("paging", {}).get("next")
            while next_page:
                print("  Obteniendo página adicional de resultados...")
                response = requests.get(next_page)
                response.raise_for_status()
                data = response.json()
                
                if "data" in data:
                    all_ads.extend(data["data"])
                    print(f"  Encontrados {len(data['data'])} anuncios adicionales")
                
                next_page = data.get("paging", {}).get("next")
                
                # Pequeña pausa para evitar límites de tasa
                time.sleep(1)
        
        except requests.RequestException as e:
            print(f"Error al consultar la API para las páginas {batch_ids}: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Respuesta de error: {e.response.text}")
        
        # Pequeña pausa entre lotes para evitar límites de tasa
        time.sleep(2)
    
    return all_ads


def save_results_to_json(ads: List[Dict[str, Any]], output_path: Optional[str] = None) -> str:
    """
    Guarda los resultados en un archivo JSON.
    
    Args:
        ads: Lista de anuncios
        output_path: Ruta de salida para el archivo JSON (opcional)
        
    Returns:
        Ruta al archivo JSON guardado
    """
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"meta_ads_{timestamp}.json"
    
    try:
        with open(output_path, 'w', encoding='utf-8') as jsonfile:
            json.dump({
                "total_ads": len(ads),
                "timestamp": datetime.now().isoformat(),
                "ads": ads
            }, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"Resultados guardados en {output_path}")
        return output_path
    
    except Exception as e:
        print(f"Error al guardar los resultados: {e}")
        fallback_path = f"meta_ads_fallback_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(fallback_path, 'w', encoding='utf-8') as jsonfile:
                json.dump({
                    "total_ads": len(ads),
                    "timestamp": datetime.now().isoformat(),
                    "ads": ads
                }, jsonfile, indent=2, ensure_ascii=False)
            
            print(f"Resultados guardados en archivo alternativo: {fallback_path}")
            return fallback_path
        
        except Exception as e2:
            print(f"Error crítico al guardar resultados: {e2}")
            return ""


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(description="Consulta la API de Meta Ad Library usando una lista de page IDs desde un CSV")
    
    parser.add_argument("--csv", required=True, help="Ruta al archivo CSV con los IDs de página")
    parser.add_argument("--token", required=True, help="Token de acceso para la API de Meta")
    parser.add_argument("--countries", nargs="+", default=["US", "GB"], help="Países donde se muestran los anuncios")
    parser.add_argument("--languages", nargs="+", default=["EN"], help="Idiomas del contenido")
    parser.add_argument("--media-types", nargs="+", default=["MEME", "IMAGE"], help="Tipos de medios a incluir")
    parser.add_argument("--fields", default="impressions,page_name,spend,target_gender,ad_snapshot_url,ad_creative_link_titles,ad_delivery_start_time,demographic_distribution,estimated_audience_size", help="Campos a incluir en la respuesta")
    parser.add_argument("--limit", type=int, default=100, help="Número máximo de anuncios por página")
    parser.add_argument("--output", help="Ruta de salida para el archivo JSON (opcional)")
    
    args = parser.parse_args()
    
    # Leer los IDs de página desde el CSV
    page_ids = read_page_ids_from_csv(args.csv)
    print(f"Leídos {len(page_ids)} IDs de página desde {args.csv}")
    
    # Consultar la API
    ads = fetch_ads_for_page_ids(
        page_ids=page_ids,
        access_token=args.token,
        ad_reached_countries=args.countries,
        content_languages=args.languages,
        media_types=args.media_types,
        fields=args.fields,
        limit=args.limit
    )
    
    print(f"Total de anuncios encontrados: {len(ads)}")
    
    # Guardar los resultados
    save_results_to_json(ads, args.output)


if __name__ == "__main__":
    main()
