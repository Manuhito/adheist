"""
Services for AI interface operations.
"""
from typing import Dict, List, Optional, Union

from django.conf import settings
from openai import OpenAI


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
                    "content": """You are an expert prompt engineer specializing in creating prompts for DALL-E 3 image generation. 

Your task is to create a detailed, descriptive prompt that DALL-E 3 will use to generate an advertisement image.

IMPORTANT: The user will provide you with information about a company, product, and design requirements. 
THIS IS NOT A REQUEST FOR INSTRUCTIONS - it is information for you to use in crafting a DALL-E prompt.

DO NOT:
- Provide instructions on how to manually create an image
- Mention tools like Photoshop or Canva
- Format your response as a conversation or explanation
- Say you're unable to help or that you can't create images
- Ask for more information or clarification

INSTEAD, DIRECTLY CREATE:
A single, cohesive paragraph describing the exact visual scene to be generated, incorporating:
1. All company and product information provided by the user
2. Specific details about composition, style, lighting, colors, and mood
3. Precise description of advertisement elements (product placement, branding, etc.)
4. Any logos or product images mentioned should be described as integrated into the scene

Your entire response will be sent directly to DALL-E 3 as a prompt, so write ONLY what you want DALL-E to interpret."""
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
            print(f"Sending request to GPT-4o with {len(messages)} messages")
            print(f"Messages: {messages}")
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
            )
            
            enhanced_prompt = completion.choices[0].message.content
            print(f"Enhanced prompt generated: {enhanced_prompt[:100]}...")
            
            # Generate image with DALL·E 3
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size=canvas_size,
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            print(f"Image generated successfully")
            
            # Prepare metadata from the OpenAI responses
            metadata = {
                "gpt4o_model": "gpt-4o",
                "dalle_model": "dall-e-3",
                "canvas_size": canvas_size,
                "quality": "standard",
                "completion_id": getattr(completion, 'id', None),
                "image_response_id": getattr(response, 'id', None),
                "created_at": getattr(response, 'created', None),
            }
            
            return {
                "image_url": image_url,
                "enhanced_prompt": enhanced_prompt,
                "response_metadata": metadata
            }
        
        except Exception as e:
            print(f"Error generating image: {str(e)}")
            raise
