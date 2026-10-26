from django.urls import path

from apps.core.views import HealthView, PublicSettingsView

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("settings", PublicSettingsView.as_view()),
]
