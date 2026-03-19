"""
Services for AI interface operations.
"""
from typing import Dict, List, Optional, Union
import logging
import time

from django.conf import settings
from openai import OpenAI
import os
import requests

from apps.ads.models import AppConfiguration
from apps.aiinterface.models import OpenAIConfiguration, ReplicateConfiguration

logger = logging.getLogger(__name__)



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
                    # Convertir el objeto Usage a diccionario para serialización
                    usage_obj = response.usage
                    usage_data = {
                        'input_tokens': usage_obj.input_tokens if hasattr(usage_obj, 'input_tokens') else 0,
                        'output_tokens': usage_obj.output_tokens if hasattr(usage_obj, 'output_tokens') else 0,
                        'total_tokens': usage_obj.total_tokens if hasattr(usage_obj, 'total_tokens') else 0,
                    }
                    
                    # Añadir detalles de tokens de entrada si están disponibles
                    if hasattr(usage_obj, 'input_tokens_details') and usage_obj.input_tokens_details:
                        details = usage_obj.input_tokens_details
                        usage_data['input_tokens_details'] = {
                            'text_tokens': details.text_tokens if hasattr(details, 'text_tokens') else 0,
                            'image_tokens': details.image_tokens if hasattr(details, 'image_tokens') else 0,
                        }
                
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
                        # Añadir toda la información de uso de la API (ahora como dict)
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


