from django.urls import path

from . import views, api

app_name = "aiinterface"

urlpatterns = [
    
    # API endpoints
    path("api/generate-image/", api.generate_image, name="api_generate_image"),
]
