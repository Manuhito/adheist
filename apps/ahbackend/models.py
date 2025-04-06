from django.db import models
from django.urls import reverse
from django.conf import settings

from apps.utils.models import BaseModel


class AdLibrary(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ahbackend:adlibrary_detail", kwargs={"pk": self.pk})

