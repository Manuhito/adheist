"""
Admin configuration for the scraper app.
"""
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html

from .models import FacebookAdsScraper


@admin.register(FacebookAdsScraper)
class FacebookAdsScraperAdmin(admin.ModelAdmin):
    """
    Admin for FacebookAdsScraper.
    
    Provides interface to configure and run Facebook Ads Library scrapers.
    """
    
    list_display = ('name', 'active', 'page_count', 'last_run_status', 'last_run_time')
    list_filter = ('active', 'last_run_status', 'ad_type', 'active_status')
    search_fields = ('name',)
    readonly_fields = ('last_run_status', 'last_run_time', 'last_run_error', 'run_now_button')
    filter_horizontal = ('pages',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'active')
        }),
        (_('Facebook Pages'), {
            'fields': ('pages',)
        }),
        (_('Ad Parameters'), {
            'fields': ('ad_type', 'active_status')
        }),
        (_('Last Run Information'), {
            'fields': ('last_run_status', 'last_run_time', 'last_run_error', 'run_now_button')
        }),
    )
    actions = ['run_now']
    
    def page_count(self, obj):
        """Return the number of pages."""
        count = obj.pages.count()
        return count
    
    page_count.short_description = _("Pages")
    
    def run_now_button(self, obj):
        """Return a button to run this scraper."""
        if obj.pk:
            # Implementación más simple y directa
            return format_html(
                '<button type="button" class="button" '
                'onclick="if(confirm(\'¿Estás seguro de que quieres ejecutar este scraper?\')) {{ '
                '  var form = document.createElement(\'form\'); '
                '  form.method = \'post\'; '
                '  form.action = window.location.pathname; '
                '  var input1 = document.createElement(\'input\'); '
                '  input1.type = \'hidden\'; '
                '  input1.name = \'action\'; '
                '  input1.value = \'run_now\'; '
                '  form.appendChild(input1); '
                '  var input2 = document.createElement(\'input\'); '
                '  input2.type = \'hidden\'; '
                '  input2.name = \'_selected_action\'; '
                '  input2.value = \'{}\'; '
                '  form.appendChild(input2); '
                '  var csrf = document.querySelector(\'[name=csrfmiddlewaretoken]\'); '
                '  if (csrf) {{ '
                '    var input3 = document.createElement(\'input\'); '
                '    input3.type = \'hidden\'; '
                '    input3.name = \'csrfmiddlewaretoken\'; '
                '    input3.value = csrf.value; '
                '    form.appendChild(input3); '
                '  }} '
                '  document.body.appendChild(form); '
                '  form.submit(); '
                '}}">' 
                '<i class="fa fa-play"></i> {}</button>',
                obj.pk, _('Run Now')
            )
        return "-"
    
    run_now_button.short_description = _("Manual Execution")
    run_now_button.allow_tags = True
    
    def run_now(self, request, queryset):
        """Run the selected scrapers now."""
        count = 0
        for scraper in queryset.filter(active=True):
            scraper.run()
            count += 1
        
        if count == 1:
            message = _("1 scraper was scheduled to run")
        else:
            message = _("{} scrapers were scheduled to run").format(count)
        
        self.message_user(request, message)
    
    run_now.short_description = _("Run selected scrapers now")
