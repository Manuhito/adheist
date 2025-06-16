from django import forms

from .models import AdLibrary, IndustryList, TagList


class AdLibraryForm(forms.ModelForm):
    class Meta:
        model = AdLibrary
        fields = ["facebook_page", "industries", "tags"]
