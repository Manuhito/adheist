"""
Services for AI interface operations.
"""
import base64
import io
import logging
import requests
from typing import Any, Dict, List, Optional, Tuple, Union

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
            
    def _verify_image_text_with_history(self, image_url: str, original_prompt: str, retry_history: list) -> Tuple[bool, Optional[str]]:
        """
        Verify if the text in the generated image is correct and legible using GPT-4o Vision. If not, reformulate the prompt using the retry history.
        Args:
            image_url: URL of the image to verify
            original_prompt: Prompt used to generate the image
            retry_history: List of dicts with previous prompts and analyses
        Returns:
            (is_text_valid, reformulated_prompt_if_needed)
        """
        try:
            image_data = self._download_image(image_url)
            if not image_data:
                logger.error("Failed to download image for verification")
                return False, None

            base64_image = base64.b64encode(image_data).decode('utf-8')

            # 1. Analyze the image
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert in analyzing AI-generated images, specializing in text quality and legibility. "
                        "Analyze the attached image and provide a detailed report of any textual issues (legibility, spelling, integration, etc). If the text is perfect or there is no text, explicitly confirm this."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"This image was generated with the following prompt: '{original_prompt}'. Please analyze if any text in the image is legible and correct. If there are issues, describe exactly what they are."
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
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=1000
            )
            analysis = completion.choices[0].message.content
            logger.info(f"Image text analysis: {analysis}")

            # Check for phrases indicating text is acceptable
            perfect_text_phrases = [
                "text is legible", "text is clear", "text is correct", "no issues with the text",
                "text appears correct", "no text in the image", "typography is excellent", "all text elements are correct"
            ]
            
            # Check for minor text issues that might still be acceptable
            minor_issues_phrases = [
                "mostly legible", "generally clear", "readable", "can be read", "sufficiently clear",
                "minor issues", "small inaccuracies", "slight misspelling"
            ]
            
            # Check for common text errors in AI-generated images
            text_error_indicators = [
                "misspell", "incorrect spell", "wrong spell", "typo", "error", "mistake",
                "wrong text", "incorrect text", "gibberish", "nonsensical", "illegible",
                "difficult to read", "hard to read", "unclear text", "blurry text"
            ]
            
            # Accept if text is perfect
            if any(phrase in analysis.lower() for phrase in perfect_text_phrases):
                logger.info("Text verification: Text is perfect or no text present")
                return True, None
                
            # Check for specific text errors mentioned in the analysis
            has_text_errors = any(indicator in analysis.lower() for indicator in text_error_indicators)
            
            # If there are only minor issues and no specific errors mentioned, accept the image
            if (any(phrase in analysis.lower() for phrase in minor_issues_phrases) and not has_text_errors):
                logger.info("Text verification: Text has only minor issues, accepting")
                return True, None
                
            # Otherwise, text needs improvement
            logger.info("Text verification: Text has issues that need correction")

            # 2. Reformulate prompt using history
            history_str = "\n".join([
                f"Attempt {r['attempt']}:\nPrompt: {r['prompt']}\nReformulated: {r.get('reformulated_prompt','')}\nURL: {r.get('image_url','')}"
                for r in retry_history
            ])
            reformulation_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert prompt engineer for DALL-E 3, specializing in creating effective image prompts. "
                        "You have the previous attempt history (prompts and analyses). "
                        "Create a new prompt that improves the image while addressing the text issues identified. "
                        "IMPORTANT GUIDELINES FOR TEXT ISSUES:\n"
                        "1. DO NOT include specific typography instructions (font, size, kerning, etc.)\n"
                        "2. DO NOT put exact text in quotes or specify exact wording\n"
                        "3. DO describe what the text represents (e.g., 'product name', 'brand name', 'descriptive label')\n"
                        "4. DO emphasize clarity and readability without technical specifications\n"
                        "5. DO mention general text properties like 'clear', 'readable', 'high-contrast'\n\n"
                        "For example, instead of saying 'The label should read CIDACOS TOMATO PUREE in 36pt Helvetica',\n"
                        "say 'The product can should have a clear, readable label showing the brand name and product type'.\n\n"
                        "Focus on the visual scene, composition, colors, lighting, and mood. Keep your prompt natural and descriptive."
                    )
                },
                {
                    "role": "user",
                    "content": f"Attempt history:\n{history_str}\nLast attempt analysis: {analysis}\nOriginal prompt: '{original_prompt}'\nPlease reformulate the prompt to fix the issues."
                }
            ]
            reformulation = self.client.chat.completions.create(
                model="gpt-4o",
                messages=reformulation_messages,
            )
            reformulated_prompt = reformulation.choices[0].message.content
            logger.info(f"Reformulated prompt: {reformulated_prompt}")

            rejection_phrases = [
                "i'm sorry", "i apologize", "cannot assist", "can't assist", 
                "unable to", "not able to", "i cannot", "i can't", 
                "against", "policy", "policies", "guidelines", "terms of service",
                "sorry", "not allowed", "not authorized"
            ]
            if any(phrase in reformulated_prompt.lower() for phrase in rejection_phrases):
                logger.warning(f"GPT-4o rejected the reformulation. Using a generic improvement prompt instead.")
                # Create a more effective fallback prompt that focuses on visual elements rather than text
                reformulated_prompt = (
                    f"Create a professional advertisement image showing {original_prompt.split()[:5]}... "
                    "Focus on creating a visually appealing scene with good lighting, composition, and color balance. "
                    "Include product packaging with simple, readable labels. Avoid complex text or detailed typography instructions. "
                    "The overall mood should be inviting and professional."
                )

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
    ) -> Dict[str, Any]:
        """
        Generate an image using GPT-4o and DALL·E 3 with text verification.
        
        Args:
            text_prompt: The text prompt describing the image to generate.
            image_urls: List of image URLs to use as visual context.
            canvas_size: Size of the generated image. Default is "1024x1024".
            verify_text: Whether to verify text in the generated image. Default is True.
            max_retries: Maximum number of retries for text verification. Default is 3.
            
        Returns:
            Dictionary containing the URL of the generated image, final prompt used, and retry history.
            If no image could be generated after all retries, raises an exception.
        """
        try:
            current_prompt = text_prompt
            attempts = 0
            retry_history = []
            final_prompt = None
            
            # Track successfully generated images
            generated_images = []
            
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
                    for url in image_urls:
                        if not url:
                            continue
                        
                        messages.append({
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": url
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
                        # If we've reached max retries, check if we have any successfully generated images
                        if generated_images:
                            logger.warning("Max retries reached with rejection. Using last successful generated image.")
                            # Use the most recent successfully generated image
                            final_image = generated_images[-1]["url"]
                            final_prompt = generated_images[-1]["prompt"]
                            break
                        else:
                            # No images were successfully generated
                            logger.error("Failed to generate any valid images after maximum retries.")
                            raise ValueError("Could not generate a valid image after maximum retries. All prompts were rejected.")
                    else:
                        # Try again with a more conservative prompt
                        conservative_prompt = f"{current_prompt} Please create a clean, professional advertisement image suitable for all audiences."
                        current_prompt = conservative_prompt
                        attempts += 1
                        continue
                
                try:
                    # Generate image with DALL·E 3
                    response = self.client.images.generate(
                        model="dall-e-3",
                        prompt=enhanced_prompt,
                        size=canvas_size,
                        quality="standard",
                        n=1,
                    )
                    
                    dalle_image_url = response.data[0].url
                    logger.info(f"Image generated successfully (attempt {attempts+1})")
                    
                    # Track this successfully generated image
                    generated_images.append({
                        "url": dalle_image_url,
                        "prompt": enhanced_prompt,
                        "attempt": attempts + 1
                    })
                    
                    # Check if we need to verify text in the image
                    if verify_text and self._should_verify_text(enhanced_prompt):
                        logger.info("Verifying text in generated image...")
                        is_text_valid, reformulated_prompt = self._verify_image_text_with_history(
                            image_url=dalle_image_url,
                            original_prompt=enhanced_prompt,
                            retry_history=retry_history
                        )

                        if is_text_valid:
                            logger.info("Text verification passed")
                            final_prompt = enhanced_prompt
                            final_image = dalle_image_url
                            break
                        elif reformulated_prompt and attempts < max_retries:
                            logger.info(f"Text verification failed, retrying with reformulated prompt (attempt {attempts+1})")
                            retry_history.append({
                                "attempt": attempts + 1,
                                "prompt": enhanced_prompt,
                                "image_url": dalle_image_url,
                                "reformulated_prompt": reformulated_prompt
                            })
                            current_prompt = reformulated_prompt
                            attempts += 1
                            continue
                        else:
                            logger.warning("Text verification failed but max retries reached or no reformulation available")
                            # Still use this image as it's the best we have
                            final_prompt = enhanced_prompt
                            final_image = dalle_image_url
                            break
                    else:
                        # No text verification needed
                        final_prompt = enhanced_prompt
                        final_image = dalle_image_url
                        break
                except Exception as dalle_error:
                    logger.error(f"Error generating image with DALL-E: {str(dalle_error)}")
                    if attempts >= max_retries:
                        if generated_images:
                            # Use the last successful image if we have any
                            logger.warning("Error with DALL-E, using previous successful image.")
                            final_image = generated_images[-1]["url"]
                            final_prompt = generated_images[-1]["prompt"]
                            break
                        else:
                            # No images were successfully generated
                            raise ValueError(f"Failed to generate any valid images: {str(dalle_error)}")
                    attempts += 1
                    continue
            
            # If we've exited the loop without a final image but have generated images
            if not 'final_image' in locals() and generated_images:
                final_image = generated_images[-1]["url"]
                if not final_prompt:
                    final_prompt = generated_images[-1]["prompt"]
            elif not 'final_image' in locals():
                # This should not happen due to earlier checks, but as a fallback
                raise ValueError("Failed to generate any valid images after maximum retries.")
                
            # Prepare metadata from the OpenAI responses
            metadata = {
                "gpt4o_model": "gpt-4o",
                "dalle_model": "dall-e-3",
                "canvas_size": canvas_size,
                "quality": "standard",
                "attempts": attempts + 1,
                "retry_history": retry_history,
                "generated_images_count": len(generated_images)
            }
            
            return {
                "image_url": final_image,
                "final_prompt": final_prompt,
                "retry_history": retry_history,
                "metadata": metadata
            }
        except Exception as e:
            logger.error(f"Error in generate_image_from_text_and_images: {str(e)}")
            raise