class ReplicateImageGenerationService:
    """Service for generating images using Replicate API (nano-banana)."""

    def __init__(self):
        """Initialize the service with Replicate API configuration."""
        self.api_key = settings.REPLICATE_API_KEY
        
        if not self.api_key:
            raise ValueError("REPLICATE_API_KEY is not configured in settings")

    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
    ) -> dict:
        """
        Generate an image using Replicate API with nano-banana model.
        
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs or file paths to use as input.
            canvas_size: The desired image size (e.g., "1024x1024").
        
        Returns:
            A dictionary containing the image data and metadata.
        """
        logger.info(f"Starting Replicate nano-banana image generation with prompt: {text_prompt[:50]}...")
        
        if not image_urls:
            return {
                "error": "At least one image URL or file path must be provided",
                "status_code": 400
            }

        try:
            import replicate
        except ImportError:
            return {
                "error": "replicate package is not installed. Run: pip install replicate",
                "status_code": 500
            }

        # Get configuration
        replicate_config = ReplicateConfiguration.get_replicate_config()
        model = replicate_config['image_replicate_model']
        
        start_time = time.time()
        
        try:
            # Set API token
            os.environ['REPLICATE_API_TOKEN'] = self.api_key
            
            # Prepare image_input - nano-banana expects URLs
            # If we have local file paths, we need to convert them to URLs
            processed_image_urls = []
            for image_source in image_urls:
                from urllib.parse import urlparse
                if urlparse(image_source).scheme in ("http", "https"):
                    # Already a URL
                    processed_image_urls.append(image_source)
                else:
                    # Local file - we need to upload it or convert to URL
                    # For now, log a warning and skip
                    logger.warning(f"Local file paths not supported for nano-banana: {image_source}")
                    return {
                        "error": "nano-banana requires image URLs, not local file paths",
                        "status_code": 400
                    }
            
            if not processed_image_urls:
                return {
                    "error": "No valid image URLs provided",
                    "status_code": 400
                }
            
            # Build input for nano-banana
            input_data = {
                "prompt": text_prompt,
                "image_input": processed_image_urls
            }
            
            logger.info(f"Calling Replicate with model: {model}")
            logger.info(f"Input: prompt={text_prompt[:50]}..., images={len(processed_image_urls)}")
            
            # Run the model
            output = replicate.run(
                model,
                input=input_data
            )
            
            # nano-banana returns a string URL directly
            if isinstance(output, str):
                image_url = output
            elif hasattr(output, 'url'):
                # Some models return FileOutput objects
                image_url = output.url() if callable(output.url) else output.url
            else:
                return {
                    "error": f"Unexpected output format from nano-banana: {type(output)}",
                    "status_code": 500
                }
            
            logger.info(f"Downloading generated image from: {image_url}")
            
            # Download the image
            img_response = requests.get(image_url, timeout=60)
            img_response.raise_for_status()
            image_bytes = img_response.content
            
            # Calculate generation time
            generation_time = time.time() - start_time
            
            # Build response
            formatted_response = {
                "image_content": image_bytes,
                "is_binary": True,
                "enhanced_prompt": text_prompt,
                "response_metadata": {
                    "model": model,
                    "service": "replicate",
                    "service_type": "nano-banana",
                    "generation_time_seconds": round(generation_time, 2),
                    "image_url": image_url,
                    "costs": {
                        "image_generation_cost": float(replicate_config['image_generation_price']),
                        "total_cost": float(replicate_config['image_generation_price'])
                    }
                }
            }
            
            logger.info(f"Image generated successfully in {generation_time:.2f}s")
            return formatted_response
            
        except replicate.exceptions.ReplicateError as e:
            raw_error = str(e)
            prediction = getattr(e, "prediction", None)

            prediction_id = None
            prediction_status = None
            prediction_error = None
            prediction_logs = None

            if prediction:
                if isinstance(prediction, dict):
                    prediction_id = prediction.get("id")
                    prediction_status = prediction.get("status")
                    prediction_error = prediction.get("error")
                    prediction_logs = prediction.get("logs")
                else:
                    prediction_id = getattr(prediction, "id", None)
                    prediction_status = getattr(prediction, "status", None)
                    prediction_error = getattr(prediction, "error", None)
                    prediction_logs = getattr(prediction, "logs", None)

            combined_error_text = " | ".join(
                part for part in [raw_error, str(prediction_error or ""), str(prediction_logs or "")] if part
            ).lower()

            is_throttled = (
                "status: 429" in combined_error_text
                or "request was throttled" in combined_error_text
                or "rate limited" in combined_error_text
            )
            is_timeout = (
                "readtimeout" in combined_error_text
                or "timeout" in combined_error_text
                or "timed out" in combined_error_text
            )
            is_transient_failure = (
                "temporar" in combined_error_text
                or "connection reset" in combined_error_text
                or "upstream" in combined_error_text
                or "internal server error" in combined_error_text
                or "status: 5" in combined_error_text
            )

            is_retryable = is_throttled or is_timeout or is_transient_failure
            status_code = 429 if is_throttled else 500

            error_msg = (
                f"Replicate API error: {raw_error or 'No message provided'}"
                f" | prediction_id={prediction_id}"
                f" | prediction_status={prediction_status}"
                f" | prediction_error={prediction_error or ''}"
            )
            logger.exception(error_msg)

            return {
                "error": error_msg,
                "status_code": status_code,
                "is_retryable": is_retryable,
                "error_type": "replicate_api_error",
                "prediction_id": prediction_id,
                "prediction_status": prediction_status,
                "prediction_error": prediction_error,
                "prediction_logs": (prediction_logs[:1000] if isinstance(prediction_logs, str) else prediction_logs),
            }
        except Exception as e:
            raw_error = str(e)
            lowered = raw_error.lower()
            is_retryable = (
                "timeout" in lowered
                or "timed out" in lowered
                or "temporar" in lowered
                or "connection reset" in lowered
            )

            error_msg = (
                f"Unexpected error in Replicate nano-banana service: {raw_error}"
                f" | error_type={type(e).__name__}"
            )
            logger.exception(error_msg)
            return {
                "error": error_msg,
                "status_code": 500,
                "is_retryable": is_retryable,
                "error_type": type(e).__name__,
            }


