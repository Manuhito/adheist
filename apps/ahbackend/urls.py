from django.urls import path

from . import views

app_name = "ahbackend"

urlpatterns = [
    path("", views.home, name="ahbackend_home"),
    path("adrequest/create/", views.adrequest_create, name="adrequest_create"),
    path("adrequest/<int:pk>/", views.adrequest_detail, name="adrequest_detail"),
    path("adrequest/version/create/", views.adrequest_version_create, name="adrequest_version_create"),
]
