from django.urls import path

from apps.stats.views import EventView

urlpatterns = [path("events", EventView.as_view())]
