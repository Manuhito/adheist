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

    # Onboarding Status Constants
    ONBOARDING_STEP_1 = 'STEP_1'
    ONBOARDING_STEP_2 = 'STEP_2'
    ONBOARDING_STEP_3 = 'STEP_3'
    ONBOARDING_STEP_4 = 'STEP_4'
    ONBOARDING_STEP_5 = 'STEP_5'
    ONBOARDED = 'ONBOARDED'

    STATUS_CHOICES = [
        (ONBOARDING_STEP_1, 'Step 1'),
        (ONBOARDING_STEP_2, 'Step 2'),
        (ONBOARDING_STEP_3, 'Step 3'),
        (ONBOARDING_STEP_4, 'Step 4'),
        (ONBOARDING_STEP_5, 'Step 5'),
        (ONBOARDED, 'Onboarded'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=ONBOARDING_STEP_1
    )

    def __str__(self):
        return f"{self.get_full_name()} <{self.email or self.username}>"

    def get_display_name(self) -> str:
        if self.get_full_name().strip():
            return self.get_full_name()
        return self.email or self.username

    @property
    def has_completed_onboarding(self):
        return self.status == self.ONBOARDED

    @property
    def current_onboarding_step(self):
        return self.status

    def advance_onboarding(self):
        """
        Advances the onboarding status to the next step.
        Returns True if updated, False if already onboarded.
        """
        if self.status == self.ONBOARDED:
            return False
        
        if self.status == self.ONBOARDING_STEP_1:
            self.status = self.ONBOARDING_STEP_2
        elif self.status == self.ONBOARDING_STEP_2:
            self.status = self.ONBOARDING_STEP_3
        elif self.status == self.ONBOARDING_STEP_3:
            self.status = self.ONBOARDING_STEP_4
        elif self.status == self.ONBOARDING_STEP_4:
            self.status = self.ONBOARDING_STEP_5
        elif self.status == self.ONBOARDING_STEP_5:
            self.status = self.ONBOARDED
            
        self.save(update_fields=['status'])
        return True

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


class UserOnboarding(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='onboarding')
    website = models.URLField(max_length=200, blank=True, null=True)
    competitors = models.JSONField(default=list, blank=True)
    
    # Competitor research status
    competitor_research_completed = models.BooleanField(default=False)
    selected_competitor_page = models.ForeignKey(
        'apify.FacebookPage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding_selections',
        help_text="The competitor FacebookPage with available ads"
    )

    def __str__(self):
        return f"Onboarding info for {self.user}"
