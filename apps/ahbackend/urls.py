from django.urls import path

from . import views

app_name = "ahbackend"

urlpatterns = [
    path("", views.home, name="ahbackend_home"),
    path("adrequest/create/", views.adrequest_create, name="adrequest_create"),
    path("adrequest/<int:pk>/", views.adrequest_detail, name="adrequest_detail"),
    path("adrequest/version/create/", views.adrequest_version_create, name="adrequest_version_create"),
    path("industries/", views.get_all_industries, name="get_all_industries"),
    path("tags/", views.get_all_tags, name="get_all_tags"),
    path("adlibraries/", views.get_adlibrary_filters, name="get_adlibrary_filters"),
    path("companies/", views.get_adlibrary_company_list, name="get_adlibrary_company_list"),
]
