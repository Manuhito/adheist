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
            "images/landing/brands-icons/hello-fresh-logo.svg",
            "images/landing/brands-icons/true-classic.svg",
            "images/landing/brands-icons/huel.svg",
            "images/landing/brands-icons/ag1-logo.svg",
            "images/landing/brands-icons/logo-clickup.svg",
            "images/landing/brands-icons/monday.svg",
            "images/landing/brands-icons/calm.svg",
            "images/landing/brands-icons/lululemon.svg",
            "images/landing/brands-icons/magicspoon.svg",
            "images/landing/brands-icons/gymshark.svg",
            "images/landing/brands-icons/canva.svg",
            "images/landing/brands-icons/the-ridge.svg",
        ]

        feature_cards = [
            {"icon_name": "badge-dollar-sign", "title": "Stop wasting money on ads that don’t convert", "text": "Generate AI ads built on proven patterns designed to attract clicks and customers."},
            {"icon_name": "wallet", "title": "Grow your marketing without growing your costs", "text": "Skip expensive agencies and freelancers while improving your return on ad spend."},
            {"icon_name": "refresh-cw", "title": "Fix underperforming campaigns fast", "text": "If an ad isn’t working, create improved versions instantly with stronger messaging and better angles."},
            {"icon_name": "rocket", "title": "Create more ads in less time", "text": "Launch dozens — even hundreds — of professional creatives in minutes."},
            {"icon_name": "line-chart", "title": "See what actually drives results", "text": "Find out which headlines, visuals, and offers perform best for businesses like yours."},
            {"icon_name": "maximize", "title": "Launch anywhere without the technical hassle", "text": "Every ad is automatically sized and formatted for each platform."}
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
            "image_filename": "lawyers.webp",
            "description": "AI Ad Generator for Law Firms"
        },
        {
            "name": "Luxury",
            "url": "web:luxury_page",
            "image_filename": "luxury.webp",
            "description": "AI Ad Generator for Luxury Brands"
        },
        {
            "name": "NGO",
            "url": "web:ngo_page",
            "image_filename": "ngo.webp",
            "description": "AI Ad Generator for Non-Profits"
        },
        {
            "name": "Pharmacy",
            "url": "web:pharmacy_page",
            "image_filename": "pharmacy.webp",
            "description": "AI Ad Generator for Pharmacies"
        },
        {
            "name": "Real Estate",
            "url": "web:real_estate_page",
            "image_filename": "real-estate.webp",
            "description": "AI Ad Generator for Real Estate"
        },
        {
            "name": "Restaurants",
            "url": "web:restaurants_page",
            "image_filename": "restaurants.webp",
            "description": "AI Ad Generator for Restaurants"
        },
        {
            "name": "Retailers",
            "url": "web:retailers_page",
            "image_filename": "retailers.webp",
            "description": "AI Ad Generator for Retailers"
        },
        {
            "name": "SaaS",
            "url": "web:saas_page",
            "image_filename": "saas.webp",
            "description": "AI Ad Generator for SaaS Companies"
        },
        {
            "name": "Plumber",
            "url": "web:plumber_page",
            "image_filename": "plumber.webp",
            "description": "AI Ad Generator for Plumbers"
        },
        {
            "name": "Electrician",
            "url": "web:electrician_page",
            "image_filename": "electrician.webp",
            "description": "AI Ad Generator for Electricians"
        },
        {
            "name": "HVAC Contractor",
            "url": "web:hvac_contractor_page",
            "image_filename": "hvac-contractor.webp",
            "description": "AI Ad Generator for HVAC Contractors"
        },
        {
            "name": "Pest Control",
            "url": "web:pest_control_page",
            "image_filename": "pest-control.webp",
            "description": "AI Ad Generator for Pest Control"
        },
        {
            "name": "Landscaper",
            "url": "web:landscaper_page",
            "image_filename": "landscaper.webp",
            "description": "AI Ad Generator for Landscapers"
        },
        {
            "name": "Lawn Care",
            "url": "web:lawn_care_page",
            "image_filename": "lawn-care.webp",
            "description": "AI Ad Generator for Lawn Care"
        },
        {
            "name": "House Cleaner",
            "url": "web:house_cleaner_page",
            "image_filename": "house-cleaner.webp",
            "description": "AI Ad Generator for House Cleaners"
        },
        {
            "name": "Carpet Cleaner",
            "url": "web:carpet_cleaner_page",
            "image_filename": "carpet-cleaner.webp",
            "description": "AI Ad Generator for Carpet Cleaners"
        },
        {
            "name": "Painter",
            "url": "web:painter_page",
            "image_filename": "painter.webp",
            "description": "AI Ad Generator for Painters"
        },
        {
            "name": "Roofer",
            "url": "web:roofer_page",
            "image_filename": "roofer.webp",
            "description": "AI Ad Generator for Roofers"
        },
        {
            "name": "General Contractor",
            "url": "web:general_contractor_page",
            "image_filename": "general-contractor.webp",
            "description": "AI Ad Generator for General Contractors"
        },
        {
            "name": "Handyman",
            "url": "web:handyman_page",
            "image_filename": "handyman.webp",
            "description": "AI Ad Generator for Handyman Services"
        },
        {
            "name": "Pool Service",
            "url": "web:pool_service_page",
            "image_filename": "pool-service.webp",
            "description": "AI Ad Generator for Pool Service Companies"
        },
        {
            "name": "Window Cleaner",
            "url": "web:window_cleaner_page",
            "image_filename": "window-cleaner.webp",
            "description": "AI Ad Generator for Window Cleaning Services"
        },
        {
            "name": "Pressure Washing",
            "url": "web:pressure_washing_page",
            "image_filename": "pressure-washing.webp",
            "description": "AI Ad Generator for Pressure Washing Services"
        },
        {
            "name": "Tree Service",
            "url": "web:tree_service_page",
            "image_filename": "tree-service.webp",
            "description": "AI Ad Generator for Tree Service Companies"
        },
        {
            "name": "Locksmith",
            "url": "web:locksmith_page",
            "image_filename": "locksmith.webp",
            "description": "AI Ad Generator for Locksmith Services"
        },
        {
            "name": "Home Inspector",
            "url": "web:home_inspector_page",
            "image_filename": "home-inspector.webp",
            "description": "AI Ad Generator for Home Inspectors"
        },
        {
            "name": "Garage Door Repair",
            "url": "web:garage_door_repair_page",
            "image_filename": "garage-door-repair.webp",
            "description": "AI Ad Generator for Garage Door Repair Services"
        },
        {
            "name": "Appliance Repair",
            "url": "web:appliance_repair_page",
            "image_filename": "appliance-repair.webp",
            "description": "AI Ad Generator for Appliance Repair Services"
        },
        {
            "name": "Flooring Contractor",
            "url": "web:flooring_contractor_page",
            "image_filename": "flooring-contractor.webp",
            "description": "AI Ad Generator for Flooring Contractors"
        },
        {
            "name": "Chiropractor",
            "url": "web:chiropractor_page",
            "image_filename": "chiropractor.webp",
            "description": "AI Ad Generator for Chiropractors"
        },
        {
            "name": "Massage Therapist",
            "url": "web:massage_therapist_page",
            "image_filename": "massage-therapist.webp",
            "description": "AI Ad Generator for Massage Therapists"
        },
        {
            "name": "Dentist",
            "url": "web:dentist_page",
            "image_filename": "dentist.webp",
            "description": "AI Ad Generator for Dentists"
        },
        {
            "name": "Optometrist",
            "url": "web:optometrist_page",
            "image_filename": "optometrist.webp",
            "description": "AI Ad Generator for Optometrists"
        },
        {
            "name": "Physical Therapist",
            "url": "web:physical_therapist_page",
            "image_filename": "physical-therapist.webp",
            "description": "AI Ad Generator for Physical Therapists"
        },
        {
            "name": "Acupuncturist",
            "url": "web:acupuncturist_page",
            "image_filename": "acupuncturist.webp",
            "description": "AI Ad Generator for Acupuncturists"
        },
        {
            "name": "Mental Health Therapist",
            "url": "web:mental_health_therapist_page",
            "image_filename": "mental-health-therapist.webp",
            "description": "AI Ad Generator for Mental Health Therapists"
        },
        {
            "name": "Dermatologist",
            "url": "web:dermatologist_page",
            "image_filename": "dermatologist.webp",
            "description": "AI Ad Generator for Dermatologists"
        },
        {
            "name": "Veterinarian",
            "url": "web:veterinarian_page",
            "image_filename": "veterinarian.webp",
            "description": "AI Ad Generator for Veterinarians"
        },
        {
            "name": "Medical Clinic",
            "url": "web:medical_clinic_page",
            "image_filename": "medical-clinic.webp",
            "description": "AI Ad Generator for Medical Clinics"
        },
        {
            "name": "Urgent Care Center",
            "url": "web:urgent_care_center_page",
            "image_filename": "urgent-care-center.webp",
            "description": "AI Ad Generator for Urgent Care Centers"
        },
        {
            "name": "Personal Trainer",
            "url": "web:personal_trainer_page",
            "image_filename": "personal-trainer.webp",
            "description": "AI Ad Generator for Personal Trainers"
        },
        {
            "name": "Nutritionist",
            "url": "web:nutritionist_page",
            "image_filename": "nutritionist.webp",
            "description": "AI Ad Generator for Nutritionists"
        },
        {
            "name": "Yoga Studio",
            "url": "web:yoga_studio_page",
            "image_filename": "yoga-studio.webp",
            "description": "AI Ad Generator for Yoga Studios"
        },
        {
            "name": "Pilates Studio",
            "url": "web:pilates_studio_page",
            "image_filename": "pilates-studio.webp",
            "description": "AI Ad Generator for Pilates Studios"
        },
        {
            "name": "Martial Arts Studio",
            "url": "web:martial_arts_studio_page",
            "image_filename": "martial-arts-studio.webp",
            "description": "AI Ad Generator for Martial Arts Studios"
        },
        {
            "name": "Dance Studio",
            "url": "web:dance_studio_page",
            "image_filename": "dance-studio.webp",
            "description": "AI Ad Generator for Dance Studios"
        },
        {
            "name": "Gym",
            "url": "web:gym_page",
            "image_filename": "gym.webp",
            "description": "AI Ad Generator for Gyms"
        },
        {
            "name": "Fitness Center",
            "url": "web:fitness_center_page",
            "image_filename": "fitness-center.webp",
            "description": "AI Ad Generator for Fitness Centers"
        },
        {
            "name": "CrossFit Box",
            "url": "web:crossfit_box_page",
            "image_filename": "crossfit-box.webp",
            "description": "AI Ad Generator for CrossFit Boxes"
        },
        {
            "name": "Restaurant",
            "url": "web:restaurant_page",
            "image_filename": "restaurant.webp",
            "description": "AI Ad Generator for Restaurants"
        },
        {
            "name": "Cafe",
            "url": "web:cafe_page",
            "image_filename": "cafe.webp",
            "description": "AI Ad Generator for Cafes"
        },
        {
            "name": "Bakery",
            "url": "web:bakery_page",
            "image_filename": "bakery.webp",
            "description": "AI Ad Generator for Bakeries"
        },
        {
            "name": "Food Truck",
            "url": "web:food_truck_page",
            "image_filename": "food-truck.webp",
            "description": "AI Ad Generator for Food Trucks"
        },
        {
            "name": "Bar",
            "url": "web:bar_page",
            "image_filename": "bar.webp",
            "description": "AI Ad Generator for Bars"
        },
        {
            "name": "Pub",
            "url": "web:pub_page",
            "image_filename": "pub.webp",
            "description": "AI Ad Generator for Pubs"
        },
        {
            "name": "Ice Cream Shop",
            "url": "web:ice_cream_shop_page",
            "image_filename": "ice-cream-shop.webp",
            "description": "AI Ad Generator for Ice Cream Shops"
        },
        {
            "name": "Pizza Shop",
            "url": "web:pizza_shop_page",
            "image_filename": "pizza-shop.webp",
            "description": "AI Ad Generator for Pizza Shops"
        },
        {
            "name": "Catering Service",
            "url": "web:catering_service_page",
            "image_filename": "catering-service.webp",
            "description": "AI Ad Generator for Catering Services"
        },
        {
            "name": "Juice Bar",
            "url": "web:juice_bar_page",
            "image_filename": "juice-bar.webp",
            "description": "AI Ad Generator for Juice Bars"
        },
        {
            "name": "Smoothie Shop",
            "url": "web:smoothie_shop_page",
            "image_filename": "smoothie-shop.webp",
            "description": "AI Ad Generator for Smoothie Shops"
        },
        {
            "name": "Brewery",
            "url": "web:brewery_page",
            "image_filename": "brewery.webp",
            "description": "AI Ad Generator for Breweries"
        },
        {
            "name": "Wine Shop",
            "url": "web:wine_shop_page",
            "image_filename": "wine-shop.webp",
            "description": "AI Ad Generator for Wine Shops"
        },
        {
            "name": "Coffee Roaster",
            "url": "web:coffee_roaster_page",
            "image_filename": "coffee-roaster.webp",
            "description": "AI Ad Generator for Coffee Roasters"
        },
        {
            "name": "Tea Shop",
            "url": "web:tea_shop_page",
            "image_filename": "tea-shop.webp",
            "description": "AI Ad Generator for Tea Shops"
        },
        {
            "name": "Donut Shop",
            "url": "web:donut_shop_page",
            "image_filename": "donut-shop.webp",
            "description": "AI Ad Generator for Donut Shops"
        },
        {
            "name": "Bagel Shop",
            "url": "web:bagel_shop_page",
            "image_filename": "bagel-shop.webp",
            "description": "AI Ad Generator for Bagel Shops"
        },
        {
            "name": "Sandwich Shop",
            "url": "web:sandwich_shop_page",
            "image_filename": "sandwich-shop.webp",
            "description": "AI Ad Generator for Sandwich Shops"
        },
        {
            "name": "Deli",
            "url": "web:deli_page",
            "image_filename": "deli.webp",
            "description": "AI Ad Generator for Delis"
        },
        {
            "name": "BBQ Restaurant",
            "url": "web:bbq_restaurant_page",
            "image_filename": "bbq-restaurant.webp",
            "description": "AI Ad Generator for BBQ Restaurants"
        },
        {
            "name": "Sushi Bar",
            "url": "web:sushi_bar_page",
            "image_filename": "sushi-bar.webp",
            "description": "AI Ad Generator for Sushi Bars"
        },
        {
            "name": "Food Delivery Service",
            "url": "web:food_delivery_service_page",
            "image_filename": "food-delivery-service.webp",
            "description": "AI Ad Generator for Food Delivery Services"
        },
        {
            "name": "Hair Salon",
            "url": "web:hair_salon_page",
            "image_filename": "hair-salon.webp",
            "description": "AI Ad Generator for Hair Salons"
        },
        {
            "name": "Barbershop",
            "url": "web:barbershop_page",
            "image_filename": "barbershop.webp",
            "description": "AI Ad Generator for Barbershops"
        },
        {
            "name": "Nail Salon",
            "url": "web:nail_salon_page",
            "image_filename": "nail-salon.webp",
            "description": "AI Ad Generator for Nail Salons"
        },
        {
            "name": "Spa",
            "url": "web:spa_page",
            "image_filename": "spa.webp",
            "description": "AI Ad Generator for Spas"
        },
        {
            "name": "Med Spa",
            "url": "web:med_spa_page",
            "image_filename": "med-spa.webp",
            "description": "AI Ad Generator for Med Spas"
        },
        {
            "name": "Tanning Salon",
            "url": "web:tanning_salon_page",
            "image_filename": "tanning-salon.webp",
            "description": "AI Ad Generator for Tanning Salons"
        },
        {
            "name": "Makeup Artist",
            "url": "web:makeup_artist_page",
            "image_filename": "makeup-artist.webp",
            "description": "AI Ad Generator for Makeup Artists"
        },
        {
            "name": "Esthetician",
            "url": "web:esthetician_page",
            "image_filename": "esthetician.webp",
            "description": "AI Ad Generator for Estheticians"
        },
        {
            "name": "Tattoo Parlor",
            "url": "web:tattoo_parlor_page",
            "image_filename": "tattoo-parlor.webp",
            "description": "AI Ad Generator for Tattoo Parlors"
        },
        {
            "name": "Piercing Studio",
            "url": "web:piercing_studio_page",
            "image_filename": "piercing-studio.webp",
            "description": "AI Ad Generator for Piercing Studios"
        },
        {
            "name": "Lash Extension",
            "url": "web:lash_extension_page",
            "image_filename": "lash-extension.webp",
            "description": "AI Ad Generator for Lash Extensions"
        },
        {
            "name": "Brow Bar",
            "url": "web:brow_bar_page",
            "image_filename": "brow-bar.webp",
            "description": "AI Ad Generator for Brow Bars"
        },
        {
            "name": "Waxing Salon",
            "url": "web:waxing_salon_page",
            "image_filename": "waxing-salon.webp",
            "description": "AI Ad Generator for Waxing Salons"
        },
        {
            "name": "Blow Dry Bar",
            "url": "web:blow_dry_bar_page",
            "image_filename": "blow-dry-bar.webp",
            "description": "AI Ad Generator for Blow Dry Bars"
        },
        {
            "name": "Auto Repair Shop",
            "url": "web:auto_repair_shop_page",
            "image_filename": "auto-repair-shop.webp",
            "description": "AI Ad Generator for Auto Repair Shops"
        },
        {
            "name": "Car Dealership",
            "url": "web:car_dealership_page",
            "image_filename": "car-dealership.webp",
            "description": "AI Ad Generator for Car Dealerships"
        },
        {
            "name": "Auto Detailing",
            "url": "web:auto_detailing_page",
            "image_filename": "auto-detailing.webp",
            "description": "AI Ad Generator for Auto Detailing"
        },
        {
            "name": "Tire Shop",
            "url": "web:tire_shop_page",
            "image_filename": "tire-shop.webp",
            "description": "AI Ad Generator for Tire Shops"
        },
        {
            "name": "Auto Body Shop",
            "url": "web:auto_body_shop_page",
            "image_filename": "auto-body-shop.webp",
            "description": "AI Ad Generator for Auto Body Shops"
        },
        {
            "name": "Oil Change Service",
            "url": "web:oil_change_service_page",
            "image_filename": "oil-change-service.webp",
            "description": "AI Ad Generator for Oil Change Services"
        },
        {
            "name": "Car Wash",
            "url": "web:car_wash_page",
            "image_filename": "car-wash.webp",
            "description": "AI Ad Generator for Car Washes"
        },
        {
            "name": "Towing",
            "url": "web:towing_page",
            "image_filename": "towing.webp",
            "description": "AI Ad Generator for Towing Services"
        },
        {
            "name": "Auto Glass Repair",
            "url": "web:auto_glass_repair_page",
            "image_filename": "auto-glass-repair.webp",
            "description": "AI Ad Generator for Auto Glass Repair Shops"
        },
        {
            "name": "Transmission Shop",
            "url": "web:transmission_shop_page",
            "image_filename": "transmission-shop.webp",
            "description": "AI Ad Generator for Transmission Shops"
        },
        {
            "name": "Muffler Shop",
            "url": "web:muffler_shop_page",
            "image_filename": "muffler-shop.webp",
            "description": "AI Ad Generator for Muffler Shops"
        },
    ]
    
    return render(request, 'marketing_pages/index.html', {
        "marketing_pages": marketing_pages
    })


