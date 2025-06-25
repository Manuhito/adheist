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
        
        # Track signup event in PostHog
        try:
            # Determine signup method
            signup_method = 'email'
            if 'socialaccount_login' in request.session:
                signup_method = request.session.get('socialaccount_login', {}).get('provider', 'social')
                
            # Track the signup event
            posthog.capture(
                user.email,
                event='Signup Completed',
                properties={ 
                    '$set': { 
                        'Signup Completed': True,
                        'Signup Method': signup_method,
                        'Date Joined': user.date_joined.isoformat(),
                    },
                    'signup_method': signup_method,
                    '$current_url': request.build_absolute_uri(),
                }
            )
        except Exception as e:
            # Log the error but don't prevent signup
            print(f"Error tracking PostHog signup event: {e}")
            
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
                user.email,
                event='User Login',
                properties={ 
                    '$set': { 
                        'Last Login': timezone.now().isoformat(),
                        'Login Count': user.last_login is not None,  # True if not first login
                    },
                    'login_method': login_method,
                    '$current_url': request.build_absolute_uri(),
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
