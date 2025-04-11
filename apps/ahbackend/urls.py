from django.urls import path

from . import views

app_name = "ahbackend"

urlpatterns = [
    path("", views.home, name="ahbackend_home"),
    path("adlibrary/", views.adlibrary_list, name="adlibrary_list"),
    path("adlibrary/<int:pk>/", views.adlibrary_detail, name="adlibrary_detail"),
    path("adlibrary/create/", views.adlibrary_create, name="adlibrary_create"),
    path("adlibrary/<int:pk>/update/", views.adlibrary_update, name="adlibrary_update"),
    path("adlibrary/<int:pk>/delete/", views.adlibrary_delete, name="adlibrary_delete"),
    path("adrequest/create/", views.adrequest_create, name="adrequest_create"),
    path("adrequest/<int:pk>/", views.adrequest_detail, name="adrequest_detail"),
]
