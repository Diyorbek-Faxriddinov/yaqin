from django.urls import path

from apps.businesses import views

urlpatterns = [
    path("businesses", views.BusinessListView.as_view()),
    path("businesses/<slug:slug>", views.BusinessDetailView.as_view()),
    path("businesses/<slug:slug>/items", views.BusinessItemsView.as_view()),
    path("businesses/<slug:slug>/items/<slug:item_slug>", views.BusinessItemView.as_view()),
    path("businesses/<slug:slug>/reviews", views.BusinessReviewsView.as_view()),
    path("map/markers", views.MapMarkersView.as_view()),
    path("search/suggest", views.SuggestView.as_view()),
    path("business-requests", views.BusinessRequestCreateView.as_view()),
]
