"""
Prompt generation logic for AdRequestVersion instances.
This module contains functions to generate prompts based on AdRequest data.
"""

def generate_prompt(version):
    """
    Generate a prompt for an AdRequestVersion based on its AdRequest data.
    
    Args:
        version: The AdRequestVersion instance
        
    Returns:
        str: The generated prompt
    """
    ad_request = version.ad_request
    
    # Get non-image fields from AdRequest
    canvas_size = ad_request.canvas_size
    company_name = ad_request.ad_library.company_name
    
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

    # Start building the prompt
    prompt_parts = []
    
    # Add basic information
    prompt_parts.append(f"Create an advertisement for {company_name}.\n")

    # Add website information if available
    if company_website:
        prompt_parts.append(f"The company website is {company_website}.\n")

    # Add industry information if available
    industries = [industry.name for industry in ad_request.ad_library.industries.all()]
    if industries:
        industries_text = ", ".join(industries)
        prompt_parts.append(f"The company is in the following industries: {industries_text}.\n")

    # Add tags information if available
    tags = [tag.name for tag in ad_request.ad_library.tags.all()]
    if tags:
        tags_text = ", ".join(tags)
        prompt_parts.append(f"The advertisement should convey these concepts: {tags_text}.\n")
    
    # Add canvas size information
    if canvas_size:
        prompt_parts.append(f"The advertisement should be in {canvas_size} format.\n")
    
    # Add color information if available
    if main_hex_color:
        prompt_parts.append(f"Use {main_hex_color} as the primary brand color.\n")
    
    # Add key benefits if available
    if key_benefits:
        prompt_parts.append(f"Highlight these key benefits:\n {key_benefits}\n")
    
    # Handle product images based on what's available
    if product_image_1_override and product_image_2_override:
        # Both product images are available
        prompt_parts.append(f"The product is shown in multiple angles\n")
    elif product_image_1_override:
        # Only first product image is available
        prompt_parts.append(f"The product is shown in this image\n")
    elif product_image_2_override:
        # Only second product image is available
        prompt_parts.append(f"The product is shown in this image\n")

    # Handle app images based on what's available
    if app_image_1_override and app_image_2_override:
        # Both app images are available
        prompt_parts.append(f"The app is shown in multiple screenshots\n")
    elif app_image_1_override:
        # Only first app image is available
        prompt_parts.append(f"The app is shown in this screenshot\n")
    elif app_image_2_override:
        # Only second app image is available
        prompt_parts.append(f"The app is shown in this screenshot\n")
    
    # Handle marketing images based on what's available
    if marketing_image_1_override and marketing_image_2_override and marketing_image_3_override:
        # All three marketing images are available
        prompt_parts.append(f"I will attach the brand has multiple marketing materials\n")
    elif marketing_image_1_override and marketing_image_2_override:
        # First two marketing images are available
        prompt_parts.append(f"I will attach the brand has these marketing materials\n")
    elif marketing_image_1_override and marketing_image_3_override:
        # First and third marketing images are available
        prompt_parts.append(f"I will attach the brand has these marketing materials\n")
    elif marketing_image_2_override and marketing_image_3_override:
        # Second and third marketing images are available
        prompt_parts.append(f"I will attach the brand has these marketing materials\n")
    elif marketing_image_1_override:
        # Only first marketing image is available
        prompt_parts.append(f"I will attach the brand has this marketing material\n")
    elif marketing_image_2_override:
        # Only second marketing image is available
        prompt_parts.append(f"I will attach the brand has this marketing material\n")
    elif marketing_image_3_override:
        # Only third marketing image is available
        prompt_parts.append(f"I will attach the brand has this marketing material\n")
    
    # Add user prompt if available
    if user_prompt:
        prompt_parts.append(f"{user_prompt}\n")
    
    # Combine all parts into a single prompt
    prompt = " ".join(prompt_parts)
    
    return prompt
