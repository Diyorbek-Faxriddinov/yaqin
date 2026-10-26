"""Root administratorni yaratish — tizimdagi yagona Root (ADR-0009).

    python manage.py createroot --username root --display-name "Bosh administrator"
    echo "parol" | python manage.py createroot --username root --display-name "..." --password-stdin

Parol buyruq argumenti sifatida qabul qilinmaydi (shell tarixida qolmasin). Birinchi kirishda
TOTP (2FA) sozlanadi.
"""

import re
import sys
from getpass import getpass
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from apps.staff.audit import audit
from apps.staff.models import USERNAME_PATTERN, AdminUser, AuditEntry
from apps.staff.passwords import hash_password, password_problems


class Command(BaseCommand):
    help = "Root administratorni yaratadi (agar hali yo'q bo'lsa)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--username", required=True)
        parser.add_argument("--display-name", required=True)
        parser.add_argument(
            "--password-stdin", action="store_true", help="Parolni standart kirishdan o'qish"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if AdminUser.objects.filter(is_root=True).exists():
            raise CommandError("Root allaqachon mavjud. Ikkinchi Root yaratib bo'lmaydi.")

        username = str(options["username"]).strip().lower()
        if not re.fullmatch(USERNAME_PATTERN, username):
            raise CommandError(
                "Login: 3–32 belgi, kichik lotin harfi bilan boshlanadi (a-z 0-9 _ . -)"
            )
        if AdminUser.objects.filter(username=username).exists():
            raise CommandError("Bu login band")
        display_name = str(options["display_name"]).strip()
        if not 2 <= len(display_name) <= 60:
            raise CommandError("Ism 2–60 belgi bo'lishi kerak")

        if options["password_stdin"]:
            password = sys.stdin.readline().rstrip("\r\n")
        else:
            password = getpass("Parol: ")
            if getpass("Parol (takror): ") != password:
                raise CommandError("Parollar mos kelmadi")

        admin = AdminUser(username=username, display_name=display_name, is_root=True)
        problems = password_problems(password, admin)
        if problems:
            raise CommandError("; ".join(problems))

        admin.password_hash = hash_password(password)
        # Parolni o'zi tanladi — almashtirish shart emas; TOTP birinchi kirishda sozlanadi
        admin.must_change_password = False
        with transaction.atomic():
            admin.save()
            audit(
                None,
                "admin.create_root",
                AuditEntry.TargetType.ADMIN,
                admin.id,
                f"Root yaratildi: {username}",
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Root yaratildi: {username}. Birinchi kirishda 2FA (TOTP) sozlanadi."
            )
        )
