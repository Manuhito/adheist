from django.urls import path

from . import api

app_name = "aiinterface"

urlpatterns = [
    
    # API endpoints
    path("api/generate-image/", api.generate_image, name="api_generate_image"),
    path("api/test-openai-connection/", api.test_openai_connection, name="test_openai_connection"),
]
