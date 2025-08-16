from django.shortcuts import render
from django.utils.translation import gettext_lazy as _
from django.shortcuts import redirect
from django.views.decorators.csrf import ensure_csrf_cookie
import json

from apps.ads.models import FAQ


def home(request):
    if request.user.is_authenticated:
        return redirect("ads:ads_home")
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
        
        # Convert FAQ data to JSON for the React component
        faq_json = json.dumps(faq_data)
        
        return render(request, "web/landing_page.html", {
            "faq_data": faq_json
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
        
        # Initialize pricing data with Free plan
        pricing_data = {
            "title": "Pricing Plans",
            "subtitle": "Choose the perfect plan for your needs",
            "frequencies": ["monthly", "yearly"],
            "tiers": [
                {
                    "name": "Free",
                    "description": "Basic features for individuals",
                    "price": {
                        "monthly": 0,
                        "yearly": 0
                    },
                    "features": [
                        "3 ad requests per month",
                        "Basic templates",
                        "Standard support"
                    ],
                    "cta": "Get Started",
                    "highlighted": False,
                    "popular": False,
                    "is_current_plan": False
                }
            ]
        }
        
        # Add tiers from metadata
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
        
        # Add Enterprise plan with original values
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
        
        # Sort tiers in the correct order: Free, Starter, Pro, Enterprise
        tier_order = ["Free", "Starter", "Pro", "Enterprise"]
        pricing_data["tiers"] = sorted(
            pricing_data["tiers"], 
            key=lambda x: tier_order.index(x["name"]) if x["name"] in tier_order else 999
    )
        
    # Convert pricing data to JSON for the React component
    pricing_json = json.dumps(pricing_data)
    print(f"Pricing data: {pricing_json}")
        
    return render(request, 'web/pricing.html', {
        "pricing_data": pricing_json
    })

