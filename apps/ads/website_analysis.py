import requests
import json
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import openai
from django.conf import settings

from apps.aiinterface.models import OpenAIConfiguration
from apps.ads.models import BrandAssetExtraction, AppConfiguration, UserBrand, AdRequestAssets
from apps.ads.views import get_user_credits, deduct_user_credits

log = logging.getLogger(__name__)


def extract_text_from_html(html_content: bytes) -> str:
    """
    Extract visible text from HTML content, removing scripts, styles, and navigation elements.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "header", "footer"]):
            script.decompose()
        
        # Get text and clean it up
        text = soup.get_text()
        
        # Break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        
        # Drop blank lines
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Limit text length to avoid token limits (approximately 50,000 characters)
        if len(text) > 50000:
            text = text[:50000] + "..."
        
        return text
    except Exception as e:
        log.error(f"Error extracting text from HTML: {str(e)}")
        return html_content[:10000]  # Fallback to raw HTML truncated


def download_website_content(url: str) -> str:
    """
    Download and extract text content from a website.
    """
    try:
        # Ensure URL has a scheme
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Validate URL
        parsed = urlparse(url)
        if not parsed.netloc:
            raise ValueError("Invalid URL format")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
        }
        
        response = requests.get(url, timeout=15, headers=headers, allow_redirects=True)
        response.raise_for_status()

        # Explicitly set encoding from headers, fallback to UTF-8
        detected_encoding = response.apparent_encoding
        final_encoding = detected_encoding or 'utf-8'
        log.info(f"Detected encoding: {detected_encoding}. Using: {final_encoding}")
        response.encoding = final_encoding
        
        # Extract text from HTML
        text_content = extract_text_from_html(response.content)
        
        log.info(f"Successfully downloaded content from {url}, extracted {len(text_content)} characters")
        return text_content
        
    except requests.exceptions.RequestException as e:
        log.error(f"Error downloading website {url}: {str(e)}")
        raise Exception(f"Failed to download website content: {str(e)}")
    except Exception as e:
        log.error(f"Unexpected error downloading website {url}: {str(e)}")
        raise Exception(f"Unexpected error: {str(e)}")


def analyze_website_with_openai(website_content: str, url: str) -> Dict[str, Any]:
    """
    Analyze website content using OpenAI API to extract brand assets.
    """
    try:
        # Get web parsing configuration
        config = OpenAIConfiguration.get_webparsing_config()
        
        # Set up OpenAI client
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Hardcoded response format instructions (never change)
        response_format_instructions = """Return a JSON object with the following exact structure:
{
    "brand_name": "extracted brand name",
    "industry": "industry/vertical",
    "product_description": "description of products/services",
    "target_audience": "target audience description",
    "tone_of_voice": "brand tone of voice",
    "core_features": "key features of products/services",
    "functional_benefits": "functional benefits",
    "emotional_benefits": "emotional/lifestyle benefits",
    "proof_points": "proof points, testimonials, awards",
    "value_propositions": "unique value propositions",
    "brand_colors": ["#color1", "#color2"] // extract hex colors if visible
}

Only extract information that is clearly present on the website. If information is not available, use null for that field."""
        
        # Build the complete prompt combining user instructions, website content, and format requirements
        complete_prompt = f"""{config['web_parsing_prompt']}

Website content:
{website_content}

