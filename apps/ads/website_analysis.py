import requests
import json
import logging
import re
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import openai
from django.conf import settings

from apps.aiinterface.models import OpenAIConfiguration
from apps.ads.models import BrandAssetExtraction, AppConfiguration, UserBrand, AdRequestAssets
from apps.ads.views import get_user_credits, deduct_user_credits
from apps.aiinterface.tasks import send_slack_notification

log = logging.getLogger(__name__)

FRAMEWORK_MARKERS = {
    "nextjs_data": lambda html: re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S),
    "nuxt_state":  lambda html: re.search(r'window\.__NUXT__\s*=\s*({.*?});', html, re.S),
    "apollo":      lambda html: re.search(r'window\.__APOLLO_STATE__\s*=\s*({.*?});', html, re.S),
    "generic_json":lambda html: re.search(r'<script[^>]+type="application/json"[^>]*>(.*?)</script>', html, re.S),
    "react_root":  lambda html: re.search(r'id="__(next|root)"|data-reactroot', html, re.I),
    "nuxt_root":   lambda html: re.search(r'id="__nuxt"', html, re.I),
    "gatsby_hint": lambda html: re.search(r'/page-data/[^"]+/page-data\.json', html),
}

def has_target_content(html, selectors):
    soup = BeautifulSoup(html, "lxml")
    hits = sum(bool(soup.select_one(sel)) for sel in selectors)
    # adjust threshold as needed
    return hits >= min(2, len(selectors))  # e.g., any 2 selectors present

def detect_js_heavy(html):
    found = {k: bool(v(html)) for k,v in FRAMEWORK_MARKERS.items()}
    score = sum(found.values())
    return found, score

def decide_scrape_mode(url, selectors):
    html = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=20).text
    if has_target_content(html, selectors):
        return {"mode":"simple_html", "reason":"selectors present in initial HTML"}

    markers, score = detect_js_heavy(html)
    # Prefer data blobs or API hints first
    if markers["nextjs_data"] or markers["nuxt_state"] or markers["apollo"] or markers["generic_json"]:
        return {"mode":"parse_embedded_json", "markers": markers}
    if markers["gatsby_hint"]:
        return {"mode":"fetch_gatsby_page_data", "markers": markers}
    if score >= 2 or markers["react_root"] or markers["nuxt_root"]:
        return {"mode":"use_playwright", "markers": markers}

    # Fallback: try to discover API endpoints by regex
    api_like = re.findall(r'https?://[^"]+/(api|graphql|page-data)[^"]*', html, re.I)
    if api_like:
        return {"mode":"call_discovered_api", "examples": list(set(api_like))[:5]}

    return {"mode":"use_playwright", "reason":"content missing in HTML and no easy data endpoints"}


def extract_text_from_html(html_content: bytes) -> str:
    """
    Extract visible text from HTML content, removing scripts, styles, and navigation elements.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements (but keep main content areas)
        for element in soup(["script", "style", "noscript"]):
            element.decompose()
        
        # Try to find main content area first (common semantic HTML tags)
        main_content = None
        for selector in ['article', 'main', '[role="main"]', '.content', '#content', '.post-content', '.article-content']:
            main_content = soup.select_one(selector)
            if main_content:
                log.info(f"Found main content in selector: {selector}")
                break
        
        # If we found main content, extract from there; otherwise use full body
        if main_content:
            text_source = main_content
        else:
            # Remove navigation elements only if we're using full body
            for element in soup(["nav", "header", "footer"]):
                element.decompose()
            text_source = soup
        
        # Get text and clean it up
        text = text_source.get_text()
        
        # Break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        
        # Drop blank lines
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        log.info(f"Extracted {len(text)} characters of text from HTML")
        
        # Limit text length to avoid token limits (approximately 50,000 characters)
        if len(text) > 50000:
            text = text[:50000] + "..."
        
        return text
    except Exception as e:
        log.error(f"Error extracting text from HTML: {str(e)}")
        return html_content[:10000]  # Fallback to raw HTML truncated


# Anti-fingerprinting script to inject into pages
ANTI_FINGERPRINT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
    Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
    window.chrome = { runtime: {} };
"""

