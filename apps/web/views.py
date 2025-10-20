from django.shortcuts import render
from django.utils.translation import gettext_lazy as _
from django.shortcuts import redirect
from django.views.decorators.csrf import ensure_csrf_cookie
import json

from apps.ads.models import FAQ
from apps.subscriptions.metadata import get_active_products_with_metadata, PlanInterval
from django.conf import settings


def home(request):
    if request.user.is_authenticated:
        return redirect("ads:discover_page")
    else:
        # Get all active FAQ items for the landing page
        faq_items = FAQ.objects.filter(is_active=True).order_by('order', 'created_at')
        
        # Convert FAQ items to a list of dictionaries for JSON serialization
        faq_data = [{
            'id': item.id,
            'question': item.question,
            'answer': item.answer,
            'order': item.order
        } for item in faq_items]
        
        # Pass the raw FAQ data to the HTML template instead of JSON
        # This allows direct rendering in the template with {{ faq.answer|safe }}
        
        logo_list = [
            "Google", "Microsoft", "Amazon", "Netflix", "YouTube", 
            "Instagram", "Uber", "Spotify"
        ]

        feature_cards = [
            {"icon_name": "clock-9", "title": "Stop wasting valuable time on poor-performing ads", "text": "Use AI-generated copy based on proven conversion patterns to dramatically increase your campaign goals."},
            {"icon_name": "refresh-cw", "title": "Recover from failed campaigns quickly", "text": "Analyze what went wrong and generate new creatives that address performance issues."},
            {"icon_name": "rocket", "title": "Scale your ad production 10x faster", "text": "Create hundreds of professional ads in the time it takes a design team to make one."},
            {"icon_name": "target", "title": "Identify your best results", "text": "Discover which visual styles, layouts, and messaging combinations work best for small business owners."},
            {"icon_name": "maximize", "title": "Dominate any platform with perfect formatting", "text": "Never worry about aspect ratios, text limits, or image specifications again—take your marketing efforts to the next level."},
            {"icon_name": "trending-up", "title": "Improve your digital marketing ROI instantly", "text": "Cut design costs while increasing real results with ads scientifically optimized for performance marketers."}
        ]

        # Simplified pricing data logic for landing page
        products_with_metadata = list(get_active_products_with_metadata())
        product_mapping = {
            'pro': {'display_name': 'Pro'},
            'starter': {'display_name': 'Starter'},
        }

        # Start with a hardcoded Free plan
        tiers = [{
            "name": "Free",
            "description": "Perfect for testing Ad Heist with your first campaigns",
            "price": 0,
            "features": [
                "Search 1M+ Ads Library",
                "Unlimited Ads (Providing Feedback)",
                "20 BrandKits",
                "5 GB of assets"
            ],
        }]

        # Add Starter and Pro from metadata
        for product in products_with_metadata:
            slug = product.metadata.slug
            if slug in product_mapping:
                monthly_price = product._get_price(PlanInterval.month, fail_hard=False)
                price = int(monthly_price.unit_amount / 100) if monthly_price else 'Custom'
                tiers.append({
                    "name": product_mapping[slug]['display_name'],
                    "description": product.metadata.description,
                    "price": price,
                    "features": product.metadata.features,
                })
        
        # Sort the tiers correctly
        tier_order = ["Free", "Starter", "Pro"]
        sorted_tiers = sorted(
            tiers,
            key=lambda x: tier_order.index(x["name"]) if x["name"] in tier_order else 999
        )
        
        pricing_data = {"tiers": sorted_tiers}

        return render(request, "web/landing_page_designed.html", {
            "faq_data": faq_data,
            "logo_list": logo_list,
            "feature_cards": feature_cards,
            "pricing_data": pricing_data,
        })


def simulate_error(request):
    raise Exception("This is a simulated error.")

