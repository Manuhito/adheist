from django import forms

from .models import AdLibrary


class AdLibraryForm(forms.ModelForm):
    class Meta:
        model = AdLibrary
        fields = ["name"]
