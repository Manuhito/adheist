from django.db import models
from django.urls import reverse
from django.conf import settings

from apps.utils.models import BaseModel


class IndustryList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ahbackend:industrylist_detail", kwargs={"pk": self.pk})


class TagList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ahbackend:taglist_detail", kwargs={"pk": self.pk})


class AdLibrary(BaseModel):
    company_name = models.CharField(max_length=100)
    industry = models.ForeignKey(IndustryList, on_delete=models.CASCADE, related_name="adlibraries")
    tag = models.ForeignKey(TagList, on_delete=models.CASCADE, related_name="adlibraries")
    ad_image = models.ImageField(upload_to="adlibrary/", null=True, blank=True)

    def __str__(self):
        return self.company_name

    def get_absolute_url(self):
        return reverse("ahbackend:adlibrary_detail", kwargs={"pk": self.pk})


class AdRequestAssets(BaseModel):
    company_website = models.URLField()
    logo = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    main_hex_color = models.CharField(max_length=7)
    key_benefits = models.TextField()
    product_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    product_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_3 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)

class AdRequest(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ad_library = models.ForeignKey(AdLibrary, on_delete=models.CASCADE)
    ad_req_assets = models.ForeignKey(AdRequestAssets, on_delete=models.CASCADE)

class AdRequestVersion(BaseModel):
    ad_request = models.ForeignKey(AdRequest, on_delete=models.CASCADE, related_name="versions")
    prompt = models.TextField()
    generated_image = models.ImageField(upload_to="revisions/", null=True, blank=True)
    user_admin_assigned = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="assigned_requests")
    status = models.CharField(max_length=20, default="pending")
