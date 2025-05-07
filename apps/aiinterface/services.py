"""
Services for AI interface operations.
"""
import logging
from typing import Dict, List, Optional, Union

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for generating images using OpenAI's GPT-4o and DALL·E 3 models."""

    def __init__(self):
        """Initialize the service with OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
    ) -> Dict[str, str]:
        """
        Generate an image using GPT-4o and DALL·E 3.
        
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs to use as visual context.
            canvas_size: Size of the generated image. Default is "1024x1024".
            
        Returns:
            Dictionary containing the URL of the generated image.
        """
        try:
            # Build messages for GPT-4o
            messages = [
                {
                    "role": "system",
                    "content": "You are a prompt engineer combining visual and textual concepts into a DALL·E 3 image prompt."
                }
            ]
            
            # Add image messages
            if image_urls:
                for image_url in image_urls:
                    if not image_url:
                        continue
                    
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    })
            
            # Add text prompt
            messages.append({
                "role": "user",
                "content": text_prompt
            })
            
            # Get enhanced prompt from GPT-4o
            logger.info(f"Sending request to GPT-4o with {len(messages)} messages")
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
            )
            
            enhanced_prompt = completion.choices[0].message.content
            logger.info(f"Enhanced prompt generated: {enhanced_prompt[:100]}...")
            
            # Generate image with DALL·E 3
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size=canvas_size,
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            logger.info(f"Image generated successfully")
            
            return {
                "image_url": image_url,
                "enhanced_prompt": enhanced_prompt
            }
        
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise
