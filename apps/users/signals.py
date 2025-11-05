from allauth.account.signals import email_confirmed, user_signed_up, user_logged_out
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import mail_admins
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from apps.users.models import CustomUser
import posthog
import logging

logger = logging.getLogger(__name__)


@receiver(user_signed_up)
def handle_sign_up(request, user, **kwargs):
    # PostHog signup event tracking
    try:
        signup_method = 'email'
        if 'socialaccount_login' in request.session:
            provider = request.session.get('socialaccount_login', {}).get('provider')
            if provider:
                signup_method = provider

        posthog.capture(
            user.id,
            event='Signup Completed',
            properties={
                'signup_method': signup_method,
                '$current_url': request.build_absolute_uri(),
            }
        )
    except Exception as e:
        logger.error(f"Error tracking PostHog signup event in signal: {e}")

    # Original function logic
    _notify_admins_of_signup(user)


@receiver(email_confirmed)
def update_user_email(sender, request, email_address, **kwargs):
    """
    When an email address is confirmed make it the primary email.
    """
    # This also sets user.email to the new email address.
    # hat tip: https://stackoverflow.com/a/29661871/8207
    email_address.set_as_primary()


def _notify_admins_of_signup(user):
    mail_admins(
        f"Yowsers, someone signed up for {settings.PROJECT_METADATA['NAME']}!",
        "Email: {}".format(user.email),
        fail_silently=True,
    )


@receiver(pre_save, sender=CustomUser)
def remove_old_profile_picture_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return False

    try:
        old_file = sender.objects.get(pk=instance.pk).avatar
    except sender.DoesNotExist:
        return False

    if old_file and old_file.name != instance.avatar.name:
        if default_storage.exists(old_file.name):
            default_storage.delete(old_file.name)


@receiver(user_logged_out)
def handle_user_logout(request, user, **kwargs):
    """
    Captura el evento de logout en PostHog cuando un usuario cierra sesión.
    """
    if user and user.is_authenticated:
        try:
            # Registrar evento de logout en PostHog
            posthog.capture(
                user.id,
                'User Logout',
                properties={
                    '$set': {
                        'Last Logout': timezone.now().isoformat(),
                        'email': user.email,
                    },
                }
            )
            logger.info(f"Evento de logout registrado para el usuario {user.email}")
        except Exception as e:
            # Registrar error pero continuar con el logout
            logger.error(f"Error al registrar evento de logout en PostHog: {e}")


@receiver(post_delete, sender=CustomUser)
def remove_profile_picture_on_delete(sender, instance, **kwargs):
    if instance.avatar:
        if default_storage.exists(instance.avatar.name):
            default_storage.delete(instance.avatar.name)
