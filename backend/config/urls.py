from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

# Barcha API manzillari kontraktdagi `servers: /api/v1` ostida
urlpatterns = [
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.businesses.urls")),
    path("api/v1/", include("apps.stats.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.community.urls")),
    path("api/v1/", include("apps.staff.urls")),
    path("api/v1/", include("apps.businesses.admin_urls")),
]

# Yuklangan rasmlar: ishlab chiqishda Django beradi; productionda — veb-server yoki S3-mos
# xotira (5-bosqich). static() DEBUG o'chiq bo'lsa hech narsa qo'shmaydi.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)  # type: ignore[arg-type]

handler404 = "apps.core.views.not_found"
handler500 = "apps.core.views.server_error"
