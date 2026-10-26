from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "apps.core"
    verbose_name = "Umumiy"

    def ready(self) -> None:
        from apps.core import checks  # noqa: F401 — tekshiruvlarni ro'yxatdan o'tkazish
