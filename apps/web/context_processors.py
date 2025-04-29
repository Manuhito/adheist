from copy import copy

from django.conf import settings
from django.utils.translation import gettext as _

from .meta import absolute_url, get_server_root


def project_meta(request):
    # modify these values as needed and add whatever else you want globally available here
    project_data = copy(settings.PROJECT_METADATA)
    project_data["TITLE"] = "{} | {}".format(project_data["NAME"], project_data["DESCRIPTION"])
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
            'pricing.free': _('Free'),
            'pricing.starter': _('Starter'),
            'pricing.pro': _('Pro'),
            'pricing.team': _('Team'),
            'pricing.enterprise': _('Enterprise'),
            'pricing.free_description': _('Basic features for individuals'),
            'pricing.pro_description': _('Advanced features for professionals'),
            'pricing.team_description': _('For teams and businesses'),
            'pricing.enterprise_description': _('For large organizations'),
            'pricing.feature_free_1': _('3 ad requests per month'),
            'pricing.feature_free_2': _('Basic templates'),
            'pricing.feature_free_3': _('Standard support'),
            'pricing.feature_pro_1': _('20 ad requests per month'),
            'pricing.feature_pro_2': _('Premium templates'),
            'pricing.feature_pro_3': _('Priority support'),
            'pricing.feature_pro_4': _('Custom branding'),
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
            'pricing.upgrade_to_pro': _('Upgrade to Pro'),
            'pricing.upgrade_to_team': _('Upgrade to Team'),
            'pricing.contact_sales': _('Contact Sales'),
            'pricing.custom': _('Custom'),
            'pricing.current_plan': _('Current Plan'),
            'pricing.most_popular': _('🔥 Most Popular'),
            'pricing.per_month': _('Per month'),
            
            # Add more translations as needed
        }
    }
