"""
Celery tasks for AI interface operations.
"""
from typing import Dict, List, Optional, Union
import logging
from decimal import Decimal

from celery import shared_task
from django.core.files.base import ContentFile

from .services import ImageGenerationService
from .models import OpenAIConfiguration

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def generate_image_task(
    self,
    text_prompt: str,
    image_urls: List[str] = None,
    canvas_size: str = "1024x1024",
    version_id: Optional[int] = None
) -> dict:
    """
    Celery task to generate an image using OpenAI's GPT-image-1 model.
    
    Args:
        text_prompt: The text prompt describing the image to generate.
        image_urls: List of image URLs or file paths to use as base images.
        canvas_size: The desired image size (e.g., "1024x1024").
        version_id: Optional ID of the AdRequestVersion to update with the generated image.
        
    Returns:
        A dictionary containing the image data and metadata.
    """
    try:
        logger.info(f"Starting image generation task with prompt: {text_prompt[:50]}...")
        
        # Generate the image
        service = ImageGenerationService()
        result = service.generate_image_from_text_and_images(
            text_prompt=text_prompt,
            image_urls=image_urls,
            canvas_size=canvas_size
        )
        
        # If version_id is provided, update the version with the generated image
        if version_id:
            try:
                from apps.ads.models import AdRequestVersion
                version = AdRequestVersion.objects.get(id=version_id)
                
                if result and "image_content" in result and result.get('is_binary', False):
                    # Save the image to the version
                    image_content = result["image_content"]
                    image_name = f"version_{version.id}_image.webp"
                    version.generated_image.save(
                        image_name,
                        ContentFile(image_content),
                        save=True
                    )
                    logger.info(f"Image saved to AdRequestVersion {version_id}")
                    
                    # Update status to COMPLETED since we have an image
                    version.status = AdRequestVersion.STATUS_COMPLETED
                    version.save(update_fields=['status'])
                    
                    # Save the OpenAI responses in the new fields
                    update_fields = []
                    
                    # Save the enhanced prompt in the new field
                    if 'enhanced_prompt' in result:
                        version.openai_gpt4_prompt = result['enhanced_prompt']
                        update_fields.append('openai_gpt4_prompt')
                        
                    # Save the response metadata if available
                    if 'response_metadata' in result:
                        # Get the OpenAI configuration for pricing
                        openai_config = OpenAIConfiguration.get_config()
                        
                        # Calculate costs based on token usage
                        metadata = result['response_metadata']
                        
                        # Initialize costs dictionary
                        costs = {}
                        
                        # Calculate costs only if usage information is available
                        if 'usage' in metadata:
                            usage = metadata['usage']
                            
                            # Calculate text input cost (price per 1M tokens)
                            if 'input_tokens_details' in usage and 'text_tokens' in usage['input_tokens_details']:
                                text_tokens = usage['input_tokens_details']['text_tokens']
                                # Convert price from per 1M tokens to per token
                                price_per_token = float(openai_config.text_input_price) / 1_000_000
                                text_input_cost = round(text_tokens * price_per_token, 4)
                                costs['text_input_cost'] = text_input_cost
                            
                            # Calculate image input cost
                            if 'input_tokens_details' in usage and 'image_tokens' in usage['input_tokens_details']:
                                image_tokens = usage['input_tokens_details']['image_tokens']
                                # Convert price from per 1M tokens to per token
                                price_per_token = float(openai_config.image_input_price) / 1_000_000
                                image_input_cost = round(image_tokens * price_per_token, 4)
                                costs['image_input_cost'] = image_input_cost
                            
                            # Calculate image output cost
                            if 'output_tokens' in usage:
                                output_tokens = usage['output_tokens']
                                # Convert price from per 1M tokens to per token
                                price_per_token = float(openai_config.image_output_price) / 1_000_000
                                image_output_cost = round(output_tokens * price_per_token, 4)
                                costs['image_output_cost'] = image_output_cost
                            
                            # Calculate total cost
                            total_cost = sum(costs.values())
                            costs['total_cost'] = round(total_cost, 4)
                            
                            # Add costs to response metadata
                            metadata['costs'] = costs
                        
                        # Update the response metadata
                        version.openai_response_metadata = metadata
                        update_fields.append('openai_response_metadata')
                        
                    # Save the updated fields
                    if update_fields:
                        version.save(update_fields=update_fields)
                    
                    logger.info(f"Image generated successfully for AdRequestVersion {version_id}")
                else:
                    logger.error(f"No binary image content found in result for AdRequestVersion {version_id}")
                    version.status = "failed"
                    version.save(update_fields=['status'])
            except Exception as e:
                logger.exception(f"Error updating AdRequestVersion {version_id}: {str(e)}")
                # If we have a version ID, update its status to failed
                try:
                    from apps.ads.models import AdRequestVersion
                    version = AdRequestVersion.objects.get(id=version_id)
                    version.status = "failed"
                    version.save(update_fields=['status'])
                except Exception:
                    pass
        
        # Return the result
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.exception(f"Error in generate_image_task: {str(e)}")
        
        # If we have a version ID, update its status to failed
        if version_id:
            try:
                from apps.ads.models import AdRequestVersion
                version = AdRequestVersion.objects.get(id=version_id)
                version.status = "failed"
                version.save(update_fields=['status'])
            except Exception:
                pass
        
        # Retry the task if it fails (up to max_retries)
        self.retry(exc=e, countdown=60)  # Retry after 60 seconds
        
        return {
            "status": "error",
            "error": str(e)
        }
