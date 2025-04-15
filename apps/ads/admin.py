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
    readonly_fields = ["user_admin_assigned", "generated_prompt_with_copy", "status", "download_overrides_button"]
    # readonly_fields = ["ad_request", "generated_prompt", "status", "download_overrides_button"]
    exclude = ["user_prompt", "generated_prompt"]
    actions = ["assign_to_me"]
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:version_id>/download-overrides/',
                self.admin_site.admin_view(self.download_overrides),
                name='ads_adrequestversion_download_overrides',
            ),
        ]
        return custom_urls + urls
    
    def download_overrides_button(self, obj):
        if obj.pk and obj.ad_request:
            url = reverse('admin:ads_adrequestversion_download_overrides', args=[obj.pk])
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
            
            # Get user email (use username if email is not available)
            user_email = ad_request.user.email if hasattr(ad_request.user, 'email') else ad_request.user.username
            # Clean the email to make it filename-safe (remove special characters)
            safe_email = ''.join(c if c.isalnum() or c in '._-' else '_' for c in user_email)
            
            # Create filename in the requested format
            filename = f'{safe_email}_request_{ad_request.id}.zip'
            
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except AdRequestVersion.DoesNotExist:
            return HttpResponse("Ad request version not found", status=404)
            
    def generated_prompt_with_copy(self, obj):
        """Display generated_prompt field with a copy to clipboard button"""
        if not obj.generated_prompt:
            return "-"
            
        # Unique ID for this field to target with JavaScript
        field_id = f"generated-prompt-{obj.pk}"
        button_id = f"copy-button-{obj.pk}"
        
        # JavaScript for clipboard functionality
        js = f"""
        <script>
            document.addEventListener('DOMContentLoaded', function() {{            
                document.getElementById('{button_id}').addEventListener('click', function() {{                
                    const textArea = document.getElementById('{field_id}');
                    textArea.select();
                    document.execCommand('copy');
                    
                    // Show feedback
                    const button = document.getElementById('{button_id}');
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(function() {{ button.textContent = originalText; }}, 2000);
                }});
            }});
        </script>
        """
        
        # HTML for the textarea and button with wider container
        html = f"""
        <style>
            .field-generated_prompt_with_copy .form-row .field-box {{  
                width: 100% !important;
                flex: 0 0 100% !important;
                max-width: 100% !important;
            }}
            .field-generated_prompt_with_copy .form-row div.help {{  
                padding-left: 0 !important;
                width: 100% !important;
            }}
        </style>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <textarea id="{field_id}" style="width: 100%; height: 250px; font-family: monospace; min-width: 800px;" readonly>{obj.generated_prompt}</textarea>
            <button id="{button_id}" type="button" class="button" style="width: fit-content;">
                Copy to Clipboard
            </button>
        </div>
        {js}
        """
        
        return mark_safe(html)
    generated_prompt_with_copy.short_description = "Generated Prompt"
    
    def assign_to_me(self, request, queryset):
        """Admin action to assign selected AdRequestVersion objects to the logged-in user"""
        updated = 0
        for version in queryset:
            # Only update if not already assigned or if assigned to someone else
            if version.user_admin_assigned != request.user:
                version.user_admin_assigned = request.user
                # If status is UNASSIGNED, change it to ASSIGNED
                if version.status == AdRequestVersion.STATUS_UNASSIGNED:
                    version.status = AdRequestVersion.STATUS_ASSIGNED
                version.save()
                updated += 1
        
        if updated == 0:
            self.message_user(request, "No versions were assigned to you.")
        else:
            self.message_user(
                request, 
                f"{updated} version{'s' if updated > 1 else ''} successfully assigned to you."
            )
    assign_to_me.short_description = "Assign to me"

