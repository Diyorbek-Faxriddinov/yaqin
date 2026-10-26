from django.urls import path

from apps.staff import views

urlpatterns = [
    path("admin/auth/login", views.AdminLoginView.as_view()),
    path("admin/auth/setup", views.AdminSetupView.as_view()),
    path("admin/auth/2fa", views.AdminVerify2faView.as_view()),
    path("admin/auth/logout", views.AdminLogoutView.as_view()),
    path("admin/me", views.AdminMeView.as_view()),
]
