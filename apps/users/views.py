from .adapter import user_has_valid_totp_device
from allauth.account.utils import send_email_confirmation
from allauth.socialaccount.models import SocialAccount

import json
from datetime import datetime, date
from decimal import Decimal
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.utils import translation, timezone
from django.utils.translation import gettext_lazy as _
from django.views.decorators.http import require_POST
from django.forms.models import model_to_dict


# Función para convertir objetos a formatos serializables
def json_safe_data(data):
    """Convierte datos a un formato seguro para JSON, evitando referencias circulares."""
    if isinstance(data, (str, int, float, bool, type(None))):
        return data
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, dict):
        return {k: json_safe_data(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple)):
        return [json_safe_data(item) for item in data]
    elif hasattr(data, 'id') and hasattr(data, '__class__'):
        # Para modelos Django, solo devolvemos el ID y el nombre de la clase
        return {
            'id': data.id,
            'model': data.__class__.__name__
        }
    # Para otros objetos, convertimos a string
    return str(data)

from .forms import CustomUserChangeForm, UploadAvatarForm
from .helpers import require_email_confirmation, user_has_confirmed_email_address
from .models import CustomUser, UserOnboarding


@login_required
def profile(request):
    if request.method == "POST":
        # Check if this is an API request
        if request.headers.get('Content-Type') == 'application/json':
            data = json.loads(request.body)
            form = CustomUserChangeForm(data, instance=request.user)
            if form.is_valid():
                user = form.save(commit=False)
                user_before_update = CustomUser.objects.get(pk=user.pk)
                need_to_confirm_email = (
                    user_before_update.email != user.email
                    and require_email_confirmation()
                    and not user_has_confirmed_email_address(user, user.email)
                )
                if need_to_confirm_email:
                    # don't change it but instead send a confirmation email
                    # email will be changed by signal when confirmed
                    new_email = user.email
                    send_email_confirmation(request, user, signup=False, email=new_email)
                    user.email = user_before_update.email
                    return JsonResponse({
                        'success': True,
                        'message': _('A confirmation email has been sent to your new email address.'),
                    })
                user.save()

                user_language = user.language
                if user_language and user_language != translation.get_language():
                    translation.activate(user_language)
                if user.timezone != timezone.get_current_timezone():
                    if user.timezone:
                        timezone.activate(user.timezone)
                    else:
                        timezone.deactivate()
                return JsonResponse({
                    'success': True,
                    'message': _('Profile successfully saved.'),
                })
            else:
                return JsonResponse({
                    'success': False,
                    'errors': form.errors,
                }, status=400)
        else:
            # Handle traditional form submission
            form = CustomUserChangeForm(request.POST, instance=request.user)
            if form.is_valid():
                user = form.save(commit=False)
                user_before_update = CustomUser.objects.get(pk=user.pk)
                need_to_confirm_email = (
                    user_before_update.email != user.email
                    and require_email_confirmation()
                    and not user_has_confirmed_email_address(user, user.email)
                )
                if need_to_confirm_email:
                    # don't change it but instead send a confirmation email
                    # email will be changed by signal when confirmed
                    new_email = user.email
                    send_email_confirmation(request, user, signup=False, email=new_email)
                    user.email = user_before_update.email
                    # recreate the form to avoid populating the previous email in the returned page
                    form = CustomUserChangeForm(instance=user)
                user.save()

                user_language = user.language
                if user_language and user_language != translation.get_language():
                    translation.activate(user_language)
                if user.timezone != timezone.get_current_timezone():
                    if user.timezone:
                        timezone.activate(user.timezone)
                    else:
                        timezone.deactivate()
                messages.success(request, _("Profile successfully saved."))
    else:
        form = CustomUserChangeForm(instance=request.user)
    
    # Prepare user data
    user_data = model_to_dict(request.user)
    user_data['avatar_url'] = request.user.avatar_url
    user_data['has_verified_email'] = user_has_confirmed_email_address(request.user, request.user.email)
    user_data['has_usable_password'] = request.user.has_usable_password()
    user_data['emailaddress_set'] = {'count': request.user.emailaddress_set.count()}
    
    # Prepare form data
    form_data = {
        'fields': {}
    }
    for field_name, field in form.fields.items():
        field_data = {
            'required': field.required,
            'help_text': str(field.help_text) if field.help_text else '',
        }
        if hasattr(field, 'choices') and field.choices:
            field_data['choices'] = list(field.choices)
        form_data['fields'][field_name] = field_data
    
    # Prepare social accounts data
    social_accounts_data = []
    for account in SocialAccount.objects.filter(user=request.user):
        account_data = {
            'provider': account.provider,
            'extra_data': account.extra_data,
        }
        provider_account = account.get_provider_account()
        if provider_account:
            if hasattr(provider_account, 'get_profile_url'):
                account_data['get_profile_url'] = provider_account.get_profile_url()
            if hasattr(provider_account, 'get_screen_name'):
                account_data['get_screen_name'] = provider_account.get_screen_name()
            if hasattr(provider_account, 'get_brand'):
                # get_brand() can return different types depending on provider
                # Google returns dict, others may return objects
                brand_obj = provider_account.get_brand()
                brand_name = None
                
                if isinstance(brand_obj, dict):
                    brand_name = brand_obj.get('name') or brand_obj.get('display_name') or brand_obj.get('brand')
                elif brand_obj is not None:
                    brand_name = getattr(brand_obj, 'name', None) or getattr(brand_obj, 'display_name', None) or str(brand_obj)
                
                account_data['get_brand'] = {'name': brand_name}
        social_accounts_data.append(account_data)
    
    # Check if this is an API request
    if request.headers.get('Accept') == 'application/json' or request.path.endswith('/api/profile/'):
        api_data = {
            'user': user_data,
            'form': form_data,
            'social_accounts': social_accounts_data,
            'user_has_valid_totp_device': user_has_valid_totp_device(request.user),
            'now': timezone.now().isoformat(),
            'current_tz': str(timezone.get_current_timezone()),
        }
        # Convertir datos a un formato seguro para JSON
        safe_api_data = json_safe_data(api_data)
        return JsonResponse(safe_api_data)
    
    # Prepare data for JSON serialization
    profile_data = {
        'user': user_data,
        'form': form_data,
        'social_accounts': social_accounts_data,
        'user_has_valid_totp_device': user_has_valid_totp_device(request.user),
        'now': timezone.now().isoformat(),
        'current_tz': str(timezone.get_current_timezone()),
    }
    
    # Convertir datos a un formato seguro para JSON
    safe_profile_data = json_safe_data(profile_data)
    
    # Render the React template
    return render(
        request,
        "account/profile_react.html",
        {
            "profile_data": json.dumps(safe_profile_data),
            "active_tab": "profile",
            "page_title": _("Profile"),
        },
    )