def download_website_content_with_playwright(url: str) -> str:
    """
    Download and extract text content from a website using Playwright.
    Includes anti-detection strategies to avoid bot blocking.
    """
    """Download HTML using Playwright with resilient timeout handling.

    Tries a strict "networkidle" wait first and, on timeout, falls back
    to a more permissive "load" event before continuing. Never raises
    for timeout alone; callers can still fall back to requests.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        try:
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                screen={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="en-US",
            )
            page = context.new_page()
            
            # Inject anti-fingerprinting script
            page.add_init_script(ANTI_FINGERPRINT_SCRIPT)
            
            # Navigate and wait for content. Prefer networkidle but degrade
            # gracefully on timeout.
            try:
                log.info(f"Playwright navigating to %s with wait_until='networkidle'", url)
                page.goto(url, wait_until='networkidle', timeout=30000)
            except PlaywrightTimeoutError as e:
                log.warning(
                    "Playwright networkidle timeout for %s: %s. Falling back to wait_until='load'",
                    url,
                    str(e),
                )
                try:
                    page.goto(url, wait_until='load', timeout=15000)
                except PlaywrightTimeoutError as e2:
                    # Even 'load' timed out; log and continue with whatever HTML we have.
                    log.error(
                        "Playwright load timeout for %s: %s. Proceeding with partial/empty content.",
                        url,
                        str(e2),
                    )
            
            # Try to accept cookie banners (multiple languages)
            cookie_buttons = [
                'Accept', 'Accept All', 'Accept Cookies', 'I Accept', 'OK', 'Got it',
                'Aceptar', 'Aceptar todo', 'Aceptar cookies',
                'Akzeptieren', 'Alle akzeptieren',
                'Accepter', 'Tout accepter',
            ]
            for btn_text in cookie_buttons:
                try:
                    page.click(f'button:has-text("{btn_text}")', timeout=500)
                    break
                except Exception:
                    pass
            
            # Additional wait for dynamic content to render
            page.wait_for_timeout(2000)  # Wait 2 seconds for JS to execute
            
            content = page.content()
            log.info(f"Playwright captured {len(content)} characters of HTML")
            return content
        finally:
            try:
                browser.close()
            except Exception as close_error:
                log.warning(f"Error closing Playwright browser for {url}: {str(close_error)}")

def capture_screenshot_with_playwright(url: str) -> str:
    """
    Capture a screenshot of a website using Playwright and return as base64 string.
    Includes anti-detection strategies to avoid bot blocking.
    """
    import base64
    log.info(f"Starting screenshot capture with Playwright for URL: {url}")
    screenshot_bytes = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            try:
                context = browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    screen={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale="en-US",
                )
                page = context.new_page()
                
                # Inject anti-fingerprinting script
                page.add_init_script(ANTI_FINGERPRINT_SCRIPT)

                log.info(f"Playwright navigating to URL for screenshot: {url}")
                try:
                    page.goto(url, wait_until='networkidle')
                except PlaywrightTimeoutError as e:
                    log.error(f"Playwright timeout while loading URL for screenshot {url}: {str(e)}", exc_info=True)
                    raise
                
                # Try to accept cookie banners (multiple languages)
                cookie_buttons = [
                    'Accept', 'Accept All', 'Accept Cookies', 'I Accept', 'OK', 'Got it',
                    'Aceptar', 'Aceptar todo', 'Aceptar cookies',
                    'Akzeptieren', 'Alle akzeptieren',
                    'Accepter', 'Tout accepter',
                ]
                for btn_text in cookie_buttons:
                    try:
                        page.click(f'button:has-text("{btn_text}")', timeout=500)
                        break
                    except Exception:
                        pass
                
                # Additional wait for dynamic content to render
                page.wait_for_timeout(2000)
                
                # Take screenshot
                screenshot_bytes = page.screenshot(full_page=False)
                log.info(f"Screenshot captured for URL {url}, size={len(screenshot_bytes)} bytes")
            finally:
                try:
                    browser.close()
                except Exception as close_error:
                    log.warning(f"Error while closing Playwright browser after screenshot for {url}: {str(close_error)}")
    except Exception as e:
        log.error(f"Error capturing screenshot for URL {url}: {str(e)}", exc_info=True)
        raise

    if not screenshot_bytes:
        raise Exception(f"Screenshot capture returned empty bytes for URL {url}")

    return base64.b64encode(screenshot_bytes).decode('utf-8')

def download_website_content(url: str, selectors: list) -> str:
    """
    Download and extract text content from a website.
    """
    """Download and extract text content from a website.

    This function is designed to be *best-effort* and avoid raising errors
    for transient network / Playwright issues. It prefers Playwright for
    JS-heavy sites but gracefully falls back to plain requests and, in the
    worst case, returns a minimal placeholder string instead of raising.
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
            'Accept-Language': 'en-US,en;q=0.9',
            'Upgrade-Insecure-Requests': '1',
        }
        
        decision = decide_scrape_mode(url, selectors)
        log.info(f"Scraping decision for {url}: {decision}")

        text_content = ""

        if decision['mode'] == 'use_playwright':
            log.info(f"Using Playwright to download content from {url}")
            try:
                html_content = download_website_content_with_playwright(url)
                text_content = extract_text_from_html(html_content.encode('utf-8'))
            except Exception as e:
                # If Playwright fails (timeouts, browser issues, etc.),
                # fall back to plain requests instead of aborting.
                log.warning(
                    f"Playwright failed for {url} with error: {str(e)}. Falling back to requests-only.",
                    exc_info=True,
                )
                try:
                    response = requests.get(url, timeout=20, headers=headers, allow_redirects=True)
                    response.raise_for_status()
                    detected_encoding = response.apparent_encoding
                    final_encoding = detected_encoding or 'utf-8'
                    log.info(f"[fallback] Detected encoding: {detected_encoding}. Using: {final_encoding}")
                    response.encoding = final_encoding
                    text_content = extract_text_from_html(response.text.encode(final_encoding))
                except Exception as req_e:
                    log.error(
                        f"Both Playwright and requests failed for {url}: {str(req_e)}",
                        exc_info=True,
                    )
        else:
            log.info(f"Using requests to download content from {url}")
            response = requests.get(url, timeout=15, headers=headers, allow_redirects=True)
            response.raise_for_status()

            # Explicitly set encoding from headers, fallback to UTF-8
            detected_encoding = response.apparent_encoding
            final_encoding = detected_encoding or 'utf-8'
            log.info(f"Detected encoding: {detected_encoding}. Using: {final_encoding}")
            response.encoding = final_encoding
            
            # Use response.text to get properly decoded content (requests handles decompression)
            text_content = extract_text_from_html(response.text.encode(final_encoding))
        
        if not text_content:
            log.warning(f"No text content extracted for {url}. Returning minimal placeholder.")
            return f"No readable content could be extracted from {url}."
        
        log.info(f"Successfully downloaded content from {url}, extracted {len(text_content)} characters")
        return text_content
        
    except requests.exceptions.RequestException as e:
        log.error(f"Error downloading website {url}: {str(e)}", exc_info=True)
        # Best-effort fallback: return an explanatory string instead of raising.
        return f"Failed to download website content for {url}: {str(e)}"
    except Exception as e:
        log.error(f"Unexpected error downloading website {url}: {str(e)}", exc_info=True)
        # Final fallback: never raise, always return some text so analysis can proceed.
        return f"Unexpected error while downloading website content for {url}: {str(e)}"


