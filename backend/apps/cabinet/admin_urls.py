from django.urls import path

from apps.cabinet import admin_views as views

urlpatterns = [
    path("admin/businesses/<uuid:business_id>/owners", views.AdminOwnersView.as_view()),
    path("admin/businesses/<uuid:business_id>/owner-invite", views.AdminOwnerInviteView.as_view()),
    path(
        "admin/businesses/<uuid:business_id>/owners/<uuid:membership_id>",
        views.AdminOwnerDetailView.as_view(),
    ),
    path("admin/changes", views.AdminChangeListView.as_view()),
    path("admin/changes/<uuid:change_id>", views.AdminChangeDetailView.as_view()),
    path("admin/changes/<uuid:change_id>/approve", views.AdminChangeApproveView.as_view()),
    path("admin/changes/<uuid:change_id>/reject", views.AdminChangeRejectView.as_view()),
    path(
        "admin/changes/<uuid:change_id>/uploads/<uuid:upload_id>",
        views.AdminChangeUploadView.as_view(),
    ),
]
