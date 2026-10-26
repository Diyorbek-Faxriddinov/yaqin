from django.urls import path

from apps.community import admin_views as views

urlpatterns = [
    path("admin/reviews", views.AdminReviewListView.as_view()),
    path("admin/reviews/<uuid:review_id>", views.AdminReviewDetailView.as_view()),
    path("admin/complaints", views.AdminComplaintListView.as_view()),
    path("admin/complaints/<uuid:complaint_id>", views.AdminComplaintDetailView.as_view()),
]