def analyze_website_with_openai(website_content: str, url: str) -> Dict[str, Any]:
    """
    Analyze website content using OpenAI API to extract brand assets.
    """
    try:
        log.info(f"Website content to be sent to OpenAI for URL {url}:\n{website_content}")

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

Only extract information that is clearly present on the website. If information is not available, set the corresponding parameter to null data type in the JSON response."""
        
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
            brand_name = "Brand Name not found"
        
        # Check if brand with this name already exists for this user (only active brands)
        if UserBrand.objects.filter(user=user, brand_name=brand_name, active=True).exists():
            # Generate a unique name by appending a number
            counter = 1
            original_name = brand_name
            while UserBrand.objects.filter(user=user, brand_name=brand_name, active=True).exists():
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

        # Prepare brand colors for the response
        response_brand_colors = []
        if ad_request_assets.main_hex_color:
            try:
                response_brand_colors = json.loads(ad_request_assets.main_hex_color)
            except (json.JSONDecodeError, TypeError):
                response_brand_colors = []

        return {
            'success': True,
            'brand_id': brand.id, # Include brand ID for reference
            'brand_name': brand.brand_name,
            'industry': ad_request_assets.industry,
            'product_description': ad_request_assets.product_description,
            'target_audience': ad_request_assets.target_audience,
            'tone_of_voice': ad_request_assets.tone_of_voice,
            'core_features': ad_request_assets.core_features,
            'functional_benefits': ad_request_assets.functional_benefits,
            'emotional_benefits': ad_request_assets.emotional_lifestyle_benefits,
            'proof_points': ad_request_assets.proof_points,
            'value_propositions': ad_request_assets.value_propositions,
            'brand_colors': response_brand_colors
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
                # Define selectors to look for
        selectors = ["article", ".card", "[data-test=item]"]
        website_content = download_website_content(website_url, selectors)
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
        
        # Finalize based on brand creation success
        if brand_creation_result.get('success'):
            # Deduct credits ONLY after successful brand creation
            if not deduct_extraction_credits(user):
                log.warning(f"Failed to deduct credits for user {user.email} after successful extraction and brand creation")

            extraction.status = 'completed'
            log.info(f"Successfully created brand '{brand_creation_result.get('brand_name')}' and completed extraction for user {user.email}")

            # The frontend expects the updated data in 'extracted_assets' and a 'brand' object.
            # We will construct the response to match this expectation.
            final_brand_data = brand_creation_result.copy()
            final_brand_data['id'] = final_brand_data.pop('brand_id', None) # Rename brand_id to id for frontend
            final_brand_data['name'] = final_brand_data.get('brand_name') # Add name alias for frontend

            result = {
                'success': True,
                'extraction_id': extraction.id,
                'extracted_assets': final_brand_data,  # Use the updated data
                'cost': analysis_result['total_cost_usd'],
                'brand_created': True,
                'brand': final_brand_data  # Also provide the updated data in the 'brand' field
            }
        else:
            # If brand creation failed, return the original extracted assets
            result = {
                'success': False,
                'extraction_id': extraction.id,
                'extracted_assets': analysis_result['extracted_assets'],
                'cost': analysis_result['total_cost_usd'],
                'brand_created': False,
                'brand_creation_error': brand_creation_result.get('error')
            }
            extraction.status = 'failed'
            extraction.error_log = brand_creation_result.get('error', 'Brand creation failed without specific error')
            log.warning(f"Failed to create brand automatically: {brand_creation_result.get('error')}")

        extraction.save()
        
        return result
        
    except Exception as e:
        error_message = str(e)
        log.error(f"Brand asset extraction failed for user {user.email}: {error_message}")
        
        # Send Slack notification for technical errors (excluding credit issues)
        if "insufficient credits" not in error_message.lower():
            context = {
                "User": user.email,
                "Website URL": website_url,
            }
            send_slack_notification(
                title="Brand Asset Extraction Failed",
                error_message=error_message,
                context=context
            )
        
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
