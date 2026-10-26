from django.urls import include, path

# Barcha API manzillari kontraktdagi `servers: /api/v1` ostida
urlpatterns = [
    path("api/v1/", include("apps.core.urls")),
]

handler404 = "apps.core.views.not_found"
handler500 = "apps.core.views.server_error"
