from django.db import models
from django.core.exceptions import ValidationError
from apps.utils.models import BaseModel


class SingletonModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.pk and self.__class__.objects.exists():
            raise ValidationError(f'Only one {self.__class__.__name__} instance can exist.')
        return super().save(*args, **kwargs)


class TermsAndConditions(SingletonModel, BaseModel):
    content = models.TextField(help_text="Terms and conditions page content")

    class Meta:
        verbose_name = "Terms and Conditions"
        verbose_name_plural = "Terms and Conditions"

    def __str__(self):
        return "Terms and Conditions"


class PrivacyPolicy(SingletonModel, BaseModel):
    content = models.TextField(help_text="Privacy policy page content")

    class Meta:
        verbose_name = "Privacy Policy"
        verbose_name_plural = "Privacy Policies"

    def __str__(self):
        return "Privacy Policy"