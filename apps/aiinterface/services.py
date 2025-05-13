"""
Services for AI interface operations.
"""
from typing import Dict, List, Optional, Union

from django.conf import settings
from openai import OpenAI


class ImageGenerationService:
    """Service for generating images using OpenAI's GPT-4o and gpt-image-1 models."""

    def __init__(self):
        """Initialize the service with OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
    def test_openai_connection(self):
        """Test method to verify OpenAI API connection with gpt-image-1.
        
        This method tests the gpt-image-1 model to verify if it's working correctly.
        
        Returns:
            A dictionary with test results.
        """
        print("\n----- TESTING GPT-IMAGE-1 CONNECTION -----")
        
        try:
            print("Testing gpt-image-1 image generation...")
            gpt_image_response = self.client.chat.completions.create(
                model="gpt-image-1",
                messages=[
                    {"role": "system", "content": "Generate a high-quality image."},
                    {"role": "user", "content": "A futuristic city skyline at night, with flying cars and neon lights"}
                ],
                max_tokens=4096
            )
            
            # Print the raw response structure to understand the format
            print(f"gpt-image-1 response type: {type(gpt_image_response)}")
            print(f"gpt-image-1 response structure: {gpt_image_response}")
            
            content = gpt_image_response.choices[0].message.content
            print(f"Content type: {type(content)}")
            print(f"Content: {content[:100] if isinstance(content, str) else str(content)[:100]}...")
            
            # Try to extract image URL if possible
            image_url = None
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "image":
                        image_url = item.get("image_url", {}).get("url")
                        break
            elif isinstance(content, dict) and content.get("type") == "image":
                image_url = content.get("image_url", {}).get("url")
            
            if image_url:
                result = {
                    "status": "success",
                    "image_url": image_url,
                    "message": "gpt-image-1 test successful!"
                }
                print("\n----- TEST COMPLETED SUCCESSFULLY -----")
            else:
                result = {
                    "status": "partial",
                    "message": "gpt-image-1 API call succeeded but no image URL found in response",
                    "raw_response": str(content)[:500] + "..."
                }
                print("\n----- TEST PARTIALLY COMPLETED -----")
                
        except Exception as e:
            error_message = f"Error testing gpt-image-1: {str(e)}"
            print(f"gpt-image-1 test failed: {error_message}")
            result = {
                "status": "failed",
                "error": str(e),
                "message": error_message
            }
            print("\n----- TEST FAILED -----")
        
        return result

    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
    ) -> Dict[str, str]:
        """
        Generate an image using GPT-4o for prompt enhancement and gpt-image-1 for image generation.
        
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs to use as visual context.
            canvas_size: Size hint for the generated image. Default is "1024x1024".
            
        Returns:
            Dictionary containing the URL of the generated image.
        """
        try:
            # Build messages for GPT-4o
            messages = [
                {
                    "role": "system",
                    "content": """You are an expert prompt engineer specializing in creating detailed image descriptions. 

Your task is to create a detailed, descriptive prompt that will be used to generate an advertisement image.

IMPORTANT: The user will provide you with information about a company, product, and design requirements. 
THIS IS NOT A REQUEST FOR INSTRUCTIONS - it is information for you to use in crafting an image description.

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

Your entire response will be used directly as an image generation prompt, so write ONLY what you want in the final image."""
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
            
            # Generate image with gpt-image-1
            print(f"Generating image with gpt-image-1 using enhanced prompt")
            
            # Create a simple message with just the enhanced prompt
            image_messages = [
                {
                    "role": "system",
                    "content": "Generate a high-quality image based on the following description."
                },
                {
                    "role": "user",
                    "content": enhanced_prompt
                }
            ]
            
            # Use the chat completions API with gpt-image-1 model
            response = self.client.chat.completions.create(
                model="gpt-image-1",
                messages=image_messages,
                max_tokens=4096
            )
            
            # Extract the image URL from the response
            content = response.choices[0].message.content
            print(f"Response content type: {type(content)}")
            
            # Handle different possible response formats
            image_url = None
            
            if isinstance(content, list):
                # Format 1: List of content items
                for content_item in content:
                    if isinstance(content_item, dict) and content_item.get("type") == "image":
                        image_url = content_item.get("image_url", {}).get("url")
                        break
            elif isinstance(content, dict):
                # Format 2: Single content item
                if content.get("type") == "image":
                    image_url = content.get("image_url", {}).get("url")
            
            if not image_url:
                raise ValueError("No image was generated in the response")
                
            print(f"Image generated successfully with gpt-image-1")
            
            # Prepare metadata from the OpenAI responses
            metadata = {
                "gpt4o_model": "gpt-4o",
                "image_model": "gpt-image-1",
                "canvas_size": canvas_size,
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
