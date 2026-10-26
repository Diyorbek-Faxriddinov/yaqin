from django.urls import path

from apps.catalog.views import CategoryDetailView, CategoryTreeView, DistrictListView

urlpatterns = [
    path("categories", CategoryTreeView.as_view()),
    path("categories/<slug:slug>", CategoryDetailView.as_view()),
    path("districts", DistrictListView.as_view()),
]
