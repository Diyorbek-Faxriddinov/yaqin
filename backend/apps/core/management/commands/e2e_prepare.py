"""E2E testlar uchun bazani noldan tayyorlash (frontend `npm run e2e:backend` chaqiradi):

    DATABASE_NAME=yaqin_e2e python manage.py e2e_prepare

Baza o'chirilib qayta yaratiladi, migratsiyalar va demo maʼlumotlar (E2E administratorlari bilan)
yuklanadi. Himoya: faqat `DEBUG` rejimida va faqat nomi `_e2e` bilan tugaydigan bazada — ish
bazasini tasodifan o'chirib bo'lmaydi.
"""

from typing import Any

import psycopg
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from psycopg import sql


class Command(BaseCommand):
    help = "E2E bazasini o'chirib, qayta yaratadi va demo maʼlumot yuklaydi"

    def handle(self, *args: Any, **options: Any) -> None:
        db = settings.DATABASES["default"]
        name = str(db["NAME"])
        if not settings.DEBUG or not name.endswith("_e2e"):
            raise CommandError("Faqat DEBUG rejimida va nomi _e2e bilan tugaydigan bazada")

        connections.close_all()
        with psycopg.connect(
            host=str(db["HOST"]),
            port=str(db["PORT"]),
            user=str(db["USER"]),
            password=str(db["PASSWORD"]),
            dbname="postgres",
            autocommit=True,
        ) as conn:
            drop = sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)")
            conn.execute(drop.format(sql.Identifier(name)))
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
        self.stdout.write(f"Baza qayta yaratildi: {name}")

        call_command("migrate", verbosity=0)
        call_command("seed_demo", e2e_admins=True, stdout=self.stdout)