@ensure_csrf_cookie
def pricing_page(request):
    """
    Render the billing page with pricing information for non-authenticated users.
    """
    if request.user.is_authenticated:
        return redirect("ads:billing_page")
    else:
        from apps.subscriptions.metadata import get_active_products_with_metadata, PlanInterval
        from django.conf import settings
        
        # Get products from the metadata system
        products_with_metadata = list(get_active_products_with_metadata())
        
        # Map product slugs to tier names and CTAs
        product_mapping = {
            'pro': {
                'display_name': 'Pro',
                'cta': 'Upgrade to Pro',
                'highlighted': True,
                'popular': True,
                "is_current_plan": False
            },
            'starter': {
                'display_name': 'Starter',
                'cta': 'Upgrade to Starter',
                'highlighted': False,
                'popular': False,
                "is_current_plan": False
            }
            # Enterprise plan will be added manually
        }
        
        # Check if we're in BETA pricing mode
        is_beta_pricing = settings.PRICING_MODEL == 'BETA'
        
        # Initialize pricing data with Free/Beta plan
        free_plan_name = "Beta" if is_beta_pricing else "Free"
        
        pricing_data = {
            "title": "Pricing Plans",
            "subtitle": "Choose the perfect plan for your needs",
            "frequencies": ["monthly", "yearly"],
            "tiers": [
                {
                    "name": free_plan_name,
                    "description": "Perfect for testing Ad Heist with your first campaigns",
                    "price": {
                        "monthly": 0,
                        "yearly": 0
                    },
                    "features": [
                        "Search 1M+ Ads Library",
                        "Unlimited Ads Generation (Providing Feedback)",
                        "20 BrandKits",
                        "5 GB of assets"
                    ],
                    "cta": "Get Started",
                    "highlighted": False,
                    "popular": False,
                    "is_current_plan": False
                }
            ]
        }
        
        # Add tiers from metadata only if not in BETA pricing mode
        if not is_beta_pricing:
            for product in products_with_metadata:
                slug = product.metadata.slug
                if slug in product_mapping:
                    # Get prices
                    monthly_price = product._get_price(PlanInterval.month, fail_hard=False)
                    yearly_price = product._get_price(PlanInterval.year, fail_hard=False)
                    
                    # Format price display
                    price_data = {}
                    if monthly_price:
                        try:
                            price_data["monthly"] = int(monthly_price.unit_amount / 100)
                        except (TypeError, ValueError):
                            price_data["monthly"] = product.get_price_display(monthly_price)
                    else:
                        price_data["monthly"] = "Custom"
                        
                    if yearly_price:
                        try:
                            price_data["yearly"] = int(yearly_price.unit_amount / 100)
                        except (TypeError, ValueError):
                            price_data["yearly"] = product.get_price_display(yearly_price)
                    else:
                        price_data["yearly"] = "Custom"
                    
                    # Add price IDs to price data
                    if monthly_price:
                        price_data["monthlyPriceId"] = monthly_price.id
                    if yearly_price:
                        price_data["yearlyPriceId"] = yearly_price.id
                        
                    # Create tier data
                    tier = {
                        "name": product_mapping[slug]['display_name'],
                        "description": product.metadata.description or f"For {product_mapping[slug]['display_name']} users",
                        "price": price_data,
                        "features": product.metadata.features,
                        "cta": product_mapping[slug]["cta"],
                        "highlighted": product_mapping[slug]["highlighted"],
                        "popular": product_mapping[slug]["popular"],
                        "is_current_plan": False  # Always false for non-authenticated users
                    }
                    
                    pricing_data["tiers"].append(tier)
            
            # Add Enterprise plan with original values only if not in BETA pricing mode
            enterprise_plan = {
                "name": "Enterprise",
                "description": "For large organizations",
                "price": {
                    "monthly": "Custom",
                    "yearly": "Custom"
                },
                "features": [
                    "Unlimited ad requests",
                    "Custom templates",
                    "Dedicated support",
                    "API access",
                    "Advanced analytics"
                ],
                "cta": "Contact Sales",
                "highlighted": False,
                "popular": False,
                "is_current_plan": False
            }
            pricing_data["tiers"].append(enterprise_plan)
        
        # Sort tiers in the correct order: Free/Beta, Starter, Pro, Enterprise
        tier_order = [free_plan_name, "Starter", "Pro", "Enterprise"]
        pricing_data["tiers"] = sorted(
            pricing_data["tiers"], 
            key=lambda x: tier_order.index(x["name"]) if x["name"] in tier_order else 999
    )
        
    # Convert pricing data to JSON for the React component
    pricing_json = json.dumps(pricing_data)
    print(f"Pricing data: {pricing_json}")
        
    return render(request, 'web/pricing.html', {
        "pricing_data": pricing_json,
        "free_plan_name": free_plan_name,
        "is_beta_pricing": is_beta_pricing
    })


