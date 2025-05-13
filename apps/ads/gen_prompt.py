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
    
    # Add original ad information
    prompt_parts.append(f"[ORIGINAL AD]: {company_name}\n")

    # Add company information section
    company_info = []
    if company_website:
        company_info.append(f"- Website: {company_website}")
    
    # Add industry information if available
    industries = [industry.name for industry in ad_request.ad_library.industries.all()]
    if industries:
        industries_text = ", ".join(industries)
        company_info.append(f"- Industries: {industries_text}")
    
    if company_info:
        prompt_parts.append("[COMPANY INFO]:")
        prompt_parts.extend(company_info)
        prompt_parts.append("")  # Add empty line
    
    # Add concepts to convey (tags)
    tags = [tag.name for tag in ad_request.ad_library.tags.all()]
    if tags:
        tags_text = ", ".join(tags)
        prompt_parts.append("[CONCEPTS TO CONVEY]:")
        prompt_parts.append(f"- {tags_text}")
        prompt_parts.append("")  # Add empty line
    
    # Add visual requirements section
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
    
    if visual_reqs:
        prompt_parts.append("[VISUAL REQUIREMENTS]:")
        prompt_parts.extend(visual_reqs)
        prompt_parts.append("")  # Add empty line
    
    # Add key benefits if available
    if key_benefits:
        benefits_list = [f"- {benefit.strip()}" for benefit in key_benefits.split('\n') if benefit.strip()]
        if benefits_list:
            prompt_parts.append("[KEY BENEFITS TO HIGHLIGHT]:")
            prompt_parts.extend(benefits_list)
            prompt_parts.append("")  # Add empty line
    
    # Add user prompt if available
    if user_prompt:
        prompt_parts.append("[ADDITIONAL INSTRUCTIONS]:")
        prompt_parts.append(f"{user_prompt}")
        prompt_parts.append("")  # Add empty line
    
    # Add goal section
    prompt_parts.append("[GOAL]:")
    prompt_parts.append("Create a single cohesive advertisement scene that integrates all of the above, written as a DALL·E 3 prompt.")
    
    # Combine all parts into a single prompt with line breaks
    prompt = "\n".join(prompt_parts)
    
    return prompt
