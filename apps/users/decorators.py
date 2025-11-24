from functools import wraps
from django.shortcuts import redirect
from django.conf import settings

def onboarding_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect(settings.LOGIN_URL)
            
        if not request.user.has_completed_onboarding:
            # Redirect to the onboarding view
            return redirect('users:onboarding')
            
        return view_func(request, *args, **kwargs)
    return _wrapped_view
