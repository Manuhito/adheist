"""
Celery tasks for AI interface operations.
"""
from typing import Dict, List, Optional, Union
import logging
from decimal import Decimal
import json
import os
import requests

from celery import shared_task
from django.core.files.base import ContentFile
import posthog

from apps.ads.models import AdRequestVersion

from .services import ImageGenerationService
from .models import OpenAIConfiguration

logger = logging.getLogger(__name__)


def send_slack_notification(error_message: str, context: Optional[Dict] = None, title: str = "Image Generation Error") -> bool:
    """
    Sends a notification to Slack when an error occurs.
    
    Args:
        error_message: The error message
        context: Optional additional context
        title: Notification title
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Check if we're in development environment
        app_env = os.environ.get('APP_ENV', 'dev')
        
        # Add environment prefix to title
        env_prefix = f"[{app_env.upper()}]" if app_env else "[UNKNOWN]"
        prefixed_title = f"{env_prefix} {title}"
        
        if app_env == 'dev':
            logger.info(f"Slack notification skipped in development environment: {prefixed_title}")
            return False
            
        # Get webhook URL from environment variable
        webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
        if not webhook_url:
            logger.warning("SLACK_WEBHOOK_URL not configured. Notification will not be sent.")
            return False
            
        # Prepare the message
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": prefixed_title,
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error:* ```{error_message[:1000]}```"
                }
            }
        ]
        
        # Add context if provided
        if context:
            # Filter sensitive information
            safe_context = {
                k: v for k, v in context.items() 
                if k not in ['api_key', 'password', 'secret', 'token', 'credentials']
            }
            
            context_text = json.dumps(safe_context, indent=2)
            if len(context_text) > 1000:
                context_text = context_text[:997] + "..."
            
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Context:* ```{context_text}```"
                }
            })
        
        # Send the message
        response = requests.post(
            webhook_url,
            json={"blocks": blocks},
            timeout=5  # Reasonable timeout
        )
        
        if response.status_code != 200:
            logger.error(
                f"Error sending Slack notification. Status: {response.status_code}, "
                f"Response: {response.text[:200]}"
            )
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"Error sending Slack notification: {str(e)}")
        return False

@shared_task(bind=True, max_retries=3)
def generate_image_task(
    self,
    text_prompt: str,
    image_urls: List[str] = None,
    canvas_size: str = "1024x1024",
    version_id: Optional[int] = None,
    version_type: str = "initial"
) -> dict:
    """
    Celery task to generate an image using OpenAI's GPT-image-1 model.
    
    Args:
        text_prompt: The text prompt describing the image to generate.
        image_urls: List of image URLs or file paths to use as base images.
        canvas_size: The desired image size (e.g., "1024x1024").
        version_id: Optional ID of the AdRequestVersion to update with the generated image.
        version_type: Type of version being generated ('initial' or 'revision').
        
    Returns:
        A dictionary containing the image data and metadata.
    """
    try:
        logger.info(f"Starting image generation task with prompt: {text_prompt[:50]}...")
        
        # Generate the image
        service = ImageGenerationService()
        try:
            result = service.generate_image_from_text_and_images(
                text_prompt=text_prompt,
                image_urls=image_urls,
                canvas_size=canvas_size
            )
            
            # Check if the result contains an error
            if "error" in result:
                error_message = result.get("error", "Unknown error")
                logger.error(f"Image generation failed: {error_message}")
                
                # Send Slack notification for functional errors
                context = {
                    "prompt": text_prompt[:100] + "..." if len(text_prompt) > 100 else text_prompt,
                    "canvas_size": canvas_size,
                    "version_id": version_id,
                    "version_type": version_type,
                    "has_images": bool(image_urls),
                    "status_code": result.get("status_code"),
                    "response_data": result.get("response_data", "")[:200] if result.get("response_data") else ""
                }
                send_slack_notification(
                    error_message=error_message,
                    context=context,
                    title="Functional Error in Image Generation"
                )
                
                # If we have a version_id, update its status to failed
                if version_id:
                    try:
                        # Use the AdRequestVersion that was imported at the top of the file
                        from apps.ads.models import AdRequestVersion
                        version = AdRequestVersion.objects.get(id=version_id)
                        version.status = version.STATUS_FAILED
                        version.error_logs = f"Error in image generation service: {error_message}"
                        version.save(update_fields=['status', 'error_logs'])
                    except Exception as e:
                        logger.exception(f"Error updating AdRequestVersion with error: {str(e)}")
                
                # Devolver el error
                return {
                    "status": "error",
                    "error": error_message,
                    "details": result
                }
                
        except Exception as service_error:
            # Capture any unhandled exception from the service
            error_msg = f"Unhandled exception in image generation service: {str(service_error)}"
            logger.exception(error_msg)
            
            # Send Slack notification
            context = {
                "prompt": text_prompt[:100] + "..." if len(text_prompt) > 100 else text_prompt,
                "canvas_size": canvas_size,
                "version_id": version_id,
                "version_type": version_type,
                "has_images": bool(image_urls)
            }
            send_slack_notification(
                error_message=str(service_error),
                context=context,
                title="Error in Image Generation Service"
            )
            
            # If we have a version_id, update its status to failed
            if version_id:
                try:
                    version = AdRequestVersion.objects.get(id=version_id)
                    version.status = version.STATUS_FAILED
                    version.error_logs = f"Error in image generation service: {str(service_error)}"
                    version.save(update_fields=['status', 'error_logs'])
                except Exception as e:
                    logger.exception(f"Error updating AdRequestVersion with error: {str(e)}")
            
            # Reintentamos la tarea
            self.retry(exc=service_error, countdown=60)
            
            return {
                "status": "error",
                "error": str(service_error)
            }
        
        # Check if result contains an error
        if result and "error" in result:
            logger.error(f"Image generation failed: {result['error']}")
            
            # If version_id is provided, update the version with the error
            if version_id:
                try:
                    from apps.ads.models import AdRequestVersion
                    version = AdRequestVersion.objects.get(id=version_id)
                    version.status = version.STATUS_FAILED
                    
                    # Store detailed error information
                    error_details = {
                        "error_message": result['error'],
                        "status_code": result.get('status_code'),
                        "response_data": result.get('response_data')
                    }
                    
                    # Format the error log with all available information
                    error_log = f"Error generating image: {result['error']}\n"
                    if 'status_code' in result:
                        error_log += f"Status code: {result['status_code']}\n"
                    if 'response_data' in result:
                        error_log += f"Response data: {result['response_data']}"
                    
                    version.error_logs = error_log
                    version.save(update_fields=['status', 'error_logs'])
                    
                    return {
                        "status": "error",
                        "error": result['error'],
                        "details": error_details
                    }
                except Exception as e:
                    logger.exception(f"Error updating AdRequestVersion with error details: {str(e)}")
                    
            return {
                "status": "error",
                "error": result['error']
            }
        
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
                    
                    # Enhanced prompt is now handled differently
                    # The openai_gpt4_prompt field has been removed
                        
                    # Save the response metadata if available
                    if 'response_metadata' in result:
                        # Get the OpenAI configuration for pricing
                        openai_config = OpenAIConfiguration.get_config()
                        
                        # Calculate costs based on token usage
                        metadata = result['response_metadata']
                        
                        # Initialize costs dictionary and cost variables for later use in PostHog event
                        costs = {}
                        image_output_cost = 0
                        total_cost = 0
                        
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
                    
                    # Track event in PostHog when image is generated successfully
                    try:
                        # Get the OpenAI configuration for pricing and model info
                        openai_config = OpenAIConfiguration.get_config()
                        
                        # Use the already calculated costs directly from the variables defined above
                        # No need to extract them from metadata again
                        
                        # Get the S3 URL of the generated image
                        generated_image_url = version.generated_image.url if version.generated_image else None
                        
                        # Capture the event in PostHog
                        posthog.capture(
                            version.ad_request.user.id,  # Distinct ID (user ID)
                            'Ad Generated',
                            properties={
                                'version_type': version_type,
                                'image_output_cost': str(image_output_cost),
                                'total_cost': str(total_cost),
                                'model': openai_config.openai_image_model,
                                'generated_image': generated_image_url,
                                'ad_request_id': version.ad_request.id,
                                'version_id': version.id,
                                'timestamp': version.updated_at.isoformat() if hasattr(version, 'updated_at') else None
                            }
                        )
                    except Exception as e:
                        logger.exception(f"Error tracking PostHog event for AdRequestVersion {version_id}: {str(e)}")
                    
                else:
                    error_message = f"No binary image content found in result for AdRequestVersion {version_id}"
                    logger.error(error_message)
                    version.status = version.STATUS_FAILED
            except Exception as e:
                logger.exception(f"Error tracking PostHog event for AdRequestVersion {version_id}: {str(e)}")
            
        else:
            error_message = f"No binary image content found in result for AdRequestVersion {version_id}"
            logger.error(error_message)
            version.status = version.STATUS_FAILED
            version.error_logs = error_message
            version.save(update_fields=['status', 'error_logs'])
        
    except Exception as e:
        error_msg = f"Error in generate_image_task: {str(e)}"
        logger.exception(error_msg)
        
        # Send Slack notification
        context = {
            "prompt": text_prompt[:100] + "..." if len(text_prompt) > 100 else text_prompt,
            "canvas_size": canvas_size,
            "version_id": version_id,
            "version_type": version_type,
            "has_images": bool(image_urls)
        }
        send_slack_notification(
            error_message=str(e),
            context=context,
            title="General Error in Image Generation Task"
        )
        
        # If we have a version ID, update its status to failed
        if version_id:
            try:
                from apps.ads.models import AdRequestVersion
                version = AdRequestVersion.objects.get(id=version_id)
                version.status = version.STATUS_FAILED
                
                # Determine the error message based on the type of error
                if isinstance(e, Exception):
                    error_message = f"Error in generate_image_task: {str(e)}"
                else:
                    error_message = f"Unknown error in generate_image_task"
                    
                version.error_logs = error_message
                version.save(update_fields=['status', 'error_logs'])
            except Exception:
                pass
        
        # Retry the task if it fails (up to max_retries)
        self.retry(exc=e, countdown=60)  # Retry after 60 seconds
        
        return {
            "status": "error",
            "error": str(e)
        }
