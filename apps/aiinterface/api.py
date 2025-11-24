"""
API views for AI interface operations.
"""
import json
import logging
from typing import Dict, List, Optional, Union

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .services import ImageGenerationService
from .tasks import generate_image_task, generate_image_task_replicate

logger = logging.getLogger(__name__)


@csrf_exempt
@require_GET
def test_openai_connection(request):
    """
    API endpoint to test the connection with OpenAI's gpt-image-1 API.
    
    This endpoint will test if the gpt-image-1 model is working correctly.
    
    Returns:
        JSON with the test results
    """
    try:
        # Run the test
        service = ImageGenerationService()
        result = service.test_openai_connection()
        
        # Return result
        return JsonResponse({"result": result})
    
    except Exception as e:
        logger.exception(f"Error in test_openai_connection API: {str(e)}")
        return JsonResponse(
            {"error": f"Failed to test OpenAI connection: {str(e)}"}, 
            status=500
        )


@csrf_exempt
@require_POST
def generate_image(request):
    """
    API endpoint to generate images using OpenAI's GPT-5 and gpt-image-1.
    
    Accepts:
        - text_prompt: Required text description
        - image_1_url to image_8_url: Optional image URLs for context
        - canvas_size: Optional image size (default: "1024x1024")
        - async: Optional boolean to run the task asynchronously (default: True)
        - version_id: Optional ID of the AdRequestVersion to update
        
    Returns:
        JSON with task ID if async=True, or the generated image data if async=False
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
        
        # Check if the task should run asynchronously
        run_async = data.get("async", True)
        version_id = data.get("version_id")
        
        if run_async:
            # Run as a Celery task
            if not version_id:
                return {"error": "version_id is required for async image generation"}
                
            logger.info(f"Starting async image generation for version: {version_id}")
            # Using Replicate instead of OpenAI
            task = generate_image_task_replicate.delay(
                image_urls=image_urls,
                canvas_size=canvas_size,
                version_id=version_id
            )
            
            # Return the task ID for later status checking
            return JsonResponse({
                "status": "processing",
                "task_id": task.id,
                "message": "Image generation started. Check task status for results."
            })
        else:
            # Run synchronously (original behavior)
            service = ImageGenerationService()
            result = service.generate_image_from_text_and_images(
                text_prompt=text_prompt,
                image_urls=image_urls,
                canvas_size=canvas_size
            )
            
            # Return result directly
            return JsonResponse(result)
    
    except Exception as e:
        logger.exception(f"Error in generate_image API: {str(e)}")
        return JsonResponse(
            {"error": f"Failed to generate image: {str(e)}"}, 
            status=500
        )


@csrf_exempt
@require_GET
def get_task_status(request, task_id):
    """
    API endpoint to check the status of a Celery task.
    
    Args:
        task_id: The ID of the Celery task to check
        
    Returns:
        JSON with the task status and result (if available)
    """
    try:
        from celery.result import AsyncResult
        
        # Get the task result
        task_result = AsyncResult(task_id)
        
        # Check the task status
        if task_result.ready():
            if task_result.successful():
                # Task completed successfully
                result = task_result.result
                return JsonResponse({
                    "status": "completed",
                    "result": result
                })
            else:
                # Task failed
                return JsonResponse({
                    "status": "failed",
                    "error": str(task_result.result)
                }, status=500)
        else:
            # Task is still running
            return JsonResponse({
                "status": "processing",
                "message": "Task is still running"
            })
    
    except Exception as e:
        logger.exception(f"Error checking task status: {str(e)}")
        return JsonResponse({
            "status": "error",
            "error": f"Failed to check task status: {str(e)}"
        }, status=500)