class ReplicateTextGenerationService:
    """Service for generating text using Replicate API (e.g., Gemini)."""

    def __init__(self):
        """Initialize the service with Replicate API configuration."""
        self.api_key = settings.REPLICATE_API_KEY
        
        if not self.api_key:
            raise ValueError("REPLICATE_API_KEY is not configured in settings")

    def generate_competitors(self, website_url: str) -> List[str]:
        """
        Generate a list of competitors for a given website using Replicate.
        
        Args:
            website_url: The website URL to analyze.
            
        Returns:
            List of Facebook Page URLs of competitors.
        """
        logger.info(f"Starting competitor research for website: {website_url}")
        
        try:
            import replicate
        except ImportError:
            logger.error("replicate package is not installed")
            return []

        # Get configuration
        replicate_config = ReplicateConfiguration.get_replicate_config()
        model = replicate_config.get('competitor_research_model', 'google/gemini-3-pro')
        
        try:
            # Set API token
            os.environ['REPLICATE_API_TOKEN'] = self.api_key
            
            prompt = f"""Your job is to find 5 competitors or larger companies for the website:
{website_url}
If it is a local business, search for a chain, franchise or larger USA version of the business like one in a very competitive location like New York.
Prioritise sites that are known to run Facebook ads or have large marketing teams.
Example: For 'Jims Coffee shop in Tralee', you can suggest Starbucks.
You must go the website of the competitors, open the websites and find their facebook page from there.
if the facebook page link is not listed in the website, you must do a google search but you must have 100% confidence the facebook page url from the google search matches the actual businesses.
Output must be a valid JSON list of strings, where each string is a Facebook Page URL. Do not include markdown formatting like ```json.
Example:
[
    "https://www.facebook.com/example1",
    "https://www.facebook.com/example2"
]
Do not include any other text or commentary.
"""
            
            logger.info(f"Calling Replicate with model: {model} for competitor research")
            logger.info(f"Replicate prompt: {prompt}")
            
            # Run the model
            output = replicate.run(
                model,
                input={
                    "prompt": prompt,
                    "max_tokens": 1024,
                    "temperature": 0.5
                }
            )
            
            logger.info(f"Raw Replicate output type: {type(output)}")
            logger.info(f"Raw Replicate output: {output}")
            
            # Handle output
            response_text = ""
            if isinstance(output, list):
                # Handle potential non-string items (like FileOutput) in list
                response_text = "".join([str(item) for item in output])
            elif isinstance(output, str):
                response_text = output
            else:
                # Some models return iterators
                response_text = "".join([str(chunk) for chunk in output])
                
            logger.info(f"Replicate response: {response_text[:200]}...")
            
            valid_urls = []
            
            # Try to parse as JSON first
            import json
            import re
            
            # Clean markdown code blocks if present
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            cleaned_text = cleaned_text.strip()
            
            try:
                json_urls = json.loads(cleaned_text)
                if isinstance(json_urls, list):
                    for url in json_urls:
                        if isinstance(url, str) and "facebook.com" in url:
                            valid_urls.append(url)
                    logger.info(f"Successfully parsed JSON response with {len(valid_urls)} URLs")
            except json.JSONDecodeError:
                logger.warning("Failed to parse response as JSON, falling back to regex")
                # Regex to find Facebook page URLs
                url_pattern = r'https?://(?:www\.)?facebook\.com/[a-zA-Z0-9.]+'
                urls = re.findall(url_pattern, response_text)
                valid_urls.extend(urls)
            
            # Clean and deduplicate
            final_urls = []
            for url in valid_urls:
                if "facebook.com" in url and not url.endswith("facebook.com") and not url.endswith("facebook.com/"):
                    # Ensure https
                    if url.startswith('http://'):
                        url = 'https://' + url[7:]
                    elif not url.startswith('https://'):
                        url = 'https://' + url
                    final_urls.append(url)
            
            # Deduplicate
            final_urls = list(set(final_urls))
            
            logger.info(f"Found {len(final_urls)} competitor URLs: {final_urls}")
            return final_urls
            
        except Exception as e:
            logger.exception(f"Error in Replicate competitor research: {str(e)}")
            return []