@login_required
@require_POST
def upload_profile_image(request):
    user = request.user
    form = UploadAvatarForm(request.POST, request.FILES)
    if form.is_valid():
        user.avatar = request.FILES["avatar"]
        user.save()
        return HttpResponse(_("Success!"))
    else:
        readable_errors = ", ".join(str(error) for key, errors in form.errors.items() for error in errors)
        return JsonResponse(status=403, data={"errors": readable_errors})


@login_required
@require_POST
def advance_onboarding_step(request):
    """
    API endpoint to advance the user's onboarding status to the next step.
    """
    user = request.user
    
    if user.has_completed_onboarding:
        return JsonResponse({'success': False, 'message': 'Already onboarded'})
    
    previous_step = user.current_onboarding_step
    user.advance_onboarding()
    
    return JsonResponse({
        'success': True,
        'previous_step': previous_step,
        'current_step': user.current_onboarding_step,
    })


@login_required
@require_POST
def complete_onboarding(request):
    user = request.user

    if user.has_completed_onboarding:
        return JsonResponse({'success': True, 'current_step': user.current_onboarding_step})

    previous_step = user.current_onboarding_step
    user.status = CustomUser.ONBOARDED
    user.save(update_fields=['status'])

    return JsonResponse({
        'success': True,
        'previous_step': previous_step,
        'current_step': user.current_onboarding_step,
    })


@login_required
def onboarding_view(request):
    """
    View to handle the onboarding process.
    """
    if request.user.has_completed_onboarding:
        return redirect('ads:discover_page')
        
    current_step = request.user.current_onboarding_step

    social_accounts = SocialAccount.objects.filter(user=request.user)
    google_account = None
    for account in social_accounts:
        provider_id = getattr(account, "provider", "") or ""
        if provider_id.lower() == "google":
            google_account = account
            break

    is_google_login = google_account is not None
    google_hd = google_account.extra_data.get('hd') if is_google_login and google_account.extra_data else None

    onboarding_data = {
        'currentStep': current_step,
        'user': {
            'username': request.user.username,
            'email': request.user.email,
            'firstName': request.user.first_name,
            'isGoogleLogin': is_google_login,
            'googleHd': google_hd,
        }
    }
    
    # Load saved onboarding data if user is past STEP_1
    if current_step != 'STEP_1':
        try:
            user_onboarding = UserOnboarding.objects.select_related('brand').get(user=request.user)
            print(f"DEBUG: Found UserOnboarding for {request.user.email}, brand={user_onboarding.brand}, website={user_onboarding.website}")
            saved_data = {
                'website': user_onboarding.website,
            }
            
            # Add screenshot if available
            if user_onboarding.website_screenshot:
                saved_data['screenshot'] = user_onboarding.website_screenshot.url
            
            # Add brand data if available
            if user_onboarding.brand:
                from apps.ads.models import AdRequestAssets
                brand = user_onboarding.brand
                saved_data['brandData'] = {
                    'brand_id': brand.id,
                    'brand_name': brand.brand_name,
                    'brand': {
                        'id': brand.id,
                        'name': brand.brand_name,
                    }
                }
                
                # Get AdRequestAssets for additional brand details
                try:
                    assets = AdRequestAssets.objects.get(brand=brand)
                    saved_data['brandData']['brand']['product_description'] = assets.product_description
                    saved_data['brandData']['brand']['industry'] = assets.industry
                    saved_data['brandData']['brand']['website'] = assets.company_website
                    saved_data['brandData']['product_description'] = assets.product_description
                except AdRequestAssets.DoesNotExist:
                    pass
            
            onboarding_data['savedData'] = saved_data
        except UserOnboarding.DoesNotExist:
            pass
    
    return render(
        request,
        "onboarding/onboarding.html",
        {
            "onboarding_data": json.dumps(onboarding_data),
            "page_title": "Onboarding",
        },
    )
