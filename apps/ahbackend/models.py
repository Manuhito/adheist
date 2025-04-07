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
    industries = models.ManyToManyField(IndustryList, related_name="adlibraries")
    tags = models.ManyToManyField(TagList, related_name="adlibraries")
    ad_image = models.ImageField(upload_to="adlibrary/", null=True, blank=True)

    def __str__(self):
        return self.company_name

    def get_absolute_url(self):
        return reverse("ahbackend:adlibrary_detail", kwargs={"pk": self.pk})


class AdRequestAssets(BaseModel):
    company_website = models.URLField(null=True, blank=True)
    logo = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    main_hex_color = models.CharField(max_length=7, null=True, blank=True)
    key_benefits = models.TextField(null=True, blank=True)
    product_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    product_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_3 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)

class AdRequest(BaseModel):
    STATUS_DRAFT = 'DRAFT'
    STATUS_FILLED = 'FILLED'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_APPROVED = 'COMPLETED'
    STATUS_REOPENED = 'REOPENED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_FILLED, 'Filled'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Completed'),
        (STATUS_REOPENED, 'Reopened'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ad_library = models.ForeignKey(AdLibrary, on_delete=models.CASCADE)
    ad_req_assets = models.ForeignKey(AdRequestAssets, on_delete=models.CASCADE)
    canvas_size = models.CharField(max_length=20, default="1080x1080")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)

class AdRequestVersion(BaseModel):
    STATUS_DRAFT = 'DRAFT'
    STATUS_UNASSIGNED = 'UNASSIGNED'
    STATUS_ASSIGNED = 'ASSIGNED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_UNASSIGNED, 'Unassigned'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_COMPLETED, 'Completed'),
    ]
    
    ad_request = models.ForeignKey(AdRequest, on_delete=models.CASCADE, related_name="versions")
    prompt = models.TextField()
    generated_image = models.ImageField(upload_to="revisions/", null=True, blank=True)
    user_admin_assigned = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="assigned_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
