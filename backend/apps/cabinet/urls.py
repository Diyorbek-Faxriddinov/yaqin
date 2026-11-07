from django.urls import path

from apps.cabinet import views

urlpatterns = [
    path("cabinet/invites/accept", views.InviteAcceptView.as_view()),
    path("cabinet/businesses", views.OwnedBusinessListView.as_view()),
    path("cabinet/businesses/<uuid:business_id>", views.OwnedBusinessView.as_view()),
    path("cabinet/businesses/<uuid:business_id>/membership", views.MembershipView.as_view()),
    path("cabinet/businesses/<uuid:business_id>/stats", views.OwnedBusinessStatsView.as_view()),
    path(
        "cabinet/businesses/<uuid:business_id>/tag-suggestions",
        views.OwnedTagSuggestionsView.as_view(),
    ),
    path("cabinet/businesses/<uuid:business_id>/uploads", views.UploadListView.as_view()),
    path(
        "cabinet/businesses/<uuid:business_id>/uploads/<uuid:upload_id>",
        views.UploadDetailView.as_view(),
    ),
    path("cabinet/businesses/<uuid:business_id>/changes", views.ChangeListView.as_view()),
    path(
        "cabinet/businesses/<uuid:business_id>/changes/<uuid:change_id>/withdraw",
        views.ChangeWithdrawView.as_view(),
    ),
]