{response_format_instructions}"""
        
        log.info(f"Analyzing website content with model: {config['web_parsing_model']}")
        
        # Make API call
        response = client.chat.completions.create(
            model=config['web_parsing_model'],
            messages=[
                {"role": "user", "content": complete_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Extract response data
        raw_response = response.choices[0].message.content
        usage = response.usage
        
        # Parse JSON response
        try:
            extracted_data = json.loads(raw_response)
        except json.JSONDecodeError as e:
            log.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            log.error(f"Raw response: {raw_response}")
            raise Exception("OpenAI returned invalid JSON response")
        
        # Calculate costs
        input_tokens = usage.prompt_tokens
        output_tokens = usage.completion_tokens
        
        input_cost = (input_tokens / 1_000_000) * float(config['web_parsing_input_price'])
        output_cost = (output_tokens / 1_000_000) * float(config['web_parsing_output_price'])
        
        result = {
            'model_used': config['web_parsing_model'],
            'raw_response': raw_response,
            'extracted_assets': extracted_data,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'input_cost_usd': input_cost,
            'output_cost_usd': output_cost,
            'total_cost_usd': input_cost + output_cost
        }
        
        log.info(f"Successfully analyzed website. Tokens: {input_tokens} input, {output_tokens} output. Cost: ${result['total_cost_usd']:.6f}")
        
        return result
        
    except openai.OpenAIError as e:
        log.error(f"OpenAI API error: {str(e)}")
        raise Exception(f"OpenAI API error: {str(e)}")
    except Exception as e:
        log.error(f"Unexpected error in OpenAI analysis: {str(e)}")
        raise Exception(f"Analysis failed: {str(e)}")


def check_user_credits(user) -> bool:
    """
    Check if user has enough credits for brand asset extraction.
    """
    try:
        app_config = AppConfiguration.get_config()
        required_credits = app_config.brand_assets_generation_cost
        
        user_credits = get_user_credits(user)
        available_credits = user_credits['general_credits'] + user_credits.get('extra_general_credits', 0)
        
        return available_credits >= required_credits
    except Exception as e:
        log.error(f"Error checking user credits: {str(e)}")
        return False


def deduct_extraction_credits(user) -> bool:
    """
    Deduct credits for brand asset extraction.
    """
    try:
        app_config = AppConfiguration.get_config()
        required_credits = app_config.brand_assets_generation_cost
        
        return deduct_user_credits(user, required_credits)
    except Exception as e:
        log.error(f"Error deducting extraction credits: {str(e)}")
        return False


def create_brand_from_extraction(user, extracted_assets: Dict[str, Any], website_url: str, ad_request_id: str = None, extraction_id: int = None) -> Dict[str, Any]:
    """
    Create UserBrand and AdRequestAssets from extracted website data.
    
    Args:
        user: Django user object
        extracted_assets: Dictionary with extracted brand data
        website_url: Original website URL
        ad_request_id: Optional ID of AdRequest to associate with created brand
        extraction_id: Optional ID of BrandAssetExtraction to link with created brand
        
    Returns:
        Dict containing created brand information or error
    """
    try:
        brand_name = extracted_assets.get('brand_name')
        
        if not brand_name:
            raise Exception("No brand name was extracted from the website")
        
        # Check if brand with this name already exists globally (unique constraint)
        if UserBrand.objects.filter(brand_name=brand_name).exists():
            # Generate a unique name by appending a number
            counter = 1
            original_name = brand_name
            while UserBrand.objects.filter(brand_name=brand_name).exists():
                brand_name = f"{original_name} ({counter})"
                counter += 1
        
        # Create the new brand
        brand = UserBrand.objects.create(
            user=user,
            brand_name=brand_name
        )
        
        # Prepare brand colors for storage
        brand_colors = extracted_assets.get('brand_colors', [])
        brand_colors_json = None
        if brand_colors and isinstance(brand_colors, list):
            # Filter valid hex colors
            valid_colors = [color for color in brand_colors if color and isinstance(color, str) and color.startswith('#')]
            if valid_colors:
                brand_colors_json = json.dumps(valid_colors)
        
        # Create associated AdRequestAssets with all extracted data
        ad_request_assets = AdRequestAssets.objects.create(
            user=user,
            brand=brand,
            company_website=website_url,
            main_hex_color=brand_colors_json,
            industry=extracted_assets.get('industry'),
            product_description=extracted_assets.get('product_description'),
            target_audience=extracted_assets.get('target_audience'),
            functional_benefits=extracted_assets.get('functional_benefits'),
            tone_of_voice=extracted_assets.get('tone_of_voice'),
            core_features=extracted_assets.get('core_features'),
            emotional_lifestyle_benefits=extracted_assets.get('emotional_benefits'),
            proof_points=extracted_assets.get('proof_points'),
            value_propositions=extracted_assets.get('value_propositions')
        )
        
        # Associate AdRequest with the created brand if ad_request_id is provided
        if ad_request_id:
            try:
                from apps.ads.models import AdRequest
                ad_request = AdRequest.objects.get(id=ad_request_id, user=user)
                ad_request.base_assets = ad_request_assets
                ad_request.save()
                log.info(f"Associated AdRequest {ad_request_id} with brand '{brand_name}'")
            except AdRequest.DoesNotExist:
                log.warning(f"AdRequest {ad_request_id} not found for user {user.email}")
            except Exception as e:
                log.error(f"Error associating AdRequest {ad_request_id} with brand: {str(e)}")
        
        # Link the extraction with the created brand if extraction_id is provided
        if extraction_id:
            try:
                from apps.ads.models import BrandAssetExtraction
                extraction = BrandAssetExtraction.objects.get(id=extraction_id, user=user)
                extraction.brand = brand
                extraction.save()
                log.info(f"Linked BrandAssetExtraction {extraction_id} with brand '{brand_name}'")
            except BrandAssetExtraction.DoesNotExist:
                log.warning(f"BrandAssetExtraction {extraction_id} not found for user {user.email}")
            except Exception as e:
                log.error(f"Error linking BrandAssetExtraction {extraction_id} with brand: {str(e)}")
        
        log.info(f"Successfully created brand '{brand_name}' and assets for user {user.email}")
        
        return {
            'success': True,
            'brand': {
                'id': brand.id,
                'name': brand.brand_name,
                'industry': ad_request_assets.industry,
                'website': ad_request_assets.company_website,
                'product_description': ad_request_assets.product_description,
                'target_audience': ad_request_assets.target_audience,
                'functional_benefits': ad_request_assets.functional_benefits,
                'brand_colors': brand_colors,
                'tone_of_voice': ad_request_assets.tone_of_voice,
                'core_features': ad_request_assets.core_features,
                'emotional_lifestyle_benefits': ad_request_assets.emotional_lifestyle_benefits,
                'proof_points': ad_request_assets.proof_points,
                'value_propositions': ad_request_assets.value_propositions,
                'ad_request_assets_id': ad_request_assets.id
            }
        }
        
    except Exception as e:
        log.error(f"Error creating brand from extraction: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def extract_brand_assets_from_website(user, website_url: str, ad_request_id: str = None) -> Dict[str, Any]:
    """
    Main function to extract brand assets from a website.
    
    Args:
        user: Django user object
        website_url: URL of the website to analyze
        ad_request_id: Optional ID of AdRequest to associate with created brand
        
    Returns:
        Dict containing extraction results and metadata
    """
    extraction = None
    
    try:
        # Check if user has enough credits
        if not check_user_credits(user):
            app_config = AppConfiguration.get_config()
            required_credits = app_config.brand_assets_generation_cost
            raise Exception(f"Insufficient credits. {required_credits} credits required for brand asset extraction.")
        
        # Create extraction record
        extraction = BrandAssetExtraction.objects.create(
            user=user,
            website_url=website_url,
            status='processing'
        )
        
        log.info(f"Starting brand asset extraction for user {user.email}, URL: {website_url}")
        
        # Download website content
        website_content = download_website_content(website_url)
        log.info(f"Downloaded content preview: {website_content[:500]}...")
        
        # Analyze with OpenAI
        analysis_result = analyze_website_with_openai(website_content, website_url)
        
        # Update extraction record with results
        extraction.model_used = analysis_result['model_used']
        extraction.raw_response = analysis_result['raw_response']
        extraction.extracted_assets = analysis_result['extracted_assets']
        extraction.input_tokens = analysis_result['input_tokens']
        extraction.output_tokens = analysis_result['output_tokens']
        extraction.input_cost_usd = analysis_result['input_cost_usd']
        extraction.output_cost_usd = analysis_result['output_cost_usd']
        extraction.total_cost_usd = analysis_result['total_cost_usd']
        extraction.status = 'processing'  # Keep as processing until brand is created
        extraction.save()
        
        # Automatically create brand and assets from extraction
        brand_creation_result = create_brand_from_extraction(
            user,
            analysis_result['extracted_assets'],
            website_url,
            ad_request_id,
            extraction.id
        )
        
        result = {
            'success': True,
            'extraction_id': extraction.id,
            'extracted_assets': analysis_result['extracted_assets'],
            'cost': analysis_result['total_cost_usd']
        }
        
        # Finalize based on brand creation success
        if brand_creation_result['success']:
            # Deduct credits ONLY after successful brand creation
            if not deduct_extraction_credits(user):
                log.warning(f"Failed to deduct credits for user {user.email} after successful extraction and brand creation")
            
            extraction.status = 'completed'
            result['brand_created'] = True
            result['brand'] = brand_creation_result['brand']
            log.info(f"Successfully created brand '{brand_creation_result['brand']['name']}' and completed extraction for user {user.email}")
        else:
            extraction.status = 'failed'
            extraction.error_log = brand_creation_result.get('error', 'Brand creation failed without specific error')
            result['success'] = False
            result['brand_created'] = False
            result['brand_creation_error'] = brand_creation_result.get('error')
            log.warning(f"Failed to create brand automatically: {brand_creation_result.get('error')}")

        extraction.save()
        
        return result
        
    except Exception as e:
        error_message = str(e)
        log.error(f"Brand asset extraction failed for user {user.email}: {error_message}")
        
        # Update extraction record with error
        if extraction:
            extraction.status = 'failed'
            extraction.error_log = error_message
            extraction.save()
        
        return {
            'success': False,
            'error': error_message,
            'extraction_id': extraction.id if extraction else None
        }
