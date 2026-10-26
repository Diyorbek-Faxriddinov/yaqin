from django.urls import path

from apps.businesses import admin_views as views

urlpatterns = [
    path("admin/businesses", views.AdminBusinessListView.as_view()),
    path("admin/businesses/<uuid:business_id>", views.AdminBusinessDetailView.as_view()),
    path("admin/businesses/<uuid:business_id>/photos", views.AdminPhotoUploadView.as_view()),
    path("admin/businesses/<uuid:business_id>/photos/order", views.AdminPhotoOrderView.as_view()),
    path(
        "admin/businesses/<uuid:business_id>/photos/<uuid:photo_id>",
        views.AdminPhotoDetailView.as_view(),
    ),
    path("admin/businesses/<uuid:business_id>/items", views.AdminItemListView.as_view()),
    path(
        "admin/businesses/<uuid:business_id>/items/<uuid:item_id>",
        views.AdminItemDetailView.as_view(),
    ),
    path("admin/business-requests", views.AdminRequestListView.as_view()),
    path("admin/business-requests/<uuid:request_id>", views.AdminRequestDetailView.as_view()),
    path(
        "admin/business-requests/<uuid:request_id>/convert",
        views.AdminRequestConvertView.as_view(),
    ),
]