def facebook_ads_calculator(request):
    """
    Render the Facebook Ads Cost Calculator page.
    """
    # Get all active FAQ items
    faq_items = FAQ.objects.filter(is_active=True).order_by('order', 'created_at')
    
    faq_data = [{
        'id': item.id,
        'question': item.question,
        'answer': item.answer,
        'order': item.order
    } for item in faq_items]
    
    logo_list = [
        "images/landing/brands-icons/hello-fresh-logo.svg",
        "images/landing/brands-icons/true-classic.svg",
        "images/landing/brands-icons/huel.svg",
        "images/landing/brands-icons/ag1-logo.svg",
        "images/landing/brands-icons/logo-clickup.svg",
        "images/landing/brands-icons/monday.svg",
        "images/landing/brands-icons/calm.svg",
        "images/landing/brands-icons/lululemon.svg",
        "images/landing/brands-icons/magicspoon.svg",
        "images/landing/brands-icons/gymshark.svg",
        "images/landing/brands-icons/canva.svg",
        "images/landing/brands-icons/the-ridge.svg",
    ]

    feature_cards = [
        {"icon_name": "clock-9", "title": "Stop wasting valuable time on poor-performing ads", "text": "Use AI-generated copy based on proven conversion patterns to dramatically increase your campaign goals."},
        {"icon_name": "refresh-cw", "title": "Recover from failed campaigns quickly", "text": "Analyze what went wrong and generate new creatives that address performance issues."},
        {"icon_name": "rocket", "title": "Scale your ad production 10x faster", "text": "Create hundreds of professional ads in the time it takes a design team to make one."},
        {"icon_name": "target", "title": "Identify your best results", "text": "Discover which visual styles, layouts, and messaging combinations work best for small business owners."},
        {"icon_name": "maximize", "title": "Dominate any platform with perfect formatting", "text": "Never worry about aspect ratios, text limits, or image specifications again—take your marketing efforts to the next level."},
        {"icon_name": "trending-up", "title": "Improve your digital marketing ROI instantly", "text": "Cut design costs while increasing real results with ads scientifically optimized for performance marketers."}
    ]

    # Simplified pricing data
    products_with_metadata = list(get_active_products_with_metadata())
    product_mapping = {
        'pro': {'display_name': 'Pro'},
        'starter': {'display_name': 'Starter'},
    }

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
    
    tier_order = ["Free", "Starter", "Pro"]
    sorted_tiers = sorted(
        tiers,
        key=lambda x: tier_order.index(x["name"]) if x["name"] in tier_order else 999
    )
    
    pricing_data = {"tiers": sorted_tiers}

    return render(request, "calculators/facebook_ads_calculator.html", {
        "faq_data": faq_data,
        "logo_list": logo_list,
        "feature_cards": feature_cards,
        "pricing_data": pricing_data,
    })


def facebook_ad_budget_calculator(request):
    """
    Render the Facebook Ad Budget Calculator page.
    """
    logo_list = [
        "images/landing/brands-icons/hello-fresh-logo.svg",
        "images/landing/brands-icons/true-classic.svg",
        "images/landing/brands-icons/huel.svg",
        "images/landing/brands-icons/ag1-logo.svg",
        "images/landing/brands-icons/logo-clickup.svg",
        "images/landing/brands-icons/monday.svg",
        "images/landing/brands-icons/calm.svg",
        "images/landing/brands-icons/lululemon.svg",
        "images/landing/brands-icons/magicspoon.svg",
        "images/landing/brands-icons/gymshark.svg",
        "images/landing/brands-icons/canva.svg",
        "images/landing/brands-icons/the-ridge.svg",
    ]

    return render(request, "calculators/facebook_ad_budget_calculator.html", {
        "logo_list": logo_list,
    })

