from django.urls import path
from . import views


app_name = "users"
urlpatterns = [
    path("profile/", views.profile, name="user_profile"),
    path("profile/upload-image/", views.upload_profile_image, name="upload_profile_image"),
    path("onboarding/", views.onboarding_view, name="onboarding"),
    path("api/advance-onboarding/", views.advance_onboarding_step, name="advance_onboarding"),
]
