from copy import copy

from django.conf import settings
from django.utils.translation import gettext as _

from .meta import absolute_url, get_server_root


def project_meta(request):
    # modify these values as needed and add whatever else you want globally available here
    project_data = copy(settings.PROJECT_METADATA)
    # Don't combine name and description in the title
    project_data["TITLE"] = project_data["NAME"]
    return {
        "project_meta": project_data,
        "server_url": get_server_root(),
        "page_url": absolute_url(request.path),
        "page_title": "",
        "page_description": "",
        "page_image": "",
        "light_theme": settings.LIGHT_THEME,
        "dark_theme": settings.DARK_THEME,
        "current_theme": request.COOKIES.get("theme", ""),
        "dark_mode": request.COOKIES.get("theme", "") == settings.DARK_THEME,
        # put any settings you want made available to all templates here
        # then reference them as {{ project_settings.MY_VALUE }} in templates
        "project_settings": {
            "ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE": settings.ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE,
        },
        "turnstile_key": getattr(settings, "TURNSTILE_KEY", None),
        "use_i18n": getattr(settings, "USE_I18N", False) and len(getattr(settings, "LANGUAGES", [])) > 1,
    }


def google_analytics_id(request):
    """
    Adds google analytics id to all requests
    """
    if settings.GOOGLE_ANALYTICS_ID:
        return {
            "GOOGLE_ANALYTICS_ID": settings.GOOGLE_ANALYTICS_ID,
        }
    else:
        return {}


def posthog_settings(request):
    """Make PostHog settings available to all templates."""
    return {
        'settings': {
            'POSTHOG_KEY': settings.POSTHOG_KEY,
            'POSTHOG_HOST': settings.POSTHOG_HOST,
        }
    }


