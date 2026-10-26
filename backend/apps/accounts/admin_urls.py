from django.urls import path

from apps.accounts import admin_views as views

urlpatterns = [
    path("admin/users", views.AdminUserListView.as_view()),
    path("admin/users/<uuid:user_id>", views.AdminUserDetailView.as_view()),
]
