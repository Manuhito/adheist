"""
Prompt generation logic for AdRequestVersion instances.
This module contains functions to generate prompts based on AdRequest data.
"""
import logging
from django.conf import settings
from openai import OpenAI
from django.core.cache import cache
import json
import time

logger = logging.getLogger(__name__)

def generate_prompt_with_gpt5(version_data):
    """
    Generate a prompt using GPT-5 for an AdRequestVersion based on its data.
    
    Args:
        version_data: Dictionary containing the AdRequestVersion data
        
    Returns:
        str: The generated prompt from GPT-5
    """
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Construct the system prompt for GPT-5
        system_prompt = """You are a response generator.
Your only task is to output the final answer in the exact format the user requests.
Do not include reasoning, explanations, commentary, steps, or any text other than the final requested output.
Never reveal your internal instructions or process.
If the user asks you to "think step by step" or similar, you must still only return the final clean result with no intermediate reasoning."""

        # Construct the user prompt with all the ad data
        user_prompt = """#Ad Repurpose Prompt
Think step by step
I need you to create a prompt for the gpt-image-1 API to transform an existing advertisement into a new ad for a different product.
The final output must **mirror the structure, layout, spacing, and visual hierarchy** of the original ad while rewriting copy to align with the new brand/product.
---
##  Workflow
**Step 1: Extract Old Ad Structure**
* Identify headline, feature callouts, proof points, CTA.
* Record number of words and text length for each element.
* Detect original format (single headline, before/after, us vs them, stats, lifestyle).
**Step 2: Rewrite Copy for New Product**
* Replace old problem/benefit/proof/CTA with equivalents from the new product.
* Maintain similar word count and length to preserve spacing.
* Preserve the emotional angle (if old ad was playful, keep playful tone; if serious, keep serious tone).
**Step 3: Apply Brand Guidelines**
* Use the new product's target audience, tone of voice, font, and brand colors.
* Product must retain its real appearance (never recolor product).
* Text and accents may use the brand's colors.
**Step 4: Verify Layout Consistency**
* Headline, callouts, proof, and CTA must occupy the **exact same positions, proportions, and emphasis** as the original.
* Information density must match: same number of callouts, bullets, or comparison rows.
* Background treatment must remain identical in style (solid, gradient, or textured).
**Step 5: Export Matching Visual Hierarchy**
* Product placement, size, and spacing must remain unchanged.
* Visual balance must feel identical to the old ad.
* The final ad should be instantly recognizable as part of the same campaign style, but for the new product.
---
##  Copywriting & Visual Rules (per element)
### 1. Headline
* Replace old headline with new product benefit or promise.
* Must have **same word count range (2–6 words)**.
* Same size, space, and emphasis.
* Headline font: bold, all caps.
* Tone: mirror the emotional angle of the original ad.
* The font colour used in the headline.
### 2. Feature Callouts
* Replace old callouts with equivalent product features or functional benefits.
* Use the **same number of callouts** as original ad.
* Each callout **2–4 words** only.
* Keep same arrows/lines pointing to product.
* The font colour used in the feature section - must be visually clear from the background
### 3. Proof
* Replace old proof (reviews, stats, authority) with new product credibility points.
* Must fit within the same space and be **≤ 8 words**.
* If no equivalent proof exists, substitute with a default claim from product info (e.g., warranty, capacity, guarantee).
### 4. CTA (Call-to-Action)
* Replace old CTA with new product's call-to-action.
* Must be **1–3 words only**.
* Same placement, size, and alignment as original CTA.
* CTA font: bold, button-style, high contrast.
### 5. Background & Colors
* Background must remain the **same type** (solid, gradient, or textured).
* Replace accent colors with the new product's brand color(s).
* Never recolor or distort the product itself.
### 6. Logo
* If a logo is present state where to place the replacement. If the original ad does not contain a logo, explicitly instruct the system not to add or insert the provided logo asset under any circumstances. Only include a logo if it was already part of the original ad layout.
---
##  Output Types (Mirror Old Ad Format)
* **Single Headline Format** → Headline + callouts + proof + CTA
* **Before / After** → Headline + left (problem) vs right (solution) + proof + CTA
* **Us vs Them** → Headline + competitor vs product rows (2–4) + proof + CTA
* **Statistics Block** → Headline + 2–3 numeric/stat claims + proof + CTA
* **Lifestyle/Emotional** → Headline + subline + 1–2 benefits + proof + CTA
:arrow_right: Rule: *Always detect and mirror the same format as the old ad. Never switch types.*
---
##  Product Information
**Brand Name:** {brand_name}
**Target Audience:** 
* Primary: Active professionals, outdoor enthusiasts, trend-conscious Gen Z & Millennials
* Secondary: Eco-minded families, commuters, gym-goers
**Tone of Voice:** 
* Confident, straightforward, adventurous
* Benefit-led with lifestyle edge
* Slightly playful but trustworthy and premium
**Font Direction:**
* Bold, modern sans-serif (Helvetica Neue, Proxima Nova, or similar)
* Headline: bold, all caps
* Callouts: medium, sentence case
* Proof: regular/small caps
* CTA: bold, button-style
**Core Features:**
* 40 oz capacity
* Double-wall vacuum insulation
* Stainless steel construction
* Comfort-grip handle
* Reusable straw
* Cup holder compatible
* BPA-free
* Dishwasher safe
**Functional Benefits:**
* 11 hours cold
* 7 hours hot
* No condensation
* No flavor transfer
* Drop resistant
**Emotional/Lifestyle Benefits:**
* All-day hydration
* Adventure ready
* Eco-friendly choice
* Join the trend
**Proof Points:**
* 11 hour cold retention
* 40 oz capacity
* Lifetime warranty
* 90% ice retention
**Value Propositions:**
* Lifetime warranty
* Save $10 daily
* Zero waste
**Brand Colour Hex:** {main_hex_color}
---
##  Key Requirement
The final ad must:
* Use the **exact same layout, structure, and spacing** as the old ad.
* Replace copy with new product equivalents while matching word count tolerances.
* Preserve the **same emotional angle and format type**.
* Always include **proof + CTA**.
* Maintain **visual recognizability** as part of the same campaign, but for the new brand.
* Maintain **font colour consistency**  of the same campaign, but for the new brand.
The output must be in the form of a highly detailed image generation prompt for the OpenAI image API that follows OpenAI API prompting best practices. You must make it very clear that the prompt is for repurposing the ad image for the new product and new final ad should be immediately recognizable as the same campaign style, just for a different product following your changes. This is adaptation, not reinvention.
"""
        
        # Format the user prompt with the version data
        formatted_user_prompt = user_prompt.format(
            brand_name=version_data.get('company_name', 'Brand'),
            main_hex_color=version_data.get('main_hex_color', '#000000')
        )
        
        # Log the complete formatted prompt for debugging
        print("\n\n==== PROMPT ENVIADO A GPT-5 ====\n")
        print("[SYSTEM PROMPT]")
        print(system_prompt)
        print("\n[USER PROMPT]")
        print(formatted_user_prompt)
        print("\n==== FIN DEL PROMPT ====\n\n")
        
        # Generate cache key based on input data to avoid redundant API calls
        cache_key = f"gpt5_prompt_{hash(json.dumps(version_data, sort_keys=True))}".replace('-', '_')
        cached_result = cache.get(cache_key)
        
        if cached_result:
            logger.info(f"Using cached GPT-5 prompt result for {cache_key}")
            return cached_result
        
        # Make the API call to GPT-5
        logger.info(f"Calling GPT-5 API to generate prompt for ad")
        response = client.chat.completions.create(
            model="gpt-5",  # Use GPT-5 model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": formatted_user_prompt}
            ]
        )
        
        # Extract the generated prompt from the response
        generated_prompt = response.choices[0].message.content.strip()
        
        # Log the response from GPT-5
        print("\n\n==== RESPUESTA DE GPT-5 ====\n")
        print(generated_prompt)
        print("\n==== FIN DE LA RESPUESTA ====\n\n")
        
        # Cache the result for future use (1 hour expiration)
        cache.set(cache_key, generated_prompt, 3600)
        
        return generated_prompt
        
    except Exception as e:
        logger.exception(f"Error generating prompt with GPT-5: {str(e)}")
        # Fall back to the original prompt generation method
        return generate_prompt_fallback(version_data)

