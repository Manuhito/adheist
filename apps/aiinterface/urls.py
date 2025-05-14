from django.urls import path

from . import api

app_name = "aiinterface"

urlpatterns = [
    
    # API endpoints
    path("api/generate-image/", api.generate_image, name="api_generate_image"),
    path("api/test-openai-connection/", api.test_openai_connection, name="test_openai_connection"),
    path("api/task-status/<str:task_id>/", api.get_task_status, name="api_task_status"),
]