def translations(request):
    """
    Adds common translations to the context for use in templates and JavaScript.
    Makes translations available to React components via window.__TRANSLATIONS__ object.
    """
    return {
        'translations_json': {
            # Common UI elements
            'login': _('Login'),
            'logout': _('Log out'),
            'profile': _('Profile'),
            'billing': _('Billing'),
            'theme': _('Theme'),
            'upgrade': _('Upgrade'),
            'blog': _('Blog'),
            
            # Language names for the switcher
            'english': _('English'),
            'french': _('French'),
            'spanish': _('Spanish'),
            'language': _('Language'),
            'language_switcher': _('Change language'),
            
            # Login page translations
            'seconds_to_signup': _('Seconds to Sign up'),
            'get_free_backlinks': _('Get 5 Free Backlinks'),
            'sign_in': _('Sign In'),
            'mail_signin_code': _('Mail me a sign-in code'),
            
            # Signup page translations
            'create_account': _('Create your account'),
            'sign_up': _('Sign Up'),
            'already_have_account': _('Already have account?'),
            'go_to_sign_in': _('Go to sign in.'),
            
            # Blog page translations
            'articles': _('Articles'),
            'latest_news': _('Latest news and updates from'),
            
            # Blog post translations
            'today': _('Today'),
            'days_ago': _('d ago'),
            'weeks_ago': _('w ago'),
            'months_ago': _('mo ago'),
            'years_ago': _('y ago'),
            
            # Header translations
            'login': _('Login'),
            'get_started_free': _('Get Started for Free'),
            
            # Footer translations
            'copyright': _('Copyright ©'),
            'privacy_policy': _('Privacy Policy'),
            'terms_of_service': _('Terms of Service'),
            
            # Menu translations
            'menu.features': _('Features'),
            'menu.solutions': _('Solutions'),
            'menu.pricing': _('Pricing'),
            'menu.blog': _('Blog'),
            'menu.ai_powered_automation': _('AI-Powered Automation'),
            'menu.task_automation': _('Task Automation'),
            'menu.workflow_optimization': _('Workflow Optimization'),
            'menu.intelligent_scheduling': _('Intelligent Scheduling'),
            
            # Pricing page translations
            'pricing.title': _('Pricing Plans'),
            'pricing.subtitle': _('Choose the perfect plan for your needs'),
            'pricing.monthly': _('monthly'),
            'pricing.yearly': _('yearly'),
            'pricing.free': _('Beta'),
            'pricing.starter': _('Starter'),
            'pricing.pro': _('Pro'),
            'pricing.team': _('Team'),
            'pricing.enterprise': _('Enterprise'),
            'pricing.free_description': _('Basic features for individuals'),
            'pricing.pro_description': _('Advanced features for professionals'),
            'pricing.team_description': _('For teams and businesses'),
            'pricing.enterprise_description': _('For large organizations'),
            'pricing.feature_free_1': _('Search 1M+ Ads Library'),
            'pricing.feature_free_2': _('Unlimited Ads (With Feedback)'),
            'pricing.feature_free_3': _('Unlimited Revisions (With Feedback)'),
            'pricing.feature_free_4': _('20 BrandKits'),
            'pricing.feature_free_5': _('5 GB of assets'),
            'pricing.feature_pro_1': _('Search 1M+ Ads Library'),
            'pricing.feature_pro_2': _('50 Ads Creations'),
            'pricing.feature_pro_3': _('50 Ad Revisions'),
            'pricing.feature_pro_4': _('20 BrandKits'),
            'pricing.feature_pro_5': _('10 GB of assets'),
            'pricing.feature_team_1': _('50 ad requests per month'),
            'pricing.feature_team_2': _('All premium templates'),
            'pricing.feature_team_3': _('24/7 support'),
            'pricing.feature_team_4': _('Custom branding'),
            'pricing.feature_team_5': _('Team collaboration'),
            'pricing.feature_enterprise_1': _('Unlimited ad requests'),
            'pricing.feature_enterprise_2': _('Custom templates'),
            'pricing.feature_enterprise_3': _('Dedicated support'),
            'pricing.feature_enterprise_4': _('API access'),
            'pricing.feature_enterprise_5': _('Advanced analytics'),
            'pricing.get_started': _('Get Started'),
            'pricing.upgrade_to_starter': _('Upgrade to Starter'),
            'pricing.upgrade_to_pro': _('Upgrade to Pro'),
            'pricing.upgrade_to_team': _('Upgrade to Team'),
            'pricing.contact_sales': _('Contact Sales'),
            'pricing.custom': _('Custom'),
            'pricing.current_plan': _('Current Plan'),
            'pricing.most_popular': _('🔥 Most Popular'),
            'pricing.per_month': _('Per month'),
            'pricing.monthly': _('Monthly'),
            'pricing.upgrade_to_plan': _('Upgrade to this plan'),
            'pricing.downgrade_to_plan': _('Downgrade to this plan'),
            'pricing.yearly': _('Yearly'),
            
            # Billing page translations
            'billing.error_creating_payment_intent': _('Error creating payment intent: '),
            'billing.unknown_error': _('Unknown error'),
            'billing.network_error': _('Network error'),
            'billing.has_active_subscription': _('Has active subscription:'),
            'billing.additional_credits': _('Additional Credits'),
            'billing.ads_generation': _('Ads Generation'),
            'billing.revisions': _('Revisions'),
            'billing.general_credits': _('General credits'),
            'billing.version_credits': _('Version credits'),
            'billing.packages_and_additional_usage': _('Packages and Additional usage'),
            'pricing.package_1': _('Package 1'),
            'pricing.package_1_description': _('Basic usage package'),
            'pricing.feature_package_1_1': _('Search 1M+ Ads Library'),
            'pricing.feature_package_1_2': _('40 Ads Creations'),
            'pricing.feature_package_1_3': _('40 Ad Revisions'),
            'pricing.package_2': _('Package 2'),
            'pricing.package_2_description': _('Advanced usage package'),
            'pricing.feature_package_2_1': _('Search 1M+ Ads Library'),
            'pricing.feature_package_2_2': _('100 Ads Creations'),
            'pricing.feature_package_2_3': _('100 Ad Revisions'),
            'pricing.buy_package': _('Buy Package'),

            # Subscription update confirmation translations
            'subscription.update_confirmation_title': _('Confirm Subscription Update'),
            'subscription.current_plan': _('Current Plan'),
            'subscription.new_plan': _('New Plan'),
            'subscription.confirm_update': _('Confirm Update'),
            'subscription.cancel': _('Cancel'),
            'subscription.new_billing_period': _('Your subscription will be updated immediately and a new billing period will begin today.'),
            'subscription.credit_transfer': _('Any remaining credits from your current plan will be transferred to your new subscription.'),
            'subscription.immediate_change': _('This change will take effect immediately upon confirmation.'),

            # Subscription cancel section translations
            'subscription.cancel_title': _('Cancel Subscription'),
            'subscription.cancel_description': _('Your subscription will remain active until'),
            'subscription.manage_subscription': _('Manage Subscription'),

            # Usage based packages translations
            'pricing.usage_packages': _('Usage Based Packages'),
            'pricing.starter_description': _('Essential features for small businesses'),

            # Payment page translations (from payment.js/payment-page)
            'payment.no_data': _('No payment data found. Redirecting to billing page...'),
            'payment.invalid_data': _('Invalid payment data. Missing required fields.'),
            'payment.failed_load': _('Failed to load payment data. Please try again.'),
            'payment.error_label': _('Error:'),
            'payment.complete_your_payment': _('Complete Your Payment'),

            # Payment form translations (from payment-form.jsx)
            'payment_form.failed_load': _('Failed to load payment form. Please try again.'),
            'payment_form.unexpected_error': _('An unexpected error occurred.'),
            'payment_form.unexpected_error_try_again': _('An unexpected error occurred. Please try again.'),
            'payment_form.amount': _('Amount:'),
            'payment_form.details': _('Payment details'),
            'payment_form.processing': _('Processing...'),
            'payment_form.pay_now': _('Pay now'),
            
            # Invoice section translations
            'invoice.history_title': _('Invoice History'),
            'invoice.history_description': _('Download your Stripe invoices for your financial records'),
            'invoice.not_available': _('N/A'),
            'invoice.unable_to_load': _('Unable to load invoices. Please try again later.'),
            'invoice.retry': _('Retry'),
            'invoice.no_invoices': _('No invoices available.'),
            'invoice.column_number': _('Number'),
            'invoice.column_date': _('Date'),
            'invoice.column_total': _('Total'),
            'invoice.column_status': _('Status'),
            'invoice.column_actions': _('Actions'),
            'invoice.download': _('Download'),
            'invoice.refresh': _('Refresh'),
            'invoice.status_paid': _('Paid'),
            'invoice.status_pending': _('Pending'),
            'invoice.status_void': _('Void'),
            'invoice.status_draft': _('Draft'),
            
            # App header translations
            'app_header.blog': _('Blog'),
            'app_header.upgrade': _('Upgrade'),
            'app_header.profile': _('Profile'),
            'app_header.billing': _('Billing'),
            'app_header.theme': _('Theme'),
            'app_header.logout': _('Log out'),
            'app_header.login': _('Login'),
            
            # Ad requests translations
            'ad_requests.no_library': _('No library'),
            'ad_requests.industries': _('Industries'),
            'ad_requests.no_industries': _('No associated industries'),
            'ad_requests.view_details': _('View details'),
            'ad_requests.wait_processing': _('Your image is being generated and may take a few minutes to be available.'),
            'ad_requests.error_creating': _('Error creating ad request. Please try again.'),
            'ad_requests.success_message': _('Your ad request has been processed successfully! Your ad is being generated and may take a few minutes to be available.'),
            'ad_requests.create_new': _('Create New Ad Request'),
            
            # Profile page translations
            'profile.error_no_data': _('Error: Profile data not available'),
            'profile.uploading': _('Uploading...'),
            'profile.image_success': _('Image uploaded successfully!'),
            'profile.image_error': _('Error uploading image. Please try again.'),
            'profile.change_picture': _('Change Picture'),
            'profile.my_details': _('My Details'),
            'profile.email': _('Email'),
            'profile.manage_emails': _('Manage email addresses'),
            'profile.first_name': _('First Name'),
            'profile.last_name': _('Last Name'),
            'profile.language': _('Language'),
            'profile.time_zone': _('Time Zone'),
            'profile.current_timezone': _('Your current timezone is {timezone}, where it is {now}.'),
            'profile.no_timezone': _('You have not set a timezone, and are using the system timezone of {currentTz} where it is {now}.'),
            'profile.saving': _('Saving...'),
            'profile.save': _('Save'),
            
            # Two-factor auth translations
            'profile.two_factor': _('Two-Factor Auth'),
            'profile.2fa_enabled': _('You already have two-factor authentication enabled.'),
            'profile.configure': _('Configure'),
            'profile.2fa_disabled': _('You do not have two-factor authentication enabled.'),
            'profile.enable': _('Enable'),
            'profile.verify_email_for_2fa': _('To set up two-factor authentication you must first verify your email address.'),
            'profile.verify': _('Verify'),
            
            # Social accounts translations
            'profile.connected_accounts': _('Connected Accounts'),
            'profile.no_social_accounts': _('You haven\'t linked any social accounts yet. Create one below.'),
            'profile.manage_accounts': _('Manage Accounts'),
            'profile.add_password': _('Add a Password'),
            
            # Create Ad Request translations
            'create_adrequest.title': _('Create Ad Request'),
            'create_adrequest.delete_title': _('Delete Ad Request'),
            'create_adrequest.delete_confirm': _('Are you sure you want to permanently delete this ad request? This action cannot be undone.'),
            'create_adrequest.cancel': _('Cancel'),
            'create_adrequest.delete': _('Delete'),
            'create_adrequest.step1': _('Select Ad Style'),
            'create_adrequest.step2': _('Configure Ad'),
            'create_adrequest.step3': _('Review & Submit'),
            'create_adrequest.no_id': _('No ad request ID available'),
            'create_adrequest.delete_failed': _('Failed to delete ad request'),
            
            # StepOneComponent translations
            'step_one.validation_error': _('Please select both an ad style and canvas size'),
            'step_one.update_failed': _('Failed to update ad request'),
            'step_one.create_failed': _('Failed to create ad request'),
            'step_one.unexpected_error': _('An unexpected error occurred'),
            'step_one.company': _('Company'),
            'step_one.clear_filters': _('Clear filters'),
            'step_one.gallery_title': _('Select Your Ideal Ad Style'),
            'step_one.gallery_description_part1': _("Didn't find your favourite company?"),
            'step_one.gallery_description_part2': _("Request a new brand"),
            
            # Request brand modal translations
            'request_brand.title': _('Add a new brand to our library'),
            'request_brand.description': _('We will put this new brand on our library'),
            'request_brand.url_label': _('Brand URL'),
            'request_brand.help_title': _('How to get the URL?'),
            'request_brand.help_step1': _('Go to Meta ad library and search for the brand / advertiser.'),
            'request_brand.help_step2': _('Click on the brand in the search dropdown and copy the URL and paste it above.'),
            'request_brand.submit': _('Submit request'),
            
            'step_one.select_canvas': _('Select a canvas size to proceed'),
            'step_one.square': _('Square'),
            'step_one.portrait': _('Portrait'),
            'step_one.landscape': _('Landscape'),
            'step_one.auto': _('Auto'),
            'step_one.auto_desc': _('Automatic'),
            'step_one.tooltip_validation': _('Please select an image and canvas size'),
            'step_one.no_results': _('No ad examples found. Try adjusting your filters.'),
            
            
            # NextButton translations
            'next_button.next': _('Next'),
            'next_button.updating': _('Updating...'),
            
            # InteractiveBentoGallery translations
            'bento_gallery.company': _('Company'),
            'bento_gallery.industry': _('Industry'),
            'bento_gallery.tags': _('Tags'),
            'bento_gallery.select_style': _('Select This Ad Style'),
            'bento_gallery.selected_style': _('Selected Style: {style}'),
            
            # SearchComponent translations
            'search.select_company': _('Select Company'),
            'search.search_company': _('Search company...'),
            'search.loading_companies': _('Loading companies...'),
            'search.no_companies': _('No companies found.'),
            'search.company': _('Company'),
            
            # FilterFormComponent translations
            'filter.industries': _('Industries'),
            'filter.select_industries': _('Select industries'),
            'filter.loading_industries': _('Loading industries...'),
            'filter.no_industries': _('No industries available'),
            'filter.tags': _('Ad description Keywords'),
            'filter.loading_tags': _('Loading tags...'),
            'filter.no_tags': _('No tags available'),
            
            # StepTwoComponent translations
            'step_two.summary': _('Summary'),
            'step_two.loading': _('Loading...'),
            'step_two.no_image': _('No image'),
            'step_two.square': _('Square'),
            'step_two.portrait_tall': _('Portrait Tall'),
            'step_two.portrait': _('Portrait'),
            'step_two.landscape': _('Landscape'),
            'step_two.unknown': _('Unknown'),
            'step_two.not_specified': _('Not specified'),
            'step_two.campaign_details': _('Campaign Details'),
            'step_two.website_url': _('Website URL'),
            'step_two.enter_website_url': _('Enter your website URL'),
            'step_two.brand_color': _('Brand Color'),
            'step_two.enter_hex_color': _('Enter a hex color that represents your brand identity'),
            'step_two.enter_hex_color_example': _('Enter hex color (e.g. FF5500)'),
            'step_two.enter_valid_hex_color': _('Please enter a valid hex color code (e.g. FF5500)'),
            'step_two.key_benefits': _('Key Benefits'),
            'step_two.add_key_benefits': _('Add the key benefits of your product or service'),
            'step_two.key_benefits_example': _('E.g. Fast delivery, 24/7 support...'),
            
            # ProductTypeSelect translations
            'product_type.title': _('Product Type'),
            'product_type.upload_images': _('Upload images for your product or service'),
            'product_type.physical_product': _('Physical Product'),
            'product_type.tangible_items': _('Tangible items that can be photographed'),
            'product_type.software_service': _('Software / Service'),
            'product_type.digital_products': _('Digital products or services with screenshots'),
            'product_type.or': _('OR'),
            
            # ProductImageUpload translations
            'product_image.title': _('Product Images'),
            'product_image.upload_description': _('Upload high-quality images of your physical product to showcase in your ad'),
            'product_image.primary_product': _('Primary Product'),
            'product_image.front_view': _('Front view or main product shot'),
            'product_image.add_primary': _('Add primary image'),
            'product_image.secondary_product': _('Secondary Product'),
            'product_image.side_view': _('Side view or product in use'),
            'product_image.add_secondary': _('Add secondary image'),
            
            # AppScreenshotUpload translations
            'app_screenshot.title': _('App Screenshots'),
            'app_screenshot.upload_description': _('Upload high-quality screenshots of your software to showcase its features'),
            'app_screenshot.main_interface': _('Main Interface'),
            'app_screenshot.main_screen': _('Main screen or dashboard view'),
            'app_screenshot.add_main': _('Add main screenshot'),
            'app_screenshot.feature_highlight': _('Feature Highlight'),
            'app_screenshot.key_feature': _('Key feature or functionality in action'),
            'app_screenshot.add_feature': _('Add feature screenshot'),
            
            # MarketingMaterialUpload translations
            'marketing_material.title': _('Additional Marketing Materials'),
            'marketing_material.upload_description': _('Upload supplementary images to enhance your ad campaign (optional)'),
            'marketing_material.testimonial': _('Testimonial'),
            'marketing_material.customer_review': _('Customer review or testimonial'),
            'marketing_material.add_image': _('Add image'),
            'marketing_material.product_in_use': _('Product in Use'),
            'marketing_material.show_product': _('Show your product in action'),
            'marketing_material.additional_view': _('Additional View'),
            'marketing_material.any_other_image': _('Any other relevant image'),
            
            # CompanyLogoUpload translations
            'company_logo.title': _('Company Branding'),
            'company_logo.upload_description': _('Upload your company logo to enhance your ad campaign\'s brand identity'),
            'company_logo.company_logo': _('Company Logo'),
            'company_logo.logo_description': _('Upload a high-quality logo'),
            'company_logo.add_logo': _('Add your company logo'),
            
            # BackButton translations
            'back_button.back': _('Back'),
            'back_button.going_back': _('Going back...'),
            
            # ImageUpload translations
            'image_upload.drag_drop': _('or drag and drop file here'),
            'image_upload.unsupported_format': _('Unsupported format. Please upload a JPG, PNG, or WebP image.'),
            
            # StepThreeComponent translations
            'step_three.summary': _('Summary'),
            'step_three.loading': _('Loading...'),
            'step_three.no_image': _('No image'),
            'step_three.ad_preview': _('Ad Preview'),
            'step_three.no_name': _('No name'),
            'step_three.no_brand_color': _('No brand color'),
            'step_three.no_company_website': _('No company website'),
            'step_three.no_key_benefits': _('No key benefits'),
            'step_three.square': _('Square'),
            'step_three.portrait_tall': _('Portrait Tall'),
            'step_three.portrait': _('Portrait'),
            'step_three.landscape': _('Landscape'),
            'step_three.unknown': _('Unknown'),
            'step_three.not_specified': _('Not specified'),
            'step_three.product_1': _('Product 1'),
            'step_three.product_2': _('Product 2'),
            'step_three.service_1': _('Service 1'),
            'step_three.service_2': _('Service 2'),
            'step_three.marketing_1': _('Marketing 1'),
            'step_three.marketing_2': _('Marketing 2'),
            'step_three.marketing_3': _('Marketing 3'),
            'step_three.prompt_label': _('Additional instructions? (optional)'),
            'step_three.prompt_placeholder': _('Write your prompt...'),
            'step_three.processing_info': _('Once submitted, your ad request will be processed. This may take a few minutes.'),
            'step_three.generating': _('Generating...'),
            'step_three.generate': _('Generate'),
            'step_three.no_request_id': _('No ad request ID available'),
            'step_three.csrf_not_found': _('CSRF token not found'),
            'step_three.update_status_failed': _('Failed to update status to SUBMITED'),
            'step_three.update_status_error': _('Error updating status to SUBMITED:'),
            'step_three.generate_version_error': _('Error generating version'),
            'step_three.submit_request_failed': _('Failed to submit ad request'),
            'step_three.update_draft_failed': _('Failed to update status to DRAFT'),
            
            'revision.prompt_label': _('Additional instructions?'),
            'revision.prompt_placeholder': _('Write your prompt...'),
            'revision.version_limit_reached': _('Version limit reached. No more versions can be generated.'),

            # Revision AdRequest translations (from revision-adrequest.jsx)
            'revision.prompt_required': _('Please enter a prompt before generating'),
            'revision.no_request_id': _('No ad request ID available'),
            'revision.no_image_available': _('No image available for revision'),
            'revision.update_status_failed': _('Failed to update status to SUBMITTED'),
            'revision.generate_version_error': _('Error generating version'),
            'revision.summary': _('Summary'),
            'revision.ad_style': _('Ad Style'),
            'revision.user_uploaded_image': _('User Uploaded Image'),
            'revision.custom_image': _('Custom Image'),
            'revision.user_uploaded': _('User uploaded'),
            'revision.ad_preview': _('Ad Preview'),
            'revision.no_name': _('No name'),
            'revision.no_image': _('No image'),
            'revision.brand_logo': _('Brand Logo'),
            'revision.no_logo': _('No logo'),
            'revision.brand_details': _('Brand Details'),
            'revision.no_brand_color': _('No brand color'),
            'revision.no_company_website': _('No company website'),
            'revision.no_key_benefits': _('No key benefits'),
            'revision.square': _('Square'),
            'revision.landscape': _('Landscape'),
            'revision.portrait': _('Portrait'),
            'revision.auto_desc': _('Automatic'),
            'revision.auto': _('Auto'),
            'revision.unknown': _('Unknown'),
            'revision.not_specified': _('Not specified'),
            'revision.product_1': _('Product 1'),
            'revision.product_2': _('Product 2'),
            'revision.service_1': _('Service 1'),
            'revision.service_2': _('Service 2'),
            'revision.product_service_images': _('Product & Service Images'),
            'revision.previous_version': _('Previous Version'),
            'revision.next_version': _('Next Version'),
            'revision.revision': _('Revision'),
            'revision.credits_available': _('credits available'),
            'revision.processing_info': _('Once submitted, your ad request will be processed. This may take a few minutes.'),
            'revision.generating': _('Generating...'),
            'revision.generate': _('Generate'),
            'revision.rate_image': _('Rate this image'),
            'revision.rate_title': _('Rate this generation'),
            'revision.comment_label': _('Review'),
            'revision.comment_placeholder': _('Share your thoughts about this generation...'),
            'revision.characters': _('characters'),
            'revision.cancel': _('Cancel'),
            'revision.submit_rating': _('Submit'),
            'revision.rating_success_message': _('Thank you for your feedback!'),
            'revision.rating_error_message': _('Failed to submit rating. Please try again.'),

            # Ad Requests translations (from revision-adrequest.jsx)
            'ad_requests.back_to_list': _('Back to Ad Requests'),
            'ad_requests.generated_image': _('Generated Ad Image'),
            'ad_requests.no_version_found': _('No version with generated image found for this ad request.'),
            
            # Credit package confirmation translations
            'billing.confirm_credit_purchase': _('Confirm Credit Package Purchase'),
            'billing.credit_package': _('Credit Package'),
            'billing.one_time_purchase': _('One-time purchase'),
            'billing.package_includes': _('Package Includes'),
            'billing.payment_information': _('Payment Information'),
            'billing.default_payment_method': _('Your default payment method will be charged immediately for this purchase.'),
            'billing.credits_available': _('Credits will be available in your account immediately after purchase.'),
            'billing.change_payment_method': _('To change your payment method, please go back to the billing page.'),
            'billing.confirm_purchase': _('Confirm Purchase'),
            'billing.back_to_billing': _('Back to Billing'),
            'billing.no_price_id': _('No price ID available for the selected package.'),
            'billing.purchase_failed': _('Failed to purchase credit package.'),
            'billing.unexpected_response': _('Received an unexpected response from the server.'),
            'billing.network_error': _('A network error occurred. Please try again.'),
            
            # Add more translations as needed
        }
    }

