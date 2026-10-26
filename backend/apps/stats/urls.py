from django.urls import path

from apps.stats import admin_views
from apps.stats.views import EventView, ReportView

urlpatterns = [
    path("events", EventView.as_view()),
    path("reports/<str:token>", ReportView.as_view()),
    path("admin/stats", admin_views.AdminStatsView.as_view()),
    path("admin/businesses/<uuid:business_id>/stats", admin_views.AdminBusinessStatsView.as_view()),
    path(
        "admin/businesses/<uuid:business_id>/report-link",
        admin_views.AdminReportLinkView.as_view(),
    ),
]
