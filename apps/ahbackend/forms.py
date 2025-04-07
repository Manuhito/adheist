from django import forms

from .models import AdLibrary, IndustryList, TagList


class AdLibraryForm(forms.ModelForm):
    class Meta:
        model = AdLibrary
        fields = ["company_name", "industry", "tag"]
