import hashlib
import uuid
from functools import cached_property

from allauth.account.models import EmailAddress
from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.subscriptions.models import SubscriptionModelBase

from apps.users.helpers import validate_profile_picture


def _get_avatar_filename(instance, filename):
    """Use random filename prevent overwriting existing files & to fix caching issues."""
    return f"profile-pictures/{uuid.uuid4()}.{filename.split('.')[-1]}"


class CustomUser(SubscriptionModelBase, AbstractUser):
    """
    Add additional fields to the user model here.
    """

    avatar = models.FileField(upload_to=_get_avatar_filename, blank=True, validators=[validate_profile_picture])
    language = models.CharField(max_length=10, blank=True, null=True)
    timezone = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.get_full_name()} <{self.email or self.username}>"

    def get_display_name(self) -> str:
        if self.get_full_name().strip():
            return self.get_full_name()
        return self.email or self.username

    def get_ad_request_limit_and_usage(self):
        """Get the user's AdRequest limit and current usage"""
        from apps.ads.services import get_ad_request_limit
        from apps.ads.models import AdRequestUsage
        
        limit = get_ad_request_limit(self)
        usage = AdRequestUsage.get_current_usage(self).usage_count
        
        # For free users, show it as a lifetime limit
        if not self.has_active_subscription():
            return {
                'limit': limit,
                'usage': usage,
                'remaining': max(0, limit - usage),
                'is_lifetime': True
            }
        
        # For paid users, show as a monthly limit
        return {
            'limit': limit,
            'usage': usage,
            'remaining': max(0, limit - usage),
            'is_lifetime': False
        }

    @property
    def avatar_url(self) -> str:
        if self.avatar:
            return self.avatar.url
        else:
            return "https://www.gravatar.com/avatar/{}?s=128&d=identicon".format(self.gravatar_id)

    @property
    def gravatar_id(self) -> str:
        # https://en.gravatar.com/site/implement/hash/
        return hashlib.md5(self.email.lower().strip().encode("utf-8")).hexdigest()

    @cached_property
    def has_verified_email(self):
        return EmailAddress.objects.filter(user=self, verified=True).exists()

    
