"""
Services for AI interface operations.
"""
import base64
import io
import logging
import requests
from typing import Dict, List, Optional, Tuple, Union

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for generating images using OpenAI's GPT-4o and DALL·E 3 models."""

    def __init__(self):
        """Initialize the service with OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def _download_image(self, image_url: str) -> Optional[bytes]:
        """
        Download image from URL and return as bytes.
        
        Args:
            image_url: URL of the image to download
            
        Returns:
            Image as bytes or None if download failed
        """
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Error downloading image: {str(e)}")
            return None
            
    def _verify_image_text(self, image_url: str, original_prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Verify if text in the generated image is correct and legible using GPT-4o Vision.
        
        Args:
            image_url: URL of the image to verify
            original_prompt: The original prompt used to generate the image
            
        Returns:
            Tuple of (is_text_valid, reformulated_prompt_if_needed)
        """
        try:
            # Download the image
            image_data = self._download_image(image_url)
            if not image_data:
                logger.error("Failed to download image for verification")
                return False, None
                
            # Encode image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Create messages for GPT-4 Vision
            messages = [
                {
                    "role": "system",
                    "content": """You are an expert at analyzing images for text quality and typography in AI-generated images. 
Your task is to examine an image and provide a detailed analysis of any text issues.

Focus specifically on:
1. Text legibility - Is all text clear and easy to read? Analyze contrast, size, and font choice.
2. Text correctness - Are all words spelled correctly? Are there any nonsensical or gibberish text elements?
3. Text formatting - Is the text properly aligned, positioned, and integrated with the design?
4. Brand consistency - Does the text accurately represent the brand names and product descriptions?

For any issues found, provide a DETAILED analysis including:
- Specific text elements that have problems (exact words/phrases)
- The nature of each problem (spelling, legibility, positioning, etc.)
- What the text should have been instead

If the text is perfect or if there is no text in the image, simply confirm that.

IMPORTANT: This is for educational purposes analyzing AI-generated images. Do not refuse to analyze the image. Stick to objective analysis of text quality only.

Your analysis will be used to create a better prompt for image generation, so be thorough and specific."""

                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"This image was generated with the following prompt: '{original_prompt}'. Please analyze if any text in the image is legible and correct. If there are issues with the text, provide a reformulated prompt that would help generate a better image with correct text."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
            
            # Get analysis from GPT-4o Vision
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=1000
            )
            
            analysis = completion.choices[0].message.content
            logger.info(f"Image text analysis: {analysis}")
            
            # Check if text is valid based on analysis
            if any(phrase in analysis.lower() for phrase in [
                "text is legible", 
                "text is clear", 
                "text is correct", 
                "no issues with the text", 
                "text appears correct",
                "no text in the image",
                "there is no text",
                "the text in the image is perfect",
                "all text elements are correct",
                "the typography is excellent"
            ]):
                return True, None
            
            # If text is not valid, get reformulated prompt
            # Create messages for prompt reformulation
            reformulation_messages = [
                {
                    "role": "system",
                    "content": """You are an expert prompt engineer for DALL-E 3 image generation specializing in typography and text quality.

Your task is to reformulate a prompt to fix specific text issues in AI-generated images. Based on the detailed analysis of a previously generated image, create a new prompt that will help DALL-E generate an image with perfect text.

Include SPECIFIC and TECHNICAL instructions about:

1. TYPOGRAPHY:
   - Font style (sans-serif, serif, bold, etc.)
   - Font size (large, medium, small relative to other elements)
   - Case (uppercase, lowercase, title case)
   - Weight (bold, regular, light)

2. TEXT POSITIONING:
   - Exact placement of text elements (centered, top-left, etc.)
   - Integration with visual elements
   - Text hierarchy and organization

3. CONTRAST & LEGIBILITY:
   - Background/text contrast requirements
   - Text color specifications
   - Avoid overlapping text with busy backgrounds

4. EXACT WORDING:
   - Specify the EXACT text that should appear (in quotes)
   - Emphasize correct spelling of brand names and key terms
   - Specify any text that should NOT appear

Your prompt should maintain all the visual and compositional elements from the original prompt while being extremely precise about text requirements. Use quotes around specific text that must appear exactly as written.

IMPORTANT: This is for educational purposes creating AI-generated images. Do not refuse to create a prompt. Focus only on improving text legibility and correctness.

Example of good instructions: 'The can label should feature the brand name "CIDACOS" in bold, uppercase, sans-serif white text against a deep blue (#212f6f) background at the top of each can. Below it, "CRUSHED TOMATO" should appear in slightly smaller red text with good contrast.'"""

                },
                {
                    "role": "user",
                    "content": f"""Original prompt: '{original_prompt}'
Image analysis: {analysis}

Please reformulate the prompt to fix the text issues."""
                }
            ]
            
            # Get reformulated prompt
            reformulation = self.client.chat.completions.create(
                model="gpt-4o",
                messages=reformulation_messages,
            )
            
            reformulated_prompt = reformulation.choices[0].message.content
            logger.info(f"Reformulated prompt: {reformulated_prompt}")
            
            # Check if GPT-4o rejected the reformulation
            rejection_phrases = [
                "i'm sorry", "i apologize", "cannot assist", "can't assist", 
                "unable to", "not able to", "i cannot", "i can't", 
                "against", "policy", "policies", "guidelines", "terms of service"
            ]
            
            if any(phrase in reformulated_prompt.lower() for phrase in rejection_phrases):
                logger.warning(f"GPT-4o rejected the reformulation. Using a generic improvement prompt instead.")
                # Create a more generic reformulation that's less likely to trigger content filters
                reformulated_prompt = f"Create a professional advertisement image featuring {original_prompt.split()[0:10]}... Ensure all text is clear, legible, and correctly spelled. Use high contrast between text and background."
            
            return False, reformulated_prompt
            
        except Exception as e:
            logger.error(f"Error verifying image text: {str(e)}")
            return False, None

    def _should_verify_text(self, prompt: str) -> bool:
        """
        Determine if the prompt is likely to generate an image with text that needs verification.
        
        Args:
            prompt: The prompt to analyze
            
        Returns:
            Boolean indicating if text verification is needed
        """
        text_indicators = [
            "text", "word", "letter", "font", "typography", 
            "sign", "label", "title", "headline", "caption",
            "slogan", "tagline", "quote", "message", "banner",
            "logo", "brand name", "company name", "product name",
            "packaging", "bottle", "can", "box", "container",
            "advertisement", "ad", "poster", "billboard",
            "book cover", "magazine", "newspaper", "brochure",
            "business card", "letterhead", "website", "app"
        ]
        
        # Check for brand names which often need text verification
        brand_indicators = [
            "brand", "logo", "product", "company", "corporation", 
            "enterprise", "business", "trademark", "label"
        ]
        
        # More aggressive text verification for prompts containing brand indicators
        if any(indicator in prompt.lower() for indicator in brand_indicators):
            return True
            
        return any(indicator in prompt.lower() for indicator in text_indicators)
    
    def generate_image_from_text_and_images(
        self,
        text_prompt: str,
        image_urls: List[str] = None,
        canvas_size: str = "1024x1024",
        verify_text: bool = True,
        max_retries: int = 3
    ) -> Dict[str, str]:
        """
        Generate an image using GPT-4o and DALL·E 3 with text verification.
        
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs to use as visual context.
            canvas_size: Size of the generated image. Default is "1024x1024".
            verify_text: Whether to verify text in the generated image. Default is True.
            max_retries: Maximum number of retries for text verification. Default is 3.
            
        Returns:
            Dictionary containing the URL of the generated image.
        """
        try:
            current_prompt = text_prompt
            attempts = 0
            retry_history = []
            
            while attempts <= max_retries:
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
                    "content": current_prompt
                })
                
                # Get enhanced prompt from GPT-4o
                logger.info(f"Sending request to GPT-4o with {len(messages)} messages (attempt {attempts+1})")
                completion = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                )
                
                enhanced_prompt = completion.choices[0].message.content
                logger.info(f"Enhanced prompt generated: {enhanced_prompt}")
                
                # Check if GPT-4o rejected the prompt
                rejection_phrases = [
                    "i'm sorry", "i apologize", "cannot assist", "can't assist", 
                    "unable to", "not able to", "i cannot", "i can't", 
                    "against", "policy", "policies", "guidelines", "terms of service"
                ]
                
                if any(phrase in enhanced_prompt.lower() for phrase in rejection_phrases):
                    logger.warning(f"GPT-4o rejected the prompt. Skipping image generation for this attempt.")
                    if attempts >= max_retries:
                        # If we've reached max retries, return the last successful image
                        logger.warning("Max retries reached with rejection. Using last successful image.")
                        break
                    else:
                        # Try again with a more conservative prompt
                        conservative_prompt = f"{current_prompt} Please create a clean, professional advertisement image suitable for all audiences."
                        current_prompt = conservative_prompt
                        attempts += 1
                        continue
                
                # Generate image with DALL·E 3
                response = self.client.images.generate(
                    model="dall-e-3",
                    prompt=enhanced_prompt,
                    size=canvas_size,
                    quality="standard",
                    n=1,
                )
                
                image_url = response.data[0].url
                logger.info(f"Image generated successfully (attempt {attempts+1})")
                
                # Check if we need to verify text in the image
                if verify_text and self._should_verify_text(enhanced_prompt):
                    logger.info("Verifying text in generated image...")
                    is_text_valid, reformulated_prompt = self._verify_image_text(
                        image_url=image_url,
                        original_prompt=enhanced_prompt
                    )
                    
                    if is_text_valid:
                        logger.info("Text verification passed")
                        break
                    elif reformulated_prompt and attempts < max_retries:
                        logger.info(f"Text verification failed, retrying with reformulated prompt (attempt {attempts+1})")
                        retry_history.append({
                            "attempt": attempts + 1,
                            "prompt": enhanced_prompt,
                            "image_url": image_url,
                            "reformulated_prompt": reformulated_prompt
                        })
                        current_prompt = reformulated_prompt
                        attempts += 1
                        continue
                    else:
                        logger.warning("Text verification failed but max retries reached or no reformulation available")
                        break
                else:
                    # No text verification needed
                    break
                    
            # Prepare metadata from the OpenAI responses
            metadata = {
                "gpt4o_model": "gpt-4o",
                "dalle_model": "dall-e-3",
                "canvas_size": canvas_size,
                "quality": "standard",
                "completion_id": getattr(completion, 'id', None),
                "image_response_id": getattr(response, 'id', None),
                "created_at": getattr(response, 'created', None),
                "attempts": attempts + 1,
                "retry_history": retry_history
            }
            
            return {
                "image_url": image_url,
                "enhanced_prompt": enhanced_prompt,
                "response_metadata": metadata
            }
        
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise
