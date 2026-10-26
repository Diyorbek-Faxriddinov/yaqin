from django.db import DatabaseError, connection
from django.http import HttpRequest, JsonResponse
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Serverni kuzatish (deploy, monitoring): ilova va maʼlumotlar bazasi javob beradimi.

    Ichki tafsilotlar (versiyalar, xato matni) qaytarilmaydi.
    """

    def get(self, request: Request) -> Response:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            database = "ok"
        except DatabaseError:
            database = "error"
        healthy = database == "ok"
        return Response(
            {"status": "ok" if healthy else "error", "database": database},
            status=200 if healthy else 503,
        )


# DRF'dan tashqaridagi xatolar ham kontraktdagi Error formatida (HTML sahifa emas)
def not_found(request: HttpRequest, exception: Exception) -> JsonResponse:
    return JsonResponse({"code": "not_found", "message": "Topilmadi"}, status=404)


def server_error(request: HttpRequest) -> JsonResponse:
    return JsonResponse(
        {"code": "server_error", "message": "Serverda xatolik. Keyinroq qayta urinib koʻring."},
        status=500,
    )