def marketing_pages_index(request):
    """
    Index page showing all marketing pages as cards.
    """
    marketing_pages = [
        {
            "name": "Lawyers",
            "url": "web:lawyers_page",
            "image": "images/marketing-pages/lawyers.png",
            "description": "AI Ad Generator for Law Firms"
        },
        {
            "name": "Luxury",
            "url": "web:luxury_page",
            "image": "images/marketing-pages/luxury.png",
            "description": "AI Ad Generator for Luxury Brands"
        },
        {
            "name": "NGO",
            "url": "web:ngo_page",
            "image": "images/marketing-pages/ngo.png",
            "description": "AI Ad Generator for Non-Profits"
        },
        {
            "name": "Pharmacy",
            "url": "web:pharmacy_page",
            "image": "images/marketing-pages/pharmacy.png",
            "description": "AI Ad Generator for Pharmacies"
        },
        {
            "name": "Real Estate",
            "url": "web:real_estate_page",
            "image": "images/marketing-pages/real-estate.png",
            "description": "AI Ad Generator for Real Estate"
        },
        {
            "name": "Restaurants",
            "url": "web:restaurants_page",
            "image": "images/marketing-pages/restaurants.png",
            "description": "AI Ad Generator for Restaurants"
        },
        {
            "name": "Retailers",
            "url": "web:retailers_page",
            "image": "images/marketing-pages/retailers.png",
            "description": "AI Ad Generator for Retailers"
        },
        {
            "name": "SaaS",
            "url": "web:saas_page",
            "image": "images/marketing-pages/saas.png",
            "description": "AI Ad Generator for SaaS Companies"
        },
        {
            "name": "Plumber",
            "url": "web:plumber_page",
            "image": "images/marketing-pages/plumber.png",
            "description": "AI Ad Generator for Plumbers"
        },
        {
            "name": "Electrician",
            "url": "web:electrician_page",
            "image": "images/marketing-pages/electrician.png",
            "description": "AI Ad Generator for Electricians"
        },
        {
            "name": "HVAC Contractor",
            "url": "web:hvac_contractor_page",
            "image": "images/marketing-pages/hvac-contractor.png",
            "description": "AI Ad Generator for HVAC Contractors"
        },
        {
            "name": "Pest Control",
            "url": "web:pest_control_page",
            "image": "images/marketing-pages/pest-control.png",
            "description": "AI Ad Generator for Pest Control"
        },
        {
            "name": "Landscaper",
            "url": "web:landscaper_page",
            "image": "images/marketing-pages/landscaper.png",
            "description": "AI Ad Generator for Landscapers"
        },
        {
            "name": "Lawn Care",
            "url": "web:lawn_care_page",
            "image": "images/marketing-pages/lawn-care.png",
            "description": "AI Ad Generator for Lawn Care"
        },
        {
            "name": "House Cleaner",
            "url": "web:house_cleaner_page",
            "image": "images/marketing-pages/house-cleaner.png",
            "description": "AI Ad Generator for House Cleaners"
        },
        {
            "name": "Carpet Cleaner",
            "url": "web:carpet_cleaner_page",
            "image": "images/marketing-pages/carpet-cleaner.png",
            "description": "AI Ad Generator for Carpet Cleaners"
        },
        {
            "name": "Painter",
            "url": "web:painter_page",
            "image": "images/marketing-pages/painter.png",
            "description": "AI Ad Generator for Painters"
        },
    ]
    
    return render(request, 'marketing_pages/index.html', {
        "marketing_pages": marketing_pages
    })

