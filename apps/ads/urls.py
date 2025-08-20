from django.urls import path
from . import views
from . import sse

app_name = "ads"

urlpatterns = [
    path("", views.home, name="ads_home"),
    path("adrequest/create/", views.adrequest_create, name="adrequest_create"),
    # Split adrequest_detail into separate GET and POST endpoints
    path("adrequest/<int:pk>/get/", views.adrequest_get, name="adrequest_get"),
    path("adrequest/<int:pk>/update/", views.adrequest_update, name="adrequest_update"),
    path("adrequest/<int:pk>/delete/", views.adrequest_delete, name="adrequest_delete"),
    path("adrequest/version/create/", views.adrequest_version_create, name="adrequest_version_create"),
    path("adrequest/revision/create/", views.adrequest_revision_create, name="adrequest_revision_create"),
    path("my-requests/", views.user_ad_requests, name="user_ad_requests"),
    path("industries/", views.get_all_industries, name="get_all_industries"),
    path("tags/", views.get_all_tags, name="get_all_tags"),
    path("adlibraries/", views.get_adlibrary_filters, name="get_adlibrary_filters"),
    path("adlibraries/<int:adlibrary_id>/", views.get_adlibrary_by_id, name="get_adlibrary_by_id"),
    path("companies/", views.get_adlibrary_company_list, name="get_adlibrary_company_list"),
    path("create/", views.create_adrequest_page, name="create_adrequest_page"),
    path("create/<int:adrequest_id>/", views.create_adrequest_page, name="create_adrequest_page_with_id"),
    path("<int:adrequest_id>/details/", views.adrequest_details_page, name="adrequest_details_page"),
    path("billing/", views.billing_page, name="billing_page"),
    path("create-payment-intent/", views.create_payment_intent, name="create_payment_intent"),
    path("payment/", views.payment_page, name="payment_page"),
    path("payment-success/", views.payment_success, name="payment_success"),
    path("api/invoices/", views.get_user_invoices, name="get_user_invoices"),
    path("sse/adrequest-updates/", sse.sse_adrequest_updates, name="sse_adrequest_updates"),
    path("proxy-image/", views.proxy_image_download, name="proxy_image_download"),
    path("api/toggle-favorite/", views.toggle_favorite, name="toggle_favorite"),
    path("api/deactivate-image/", views.deactivate_image, name="deactivate_image"),
    path("api/request-brand/", views.request_brand, name="request_brand"),
    path("api/user-brands/", views.get_user_brands, name="get_user_brands"),
    path("api/create-user-brand/", views.create_user_brand, name="create_user_brand"),
    path("api/version/rate/", views.adrequest_version_rate, name="adrequest_version_rate"),
    path("user-images/", views.user_images, name="user_images"),
]
