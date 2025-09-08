"""
Services for AI interface operations.
"""
from typing import Dict, List, Optional, Union

from django.conf import settings
from openai import OpenAI
import os
import requests

from apps.ads.models import AppConfiguration
from apps.aiinterface.models import OpenAIConfiguration



class ImageGenerationService:
    """Service for generating images using OpenAI's GPT-5 and gpt-image-1 models."""

    def __init__(self):
        """Initialize the service with OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def test_openai_connection(self):
        """
        Tests the OpenAI image generation endpoint using the configured image model.

        Returns:
            dict: Response from the OpenAI API
        """
        try:
            # Get model from AppConfiguration
            openai_config = OpenAIConfiguration.get_config()
            
            response = self.client.images.generate(
                model=openai_config.openai_image_model,
                prompt="A simple test image of a blue circle",
                n=1,
                size="1024x1024"
            )
            return response
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
    ) -> dict:
        """
        Generate an image using the configured image model via OpenAI's API.
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs or file paths to use as input (up to 16 images).
            canvas_size: The desired image size (e.g., "1024x1024").
        Returns:
            A dictionary containing the image data ("b64_json" or "url" if present).
        Raises:
            Exception if the API call fails or no image is returned.
        """
        # Log de las imágenes recibidas
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received image_urls: {image_urls}")

        if not image_urls:
            return {
                "error": "At least one image URL or file path must be provided for edit mode.",
                "status_code": 400
            }

        import tempfile
        from urllib.parse import urlparse
        import requests
        from PIL import Image
        import io
        import base64

        # Limitar a un máximo de 16 imágenes según la documentación de OpenAI
        image_urls = image_urls[:16]
        
        # Lista para almacenar los archivos temporales y objetos de archivo
        temp_image_paths = []
        image_files = []
        
        try:
            # Procesar cada imagen en la lista
            supported_formats = ["PNG", "WEBP", "JPEG", "JPG"]
            
            for i, image_source in enumerate(image_urls):
                temp_image_path = None
                
                if urlparse(image_source).scheme in ("http", "https"):
                    try:
                        resp = requests.get(image_source, stream=True)
                        resp.raise_for_status()
                    except requests.exceptions.RequestException as e:
                        return {
                            "error": f"Error downloading image {i+1}: {str(e)}",
                            "status_code": getattr(e.response, 'status_code', 500) if hasattr(e, 'response') else 500
                        }
                    
                    img = Image.open(io.BytesIO(resp.content))
                    img_format = img.format
                    
                    # Keep original format if supported, otherwise convert to PNG
                    if img_format in supported_formats:
                        # Save with original format
                        extension = f".{img_format.lower()}"
                        temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
                        img.save(temp_image, format=img_format)
                        temp_image_path = temp_image.name
                        temp_image.close()
                    else:
                        # Convert to PNG if not supported
                        temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                        img.save(temp_image, format="PNG")
                        temp_image_path = temp_image.name
                        temp_image.close()
                        img_format = "PNG"
                    
                    image_file = open(temp_image_path, "rb")
                else:
                    # Assume local file path
                    img = Image.open(image_source)
                    img_format = img.format
                    
                    if img_format in supported_formats:
                        # Use original file if format is supported
                        image_file = open(image_source, "rb")
                    else:
                        # Convert to PNG if not supported
                        temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                        img.save(temp_image, format="PNG")
                        temp_image_path = temp_image.name
                        temp_image.close()
                        image_file = open(temp_image_path, "rb")
                
                # Guardar la ruta temporal para limpiarla después
                if temp_image_path:
                    temp_image_paths.append(temp_image_path)
                
                # Guardar el objeto de archivo para cerrarlo después
                image_files.append(image_file)
            
            # Get model from AppConfiguration
            openai_config = OpenAIConfiguration.get_config()
            
            # Log de las imágenes que se van a enviar
            logger.info(f"Sending {len(image_files)} images to OpenAI")
            for i, img_file in enumerate(image_files):
                try:
                    # Obtener información básica del archivo
                    file_pos = img_file.tell()
                    img_file.seek(0, 2)  # Ir al final para obtener el tamaño
                    file_size = img_file.tell()
                    img_file.seek(file_pos)  # Volver a la posición original
                    logger.info(f"Image {i+1}: {getattr(img_file, 'name', 'unknown')} - Size: {file_size} bytes")
                except Exception as e:
                    logger.error(f"Error getting info for image {i+1}: {str(e)}")
            
            # Usar el cliente oficial de OpenAI como en el ejemplo de la documentación
            # Esto maneja correctamente el envío de múltiples imágenes
            try:
                logger.info(f"Calling OpenAI API with model: {openai_config.openai_image_model}, prompt length: {len(text_prompt)}, canvas size: {canvas_size}")
                response = self.client.images.edit(
                    model=openai_config.openai_image_model,
                    image=image_files,  # Pasar la lista de archivos de imagen
                    prompt=text_prompt,
                    n=1,
                    size=canvas_size
                )
            except Exception as e:
                return {
                    "error": f"Error making request to OpenAI API: {str(e)}",
                    "status_code": 500
                }
            # El cliente de OpenAI devuelve un objeto de respuesta diferente al de requests
            # Extraemos el b64_json de la respuesta
            if hasattr(response, 'data') and response.data:
                # Obtener el primer elemento de data
                image_data = response.data[0]
                
                # gpt-image-1 siempre devuelve base64, así que debemos extraer b64_json
                if not hasattr(image_data, 'b64_json'):
                    raise Exception("No b64_json found in response. gpt-image-1 should always return base64-encoded images.")
                
                # Obtener los datos base64
                b64_data = image_data.b64_json
                
                # Convertir base64 a bytes
                image_bytes = base64.b64decode(b64_data)
                
                # Construir la respuesta en un formato que adrequest_version_create pueda usar
                # Proporcionamos directamente los bytes de la imagen para un procesamiento más eficiente
                
                # Extraer la información de uso si está disponible en la respuesta
                usage_data = {}
                if hasattr(response, 'usage'):
                    usage_data = response.usage
                
                formatted_response = {
                    # Incluimos los bytes de la imagen para que adrequest_version_create
                    # pueda guardarlos directamente sin necesidad de descargar una URL
                    "image_content": image_bytes,
                    "is_binary": True,  # Indicador de que estamos enviando datos binarios
                    
                    # Pasamos el prompt original
                    "enhanced_prompt": text_prompt,
                    
                    # Incluir metadatos incluyendo la información de uso
                    "response_metadata": {
                        "model": openai_config.openai_image_model,
                        # Añadir toda la información de uso de la API
                        "usage": usage_data
                    }
                }
                
                return formatted_response
            else:
                error_message = "No image data returned in response"
                return {
                    "error": error_message,
                    "response_data": str(response),
                    "status_code": 500
                }
        finally:
            # Cerrar todos los archivos de imagen
            for image_file in image_files:
                try:
                    if image_file:
                        image_file.close()
                except Exception:
                    pass
            
            # Eliminar todos los archivos temporales
            for temp_path in temp_image_paths:
                try:
                    if temp_path:
                        os.unlink(temp_path)
                except Exception:
                    pass