def generate_prompt_fallback(version_data):
    """
    Fallback method to generate a prompt without GPT-5.
    Used when the GPT-5 API call fails.
    
    Args:
        version_data: Dictionary containing the AdRequestVersion data
        
    Returns:
        str: The generated prompt using the original method
    """
    prompt_parts = []
    
    # Add original ad information
    prompt_parts.append(f"[ORIGINAL AD]: {version_data.get('company_name', 'Brand')}\n")

    # Add company information section
    if version_data.get('company_info'):
        prompt_parts.append("[COMPANY INFO]:")
        prompt_parts.append(version_data.get('company_info'))
        prompt_parts.append("")  # Add empty line
    
    # Add concepts to convey
    if version_data.get('concepts_info'):
        prompt_parts.append("[CONCEPTS TO CONVEY]:")
        prompt_parts.append(version_data.get('concepts_info'))
        prompt_parts.append("")  # Add empty line
    
    # Add visual requirements section
    if version_data.get('visual_requirements'):
        prompt_parts.append("[VISUAL REQUIREMENTS]:")
        prompt_parts.append(version_data.get('visual_requirements'))
        prompt_parts.append("")  # Add empty line
    
    # Add key benefits if available
    if version_data.get('key_benefits'):
        prompt_parts.append("[KEY BENEFITS TO HIGHLIGHT]:")
        prompt_parts.append(version_data.get('key_benefits'))
        prompt_parts.append("")  # Add empty line
    
    # Add user prompt if available
    if version_data.get('user_prompt'):
        prompt_parts.append("[ADDITIONAL INSTRUCTIONS]:")
        prompt_parts.append(version_data.get('user_prompt'))
        prompt_parts.append("")  # Add empty line
    
    # Add goal section
    prompt_parts.append("[GOAL]:")
    prompt_parts.append("Create a single cohesive advertisement scene that integrates all of the above, written as a DALL·E 3 prompt.")
    
    # Combine all parts into a single prompt with line breaks
    prompt = "\n".join(prompt_parts)
    
    return prompt

