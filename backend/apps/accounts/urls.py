from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("auth/telegram", views.TelegramLoginView.as_view()),
    path("auth/google", views.GoogleLoginView.as_view()),
    path("auth/demo", views.DemoLoginView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("me", views.MeView.as_view()),
]
