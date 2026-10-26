from django.urls import path

from apps.catalog import admin_views as views

urlpatterns = [
    path("admin/categories", views.AdminCategoryListView.as_view()),
    path("admin/categories/<uuid:category_id>", views.AdminCategoryDetailView.as_view()),
    path(
        "admin/categories/<uuid:category_id>/attributes",
        views.AdminCategoryAttributesView.as_view(),
    ),
]
