from allauth.account import app_settings
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import user_email, user_field
from allauth.mfa.models import Authenticator
from django.utils import timezone
import posthog


class EmailAsUsernameAdapter(DefaultAccountAdapter):
    """
    Adapter that always sets the username equal to the user's email address.
    Also tracks login and signup events with PostHog.
    """

    def populate_username(self, request, user):
        # override the username population to always use the email
        user_field(user, app_settings.USER_MODEL_USERNAME_FIELD, user_email(user))
        
    def save_user(self, request, user, form, commit=True):
        # Call the parent method to save the user
        user = super().save_user(request, user, form, commit)

        # PostHog user identification
        try:
            # 1. Alias the anonymous user with the new user ID
            distinct_id = request.POST.get('distinct_id')
            if distinct_id:
                posthog.alias(distinct_id, user.id)

            # 2. Identify the user immediately after aliasing
            posthog.identify(
                user.id,
                properties={
                    'email': user.email,
                    'name': user.get_full_name(),
                    'date_joined': user.date_joined.isoformat(),
                }
            )

        except Exception as e:
            # Log the error but don't prevent signup
            print(f"Error in PostHog user identification during signup: {e}")

        return user
        
    def login(self, request, user):
        # Track login event in PostHog before completing the login process
        try:
            # Determine login method
            login_method = 'email'
            if 'socialaccount_login' in request.session:
                login_method = request.session.get('socialaccount_login', {}).get('provider', 'social')
                
            # Track the login event
            posthog.capture(
                user.id,
                event='User Login',
                properties={
                    'login_method': login_method,
                    '$current_url': request.build_absolute_uri(),
                }
            )
            # Identify the user on login to update properties like last_login
            posthog.identify(
                user.id,
                properties={
                    'email': user.email,
                    'name': user.get_full_name(),
                    'last_login': timezone.now().isoformat(),
                }
            )
        except Exception as e:
            # Log the error but don't prevent login
            print(f"Error tracking PostHog login event: {e}")
            
        # Call the parent login method to complete the login process
        return super().login(request, user)


class NoNewUsersAccountAdapter(DefaultAccountAdapter):
    """
    Adapter that can be used to disable public sign-ups for your app.
    """

    def is_open_for_signup(self, request):
        # see https://stackoverflow.com/a/29799664/8207
        return False


def user_has_valid_totp_device(user) -> bool:
    if not user.is_authenticated:
        return False
    return user.authenticator_set.filter(type=Authenticator.Type.TOTP).exists()
