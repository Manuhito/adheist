from django.contrib import admin
from django.utils.html import format_html
from .models import TermsAndConditions, PrivacyPolicy
from django_summernote.admin import SummernoteModelAdmin


@admin.register(TermsAndConditions)
class TermsAndConditionsAdmin(SummernoteModelAdmin):
    list_display = ('__str__', 'created_at', 'updated_at', 'view_on_site_link')
    readonly_fields = ('created_at', 'updated_at')
    summernote_fields = ('content',)

    def view_on_site_link(self, obj):
        return format_html('<a href="/terms-of-service/" target="_blank">View on site</a>')
    view_on_site_link.short_description = "View"

    def has_add_permission(self, request):
        # Only allow adding if no instance exists
        return not TermsAndConditions.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of the last instance
        if obj is None:
            return False
        return TermsAndConditions.objects.count() > 1


@admin.register(PrivacyPolicy)
class PrivacyPolicyAdmin(SummernoteModelAdmin):
    list_display = ('__str__', 'created_at', 'updated_at', 'view_on_site_link')
    readonly_fields = ('created_at', 'updated_at')
    summernote_fields = ('content',)

    def view_on_site_link(self, obj):
        return format_html('<a href="/privacy-policy/" target="_blank">View on site</a>')
    view_on_site_link.short_description = "View"

    def has_add_permission(self, request):
        # Only allow adding if no instance exists
        return not PrivacyPolicy.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of the last instance
        if obj is None:
            return False
        return PrivacyPolicy.objects.count() > 1