def robot_index(request):
    """
    Makes robot_index setting available to templates
    """
    # Define URLs that should not be indexed even on public pages
    noindex_urls = [
        'account_login', 'account_logout', 'account_signup', 
        'account_reset_password', 'account_confirm_email',
        'account_email', 'account_set_password', 'account_change_password',
        'account_request_login_code', 'socialaccount_signup', 'socialaccount_connections',
        'mfa_index', 'mfa_activate_totp',
        # Legal pages
        'terms', 'privacy',
        # Error pages
        '400', '403', '404', '500'
    ]
    
    # Check if current page should be marked as private/no-index
    force_noindex = False
    if hasattr(request, 'resolver_match') and request.resolver_match:
        url_name = request.resolver_match.url_name
        force_noindex = url_name in noindex_urls
    
    # Determine if this is a private page (extends app_base.html)
    # We'll detect this by checking if user is authenticated and URL patterns
    is_private_page = False
    if request.user.is_authenticated:
        # Common patterns for private pages
        private_url_patterns = [
            'ads:', 'dashboard', 'billing', 'profile', 'settings',
            'adrequest', 'subscription', 'usage'
        ]
        if hasattr(request, 'resolver_match') and request.resolver_match:
            url_name = request.resolver_match.url_name or ''
            namespace = request.resolver_match.namespace or ''
            full_name = f"{namespace}:{url_name}" if namespace else url_name
            
            is_private_page = any(pattern in full_name for pattern in private_url_patterns)
    
    return {
        "ROBOT_INDEX": settings.ROBOT_INDEX,
        "is_private_page": is_private_page,
        "force_noindex": force_noindex,
    }