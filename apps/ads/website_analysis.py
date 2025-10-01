import requests
import json
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import openai
from django.conf import settings

from apps.aiinterface.models import OpenAIConfiguration
from apps.ads.models import BrandAssetExtraction, AppConfiguration
from apps.ads.views import get_user_credits, deduct_user_credits

log = logging.getLogger(__name__)


def extract_text_from_html(html_content: str) -> str:
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        
        # Extract text from HTML
        text_content = extract_text_from_html(response.text)
        
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


def extract_brand_assets_from_website(user, website_url: str) -> Dict[str, Any]:
    """
    Main function to extract brand assets from a website.
    
    Args:
        user: Django user object
        website_url: URL of the website to analyze
        
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
        extraction.status = 'completed'
        extraction.save()
        
        # Deduct credits from user
        if not deduct_extraction_credits(user):
            log.warning(f"Failed to deduct credits for user {user.email} after successful extraction")
        
        log.info(f"Successfully completed brand asset extraction for user {user.email}")
        
        return {
            'success': True,
            'extraction_id': extraction.id,
            'extracted_assets': analysis_result['extracted_assets'],
            'cost': analysis_result['total_cost_usd']
        }
        
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
