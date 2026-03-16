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
import requests

logger = logging.getLogger(__name__)


@receiver(user_signed_up)
def handle_sign_up(request, user, **kwargs):
    signup_method = "email"
    social_login = request.session.get("socialaccount_login") if request and hasattr(request, "session") else None
    if isinstance(social_login, dict):
        signup_method = social_login.get("provider", "social")

    timestamp = timezone.now().isoformat()
    channels = _get_signup_notification_channels()

    if "MAIL" in channels:
        _notify_admins_of_signup(user, signup_method, timestamp)

    if "SLACK" in channels:
        _notify_slack_of_signup(user, signup_method, timestamp)


@receiver(email_confirmed)
def update_user_email(sender, request, email_address, **kwargs):
    """
    When an email address is confirmed make it the primary email.
    """
    # This also sets user.email to the new email address.
    # hat tip: https://stackoverflow.com/a/29661871/8207
    email_address.set_as_primary()


def _get_signup_notification_channels():
    raw_channels = getattr(settings, "SIGNUP_NOTIFICATION_CHANNELS", "MAIL")
    channels = {channel.strip().upper() for channel in raw_channels.split(",") if channel.strip()}
    valid_channels = {"MAIL", "SLACK"}
    selected = channels & valid_channels

    if not selected:
        logger.warning(
            f"Invalid SIGNUP_NOTIFICATION_CHANNELS={raw_channels!r}. Falling back to MAIL."
        )
        return {"MAIL"}

    return selected


def _notify_admins_of_signup(user, signup_method, timestamp):
    mail_admins(
        f"Yowsers, someone signed up for {settings.PROJECT_METADATA['NAME']}!",
        "Email: {}\nUser ID: {}\nSignup method: {}\nTimestamp: {}".format(
            user.email,
            user.id,
            signup_method,
            timestamp,
        ),
        fail_silently=True,
    )


def _notify_slack_of_signup(user, signup_method, timestamp):
    app_env = getattr(settings, "APP_ENV", "dev")
    env_prefix = f"[{app_env.upper()}]"
    title = f"{env_prefix} New User Signup"

    if app_env == "dev":
        logger.info(f"Slack signup notification skipped in development environment: {title}")
        return False

    webhook_url = getattr(settings, "SIGNUP_SLACK_WEBHOOK_URL", "") or getattr(settings, "SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        logger.warning("SIGNUP_SLACK_WEBHOOK_URL/SLACK_WEBHOOK_URL not configured. Signup notification not sent.")
        return False

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": title,
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Email:*\n{user.email}"},
                {"type": "mrkdwn", "text": f"*User ID:*\n{user.id}"},
                {"type": "mrkdwn", "text": f"*Signup Method:*\n{signup_method}"},
                {"type": "mrkdwn", "text": f"*Timestamp:*\n{timestamp}"},
            ],
        },
    ]

    try:
        response = requests.post(
            webhook_url,
            json={"blocks": blocks},
            timeout=5,
        )
    except Exception as exc:
        logger.error(f"Error sending Slack signup notification: {exc}")
        return False

    if response.status_code != 200:
        logger.error(
            "Error sending Slack signup notification. "
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
        return False

    return True


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
