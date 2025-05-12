"""
API views for AI interface operations.
"""
import json
import logging
from typing import Dict, List, Optional, Union

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .services import ImageGenerationService

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def generate_image(request):
    """
    API endpoint to generate images using OpenAI's GPT-4o and DALL·E 3 with text verification.
    
    Accepts:
        - text_prompt: Required text description
        - image_1_url to image_8_url: Optional image URLs for context
        - canvas_size: Optional image size (default: "1024x1024")
        - verify_text: Optional boolean to enable text verification (default: True)
        - max_retries: Optional integer for maximum retry attempts (default: 3)
        
    Returns:
        JSON with the URL of the generated image and metadata about the generation process
    """
    try:
        # Parse request data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                {"error": "Invalid JSON data"}, 
                status=400
            )
        
        # Validate required fields
        text_prompt = data.get("text_prompt")
        if not text_prompt:
            return JsonResponse(
                {"error": "text_prompt is required"}, 
                status=400
            )
        
        # Get optional fields
        image_urls = []
        for i in range(1, 9):  # Support up to 8 images
            image_url = data.get(f"image_{i}_url")
            if image_url:
                image_urls.append(image_url)
        
        # Get canvas size with default
        canvas_size = data.get("canvas_size", "1024x1024")
        
        # Validate canvas size
        valid_sizes = ["1024x1024", "1792x1024", "1024x1792"]
        if canvas_size not in valid_sizes:
            logger.warning(f"Invalid canvas_size: {canvas_size}, using default 1024x1024")
            canvas_size = "1024x1024"
            
        # Get text verification parameters
        verify_text = data.get("verify_text", True)
        if not isinstance(verify_text, bool):
            try:
                verify_text = str(verify_text).lower() in ["true", "1", "yes"]
            except:
                verify_text = True
                
        max_retries = data.get("max_retries", 3)
        try:
            max_retries = int(max_retries)
            if max_retries < 0 or max_retries > 5:  # Set reasonable limits
                max_retries = 3
        except:
            max_retries = 3
        
        # Generate image
        service = ImageGenerationService()
        result = service.generate_image_from_text_and_images(
            text_prompt=text_prompt,
            image_urls=image_urls,
            canvas_size=canvas_size,
            verify_text=verify_text,
            max_retries=max_retries
        )
        
        # Return result
        return JsonResponse(result)
    
    except Exception as e:
        logger.exception(f"Error in generate_image API: {str(e)}")
        return JsonResponse(
            {"error": f"Failed to generate image: {str(e)}"}, 
            status=500
        )
