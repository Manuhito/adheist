from allauth.socialaccount.adapter import get_adapter
from django import template
from allauth.socialaccount.models import SocialApp

register = template.Library()


@register.simple_tag(takes_context=True)
def get_socialapps(context):
    """
    Returns a list of social authentication apps.

    Usage: `{% get_socialapps as socialapps %}`.

    Then within the template context, `socialapps` will hold
    a list of social app providers configured for the current site.
    """
    # Obtener proveedores únicos usando un set y el ID como clave
    providers = get_adapter().list_providers(context["request"])
    unique_providers = {p.id: p for p in providers}
    print("Initial unique providers:", list(unique_providers.keys()))
    
    configured_providers = []
    for provider in unique_providers.values():
        # Solo incluir proveedores que tengan una app configurada
        if SocialApp.objects.filter(provider=provider.id).exists():
            print(f"Found app for provider {provider.id}")
            # monkey patch logo path to use in template
            logo_paths = {
                "twitter_oauth2": "twitter",
            }
            logo_id = logo_paths.get(provider.id, provider.id)
            provider.logo_path = f"images/socialauth/{logo_id}-logo.svg"
            configured_providers.append(provider)

    print("Final configured providers:", [p.id for p in configured_providers])
    return configured_providers
