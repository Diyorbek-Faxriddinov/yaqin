from django.urls import path

from apps.staff import admin_views, views

urlpatterns = [
    path("admin/auth/login", views.AdminLoginView.as_view()),
    path("admin/auth/setup", views.AdminSetupView.as_view()),
    path("admin/auth/2fa", views.AdminVerify2faView.as_view()),
    path("admin/auth/logout", views.AdminLogoutView.as_view()),
    path("admin/me", views.AdminMeView.as_view()),
    path("admin/staff", admin_views.AdminStaffListView.as_view()),
    path("admin/staff/<uuid:admin_id>", admin_views.AdminStaffDetailView.as_view()),
    path(
        "admin/staff/<uuid:admin_id>/reset-password",
        admin_views.AdminStaffResetPasswordView.as_view(),
    ),
    path("admin/roles", admin_views.AdminRoleListView.as_view()),
    path("admin/roles/<uuid:role_id>", admin_views.AdminRoleDetailView.as_view()),
    path("admin/audit", admin_views.AdminAuditListView.as_view()),
]
