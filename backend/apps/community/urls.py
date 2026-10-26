from django.urls import path

from apps.community import views

urlpatterns = [
    path("me/favorites", views.FavoritesView.as_view()),
    path("me/favorites/ids", views.FavoriteIdsView.as_view()),
    path("me/favorites/<uuid:business_id>", views.FavoriteView.as_view()),
    path("me/reviews", views.MyReviewsView.as_view()),
    path("me/reviews/<uuid:review_id>", views.MyReviewView.as_view()),
    path("complaints", views.ComplaintCreateView.as_view()),
    path("me/complaints", views.MyComplaintsView.as_view()),
]