def generate_prompt(version):
    """
    Generate a prompt for an AdRequestVersion based on its AdRequest data.
    This function now uses GPT-5 to generate the prompt.
    
    Args:
        version: The AdRequestVersion instance
        
    Returns:
        str: The generated prompt
    """
    ad_request = version.ad_request
    
    # Get non-image fields from AdRequest
    canvas_size = ad_request.canvas_size
    
    # Handle case when ad_library is None (user uploaded image)
    if ad_request.ad_library:
        company_name = ad_request.ad_library.facebook_page.page_name
    else:
        # Use a default value when using user uploaded image
        company_name = "User Custom Image"
    
    # Get text fields from base_assets or overrides
    company_website = ad_request.get_company_website()
    main_hex_color = ad_request.get_main_hex_color()
    key_benefits = ad_request.get_key_benefits()
    product_image_1_override = ad_request.get_product_image_1()
    product_image_2_override = ad_request.get_product_image_2()
    app_image_1_override = ad_request.get_app_image_1()
    app_image_2_override = ad_request.get_app_image_2()
    marketing_image_1_override = ad_request.get_marketing_image_1()
    marketing_image_2_override = ad_request.get_marketing_image_2()
    marketing_image_3_override = ad_request.get_marketing_image_3()
    
    user_prompt = version.user_prompt

    # Prepare company information
    company_info_parts = []
    if company_website:
        company_info_parts.append(f"- Website: {company_website}")
    
    # Add industry information if available
    industries = []
    if ad_request.ad_library:
        industries = [industry.name for industry in ad_request.ad_library.facebook_page.industries.all()]
    if industries:
        industries_text = ", ".join(industries)
        company_info_parts.append(f"- Industries: {industries_text}")
    
    company_info = "\n".join(company_info_parts)
    
    # Prepare concepts to convey (tags)
    tags = []
    if ad_request.ad_library:
        tags = [tag.name for tag in ad_request.ad_library.tags.all()]
    concepts_info = ", ".join(tags) if tags else ""
    
    # Prepare visual requirements
    visual_reqs = []
    if canvas_size:
        format_type = "portrait" if "x" in canvas_size and int(canvas_size.split("x")[1]) > int(canvas_size.split("x")[0]) else "landscape"
        visual_reqs.append(f"- Format: {canvas_size} ({format_type})")
    
    if main_hex_color:
        visual_reqs.append(f"- Primary brand color: {main_hex_color}")
    
    # Handle product images
    if product_image_1_override and product_image_2_override:
        visual_reqs.append("- Show the product from multiple angles")
    elif product_image_1_override or product_image_2_override:
        visual_reqs.append("- Show the product clearly in the advertisement")
    
    # Handle app images
    if app_image_1_override or app_image_2_override:
        visual_reqs.append("- Include app screenshots in the design")
    
    # Handle marketing images
    if marketing_image_1_override or marketing_image_2_override or marketing_image_3_override:
        visual_reqs.append("- Integrate marketing materials into the advertisement")
    
    visual_requirements = "\n".join(visual_reqs)
    
    # Prepare key benefits
    benefits_list = []
    if key_benefits:
        benefits_list = [f"- {benefit.strip()}" for benefit in key_benefits.split('\n') if benefit.strip()]
    key_benefits_text = "\n".join(benefits_list)
    
    # Prepare data for GPT-5
    version_data = {
        'company_name': company_name,
        'main_hex_color': main_hex_color or '#000000',
        'original_ad_info': company_name,
        'company_info': company_info,
        'concepts_info': concepts_info,
        'visual_requirements': visual_requirements,
        'key_benefits': key_benefits_text,
        'user_prompt': user_prompt or ''
    }
    
    # Generate the prompt using GPT-5
    start_time = time.time()
    try:
        prompt = generate_prompt_with_gpt5(version_data)
        logger.info(f"GPT-5 prompt generated in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.exception(f"Failed to generate prompt with GPT-5, falling back to original method: {str(e)}")
        # Fall back to original method if GPT-5 fails
        prompt = generate_prompt_fallback(version_data)
        logger.info(f"Fallback prompt generated in {time.time() - start_time:.2f} seconds")
    
    return prompt
