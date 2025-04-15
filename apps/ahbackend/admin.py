from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, reverse
from django.utils.safestring import mark_safe
from django.core.files.storage import default_storage
import json
import zipfile
import io
import os

from .models import (
    AdLibrary,
    IndustryList,
    TagList,
    AdRequest,
    AdRequestAssets,
    AdRequestVersion,
)


@admin.register(AdLibrary)
class AdLibraryAdmin(admin.ModelAdmin):
    list_display = ["company_name", "created_at", "updated_at"]
    search_fields = ["company_name"]
    list_filter = ["industries", "tags"]
    filter_horizontal = ["industries", "tags"]


@admin.register(IndustryList)
class IndustryListAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(TagList)
class TagListAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(AdRequest)
class AdRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "ad_library", "status", "canvas_size", "created_at", "updated_at"]
    search_fields = ["user__email", "ad_library__company_name"]
    list_filter = ["status", "canvas_size"]


@admin.register(AdRequestAssets)
class AdRequestAssetsAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "updated_at"]
    search_fields = ["user__email"]


@admin.register(AdRequestVersion)
class AdRequestVersionAdmin(admin.ModelAdmin):
    list_display = ["ad_request", "status", "user_admin_assigned", "created_at", "updated_at"]
    search_fields = ["ad_request__ad_library__company_name", "status"]
    list_filter = ["status", "user_admin_assigned"]
    readonly_fields = ["ad_request", "generated_prompt", "status", "download_overrides_button"]
    exclude = ["user_prompt"]
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:version_id>/download-overrides/',
                self.admin_site.admin_view(self.download_overrides),
                name='ahbackend_adrequestversion_download_overrides',
            ),
        ]
        return custom_urls + urls
    
    def download_overrides_button(self, obj):
        if obj.pk and obj.ad_request:
            url = reverse('admin:ahbackend_adrequestversion_download_overrides', args=[obj.pk])
            return mark_safe(f'''
            <a class="button" href="{url}" target="_blank">
                Download Images
            </a>
            ''')
        return "-"
    download_overrides_button.short_description = "Download Images"
    
    def download_overrides(self, request, version_id):
        try:
            version = AdRequestVersion.objects.get(pk=version_id)
            ad_request = version.ad_request
            
            # Create a zip file in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add image override files to the zip
                image_fields = [
                    'logo', 'product_image_1', 'product_image_2', 
                    'app_image_1', 'app_image_2',
                    'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
                ]
                
                has_images = False
                for field in image_fields:
                    override_field = f"{field}_override"
                    if hasattr(ad_request, override_field) and getattr(ad_request, override_field):
                        image = getattr(ad_request, override_field)
                        if image and image.name:
                            has_images = True
                            # Get the file from storage
                            file_path = image.name
                            file_name = os.path.basename(file_path)
                            # Add a prefix to avoid name collisions
                            zip_name = f"{field}_{file_name}"
                            
                            # Read the file content
                            with default_storage.open(file_path) as f:
                                zip_file.writestr(zip_name, f.read())
            
            # If no images were found, return a message
            if not has_images:
                return HttpResponse("No image overrides found for this ad request", content_type='text/plain')
                
            # Create the response with the zip file
            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="ad_request_{ad_request.id}_images.zip"'
            return response
            
        except AdRequestVersion.DoesNotExist:
            return HttpResponse("Ad request version not found", status=404)

