"""
Services for AI interface operations.
"""
from typing import Dict, List, Optional, Union

from django.conf import settings
from openai import OpenAI
import os
import requests


class ImageGenerationService:
    """Service for generating images using OpenAI's GPT-4o and gpt-image-1 models."""

    def __init__(self):
        """Initialize the service with OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def test_openai_connection(self):
        """
        Tests the OpenAI image generation endpoint using the gpt-image-1 model.
        Returns True if the API is reachable and responds with an image URL.
        Raises Exception on failure.
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        url = "https://api.openai.com/v1/images/generations"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        data = {
            "model": "gpt-image-1",
            "prompt": "A red apple",
            "n": 1,
            "size": "1024x1024",
            "output_format": "webp"
        }
        response = requests.post(url, headers=headers, json=data, timeout=300)
        if response.status_code == 200:
            result = response.json()
            print(result)
            if "data" in result and result["data"] and "b64_json" in result["data"][0]:
                return True
            else:
                raise Exception("No image URL returned in response")
        else:
            raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")

    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
    ) -> dict:
        """
        Generate an image using the gpt-image-1 model via OpenAI's API.
        Args:
            text_prompt: The text prompt describing the image to generate.
            canvas_size: The desired image size (e.g., "1024x1024").
        Returns:
            A dictionary containing the image data ("b64_json" or "url" if present).
        Raises:
            Exception if the API call fails or no image is returned.
        """

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        if not image_urls or not image_urls[0]:
            raise ValueError("At least one image URL or file path must be provided for edit mode.")

        import tempfile
        import shutil
        from urllib.parse import urlparse
        import requests
        from PIL import Image
        import io

        image_source = image_urls[0]
        temp_image_path = None
        image_file = None
        try:
            # Download or open the image in its original format if compatible
            # gpt-image-1 accepts PNG, WebP, or JPG files
            supported_formats = ["PNG", "WEBP", "JPEG", "JPG"]
            
            if urlparse(image_source).scheme in ("http", "https"):
                resp = requests.get(image_source, stream=True)
                resp.raise_for_status()
                
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
                content_type = f"image/{img_format.lower()}"
            else:
                # Assume local file path
                img = Image.open(image_source)
                img_format = img.format
                
                if img_format in supported_formats:
                    # Use original file if format is supported
                    image_file = open(image_source, "rb")
                    content_type = f"image/{img_format.lower()}"
                else:
                    # Convert to PNG if not supported
                    temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                    img.save(temp_image, format="PNG")
                    temp_image_path = temp_image.name
                    temp_image.close()
                    image_file = open(temp_image_path, "rb")
                    content_type = "image/png"

            edit_url = "https://api.openai.com/v1/images/edits"
            headers = {
                "Authorization": f"Bearer {api_key}"
            }
            data = {
                "model": "gpt-image-1",
                "prompt": text_prompt,
                "n": 1,
                "size": canvas_size
                # gpt-image-1 siempre devuelve base64, no se puede especificar response_format
            }
            # Usar el nombre de archivo con la extensión correcta basada en el formato
            file_extension = ".png" if img_format == "PNG" else ".webp" if img_format == "WEBP" else ".jpg"
            filename = f"image{file_extension}"
            
            files = {
                "image": (filename, image_file, content_type)
            }
            response = requests.post(edit_url, headers=headers, data=data, files=files, timeout=300)
            if response.status_code == 200:
                result = response.json()
                if "data" in result and result["data"]:
                    # Obtener el primer elemento de data
                    image_data = result["data"][0]
                    
                    # gpt-image-1 siempre devuelve base64, así que debemos extraer b64_json
                    if "b64_json" not in image_data:
                        raise Exception("No b64_json found in response. gpt-image-1 should always return base64-encoded images.")
                    
                    # Obtener los datos base64
                    b64_data = image_data["b64_json"]
                    
                    # Convertir base64 a bytes
                    import base64
                    image_bytes = base64.b64decode(b64_data)
                    
                    # Construir la respuesta en un formato que adrequest_version_create pueda usar
                    # Proporcionamos directamente los bytes de la imagen para un procesamiento más eficiente
                    formatted_response = {
                        # Incluimos los bytes de la imagen para que adrequest_version_create
                        # pueda guardarlos directamente sin necesidad de descargar una URL
                        "image_content": image_bytes,
                        "is_binary": True,  # Indicador de que estamos enviando datos binarios
                        
                        # Como ya no estamos usando GPT-4o para mejorar el prompt,
                        # simplemente pasamos el prompt original
                        "enhanced_prompt": text_prompt,
                        
                        # Incluir algunos metadatos básicos
                        "response_metadata": {
                            "model": "gpt-image-1",
                            "canvas_size": canvas_size,
                            "edit_mode": True,
                            "created_at": None
                        }
                    }
                    
                    return formatted_response
                else:
                    raise Exception("No image data returned in response")
            else:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
        finally:
            if image_file:
                image_file.close()
            if temp_image_path:
                try:
                    os.unlink(temp_image_path)
                except Exception:
                    pass

