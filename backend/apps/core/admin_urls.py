from django.urls import path

from apps.core import admin_views as views

urlpatterns = [path("admin/settings", views.AdminSettingsView.as_view())]
