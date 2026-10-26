"""⚠ Demo maʼlumotlarni bazaga yuklash — FAQAT ishlab chiqish va E2E testlar uchun (`DEBUG`).

    python manage.py seed_demo              # demo bizneslar, katalog, sharhlar, navbatlar
    python manage.py seed_demo --reset      # avval eski demo yozuvlarni o'chirib, qayta yuklaydi
    python manage.py seed_demo --remove     # demo yozuvlarni o'chiradi (qayta yuklamaydi)
    python manage.py seed_demo --e2e-admins # + E2E testlar uchun demo administratorlar

Maʼlumot manbai — `demo/demo-data.json` (frontend mock fixture'laridan eksport:
`cd frontend && npx jiti scripts/export-demo-data.ts`) — mock va backend bir xil maʼlumot beradi.
Barcha yozuvlar to'qib chiqarilgan: bizneslar tavsifida "demo maʼlumot", telefonlar mavjud
bo'lmagan "00" kodida, mijozlar `provider=demo`. Demo yozuvlar qat'iy ID'lar bilan — `--reset`
faqat ularni o'chiradi, boshqa maʼlumotlarga tegmaydi.
"""

import json
import math
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from django.utils.dateparse import parse_datetime

from apps.accounts.models import User
from apps.businesses.models import Business, BusinessRequest, Item
from apps.catalog.models import Category, District
from apps.community.models import Complaint, Review
from apps.staff import totp
from apps.staff.models import AdminUser, Role
from apps.staff.passwords import hash_password
from apps.stats.models import DailyStats
from apps.stats.series import today

DATA_FILE = settings.BASE_DIR / "demo" / "demo-data.json"
AUTHOR_NAMESPACE = uuid.UUID("6f1c2a52-8f3e-4d8e-9a57-2f0c2e7b9d10")
STATS_DAYS = 90

# ⚠ E2E testlar uchun demo administratorlar (mock'dagi bilan bir xil login va parol). TOTP kalitlari
# ochiq — frontend/e2e/support/admin.ts ham shularni ishlatadi. Productionda bu buyruq ishlamaydi.
E2E_PASSWORD = "yaqin-demo"  # noqa: S105 — ochiq demo parol (mock bilan bir xil), faqat DEBUG
E2E_ADMINS = {
    "root": {"secret": "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", "display_name": "Root (demo)"},
    "moderator": {"secret": "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU", "display_name": "Moderator (demo)"},
}


def when(value: str) -> Any:
    return parse_datetime(value)


def author_id(name: str, occurrence: int) -> uuid.UUID:
    return uuid.uuid5(AUTHOR_NAMESPACE, f"{name}:{occurrence}")


class Command(BaseCommand):
    help = "⚠ Demo maʼlumotlarni yuklaydi (faqat DEBUG)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--reset", action="store_true", help="Eski demo yozuvlarni o'chirish")
        parser.add_argument("--remove", action="store_true", help="Faqat o'chirish")
        parser.add_argument(
            "--e2e-admins", action="store_true", help="E2E uchun demo administratorlar"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("seed_demo faqat DEBUG rejimida — productionda demo maʼlumot yo'q")
        data = json.loads(Path(DATA_FILE).read_text(encoding="utf-8"))
        if options["remove"]:
            with transaction.atomic():
                self.reset(data)
            self.stdout.write(self.style.SUCCESS("Demo maʼlumotlar oʻchirildi"))
            return
        with transaction.atomic():
            if options["reset"]:
                self.reset(data)
            elif Business.objects.filter(id__in=[b["id"] for b in data["businesses"]]).exists():
                raise CommandError("Demo maʼlumotlar allaqachon bor — qayta yuklash: --reset")
            self.seed_category_attributes(data)
            users = self.seed_users(data)
            self.seed_businesses(data, users)
            self.seed_queues(data)
            if options["e2e_admins"]:
                self.seed_admins()
        self.stdout.write(
            self.style.SUCCESS(f"Demo maʼlumotlar yuklandi: {len(data['businesses'])} ta biznes")
        )

    def reset(self, data: dict[str, Any]) -> None:
        # Biznes bilan birga: mahsulotlar, rasmlar, sharhlar, shikoyatlar, sevimlilar, statistika
        Business.objects.filter(id__in=[b["id"] for b in data["businesses"]]).delete()
        BusinessRequest.objects.filter(id__in=[r["id"] for r in data["requests"]]).delete()
        User.objects.filter(provider=User.Provider.DEMO, provider_uid__startswith="seed-").delete()

    def seed_category_attributes(self, data: dict[str, Any]) -> None:
        """Demo atributlar faqat atributsiz kategoriyalarga — admin kiritganlariga tegilmaydi."""
        for slug, attributes in data["categoryAttributes"].items():
            Category.objects.filter(slug=slug, attributes=[]).update(attributes=attributes)

    def seed_users(self, data: dict[str, Any]) -> dict[str, User]:
        users: dict[str, User] = {}
        for row in data["users"]:
            user = User(
                id=row["id"],
                provider=User.Provider.DEMO,
                provider_uid=f"seed-user-{row['id']}",
                display_name=row["displayName"],
            )
            users[row["id"]] = user
        User.objects.bulk_create(users.values())
        for row in data["users"]:
            User.objects.filter(pk=row["id"]).update(created_at=when(row["createdAt"]))
        return users

    def seed_businesses(self, data: dict[str, Any], users: dict[str, User]) -> None:
        categories = {c.slug: c for c in Category.objects.all()}
        districts = {d.slug: d for d in District.objects.all()}
        authors: dict[uuid.UUID, User] = {}
        reviews: list[Review] = []
        items: list[Item] = []
        stats: list[DailyStats] = []
        created: dict[str, Any] = {}

        for row in data["businesses"]:
            rating = row["rating"]
            business = Business(
                id=row["id"],
                slug=row["slug"],
                name=row["name"],
                description=row["description"] or "",
                category=categories[row["categorySlug"]],
                district=districts[row["districtSlug"]],
                address_text=row["address"]["text"],
                address_landmark=row["address"]["landmark"] or "",
                location=Point(row["location"]["lng"], row["location"]["lat"], srid=4326),
                phones=row["phones"],
                schedule=row["schedule"],
                status=Business.Status.PUBLISHED,
                published_at=when(row["createdAt"]),
                consent_given_by="Demo egasi",
                consent_given_at=when(row["createdAt"]),
                is_verified=row["isVerified"],
                # Reyting — mock'dagi kabi fixture qiymati (kartalar ikkala rejimda bir xil)
                rating_count=rating["count"],
                rating_sum=round((rating["average"] or 0) * rating["count"]),
            )
            business.search_text = business.build_search_text()
            created[row["id"]] = (business, row["createdAt"])

            for position, entry in enumerate(row["items"]):
                price = entry["price"]
                items.append(
                    Item(
                        id=entry["id"],
                        business=business,
                        slug=entry["slug"],
                        kind=entry["kind"],
                        name=entry["name"],
                        group=entry["group"] or "",
                        description=entry["description"] or "",
                        price_type=price["type"],
                        price_min=price["min"]["amount"] if price["min"] else None,
                        price_max=price["max"]["amount"] if price["max"] else None,
                        duration_minutes=entry["durationMinutes"],
                        attributes=entry["attributes"],
                        is_available=entry["isAvailable"],
                        position=position,
                    )
                )

            seen: dict[str, int] = {}
            for entry in row["reviews"]:
                # Bir foydalanuvchi bir biznesga bitta sharh — muallif ismi bo'yicha "hovuz"
                name = entry["authorName"]
                occurrence = seen.get(name, 0)
                seen[name] = occurrence + 1
                key = author_id(name, occurrence)
                if key not in authors:
                    authors[key] = User(
                        id=key,
                        provider=User.Provider.DEMO,
                        provider_uid=f"seed-author-{key}",
                        display_name=name,
                    )
                reply = entry["reply"]
                reviews.append(
                    Review(
                        id=entry["id"],
                        business=business,
                        user=authors[key],
                        rating=entry["rating"],
                        text=entry["text"] or "",
                        status=Review.Status.PUBLISHED,
                        created_at=when(entry["createdAt"]),
                        moderated_at=when(entry["createdAt"]),
                        reply_text=reply["text"] if reply else "",
                        reply_at=when(reply["createdAt"]) if reply else None,
                    )
                )
            stats.extend(self.daily_stats(business, rating["count"]))

        User.objects.bulk_create(authors.values())
        Business.objects.bulk_create(business for business, _ in created.values())
        Item.objects.bulk_create(items)
        Review.objects.bulk_create(reviews, batch_size=500)
        DailyStats.objects.bulk_create(stats, batch_size=1000)
        # auto_now_add yaratishda qiymatni almashtiradi — sanalar alohida yoziladi
        for business, created_at in created.values():
            business.created_at = business.updated_at = when(created_at)
        Business.objects.bulk_update(
            [b for b, _ in created.values()], ["created_at", "updated_at"], batch_size=200
        )
        Review.objects.bulk_update(reviews, ["created_at"], batch_size=500)

    def daily_stats(self, business: Business, popularity: int) -> list[DailyStats]:
        """Grafiklar bo'sh bo'lmasligi uchun deterministik namunaviy hodisalar (oxirgi 90 kun)."""
        base = math.log2(popularity + 4)
        end = today()
        rows = []
        for offset in range(STATS_DAYS):
            day = end - timedelta(days=offset)
            seed = uuid.uuid5(AUTHOR_NAMESPACE, f"stats:{business.id}:{day}").int
            noise = (seed % 1000) / 1000
            weekend = 1.3 if day.isoweekday() >= 6 else 1
            views = round((base * 2 + noise * base * 4) * weekend)
            rows.append(
                DailyStats(
                    business=business,
                    date=day,
                    profile_views=views,
                    calls=round(views * (0.06 + noise * 0.1)),
                    telegram_clicks=round(views * noise * 0.04),
                    direction_clicks=round(views * (0.05 + noise * 0.08)),
                )
            )
        return rows

    def seed_queues(self, data: dict[str, Any]) -> None:
        """Moderatsiya navbati, shikoyatlar va so'rovlar (admin panel bo'sh bo'lmasligi uchun)."""
        reviews = [
            Review(
                id=row["id"],
                business_id=row["businessId"],
                user_id=row["userId"],
                rating=row["rating"],
                text=row["text"] or "",
                status=row["status"],
                rejection_reason=row["rejectionReason"] or "",
                created_at=when(row["createdAt"]),
                moderated_at=when(row["moderatedAt"]) if row["moderatedAt"] else None,
            )
            for row in data["moderationReviews"]
        ]
        Review.objects.bulk_create(reviews)
        Review.objects.bulk_update(reviews, ["created_at"])
        complaints = [
            Complaint(
                id=row["id"],
                business_id=row["businessId"],
                user_id=row["userId"],
                reason=row["reason"],
                text=row["text"] or "",
                status=row["status"],
                resolution_note=row["resolutionNote"] or "",
            )
            for row in data["complaints"]
        ]
        Complaint.objects.bulk_create(complaints)
        for row in data["complaints"]:
            Complaint.objects.filter(pk=row["id"]).update(
                created_at=when(row["createdAt"]), updated_at=when(row["updatedAt"])
            )
        districts = {d.slug: d for d in District.objects.all()}
        for row in data["requests"]:
            BusinessRequest.objects.create(
                id=row["id"],
                business_name=row["businessName"],
                activity=row["activity"] or "",
                district=districts.get(row["districtSlug"] or ""),
                address=row["address"] or "",
                contact_name=row["contactName"],
                phone=row["phone"],
                note=row["note"] or "",
                status=row["status"],
                admin_note=row["adminNote"] or "",
            )
            BusinessRequest.objects.filter(pk=row["id"]).update(created_at=when(row["createdAt"]))

    def seed_admins(self) -> None:
        root = AdminUser.objects.filter(is_root=True).first()
        if root is not None and root.username != "root":
            raise CommandError(
                "Bazada boshqa Root bor — E2E administratorlari faqat alohida (E2E) bazada"
            )
        moderator_role = Role.objects.get(name="Moderator")
        for username, spec in E2E_ADMINS.items():
            admin, _ = AdminUser.objects.update_or_create(
                username=username,
                defaults={
                    "display_name": spec["display_name"],
                    # Demo parol (mock bilan bir xil) — murakkablik qoidalaridan o'tmaydi, ataylab
                    "password_hash": hash_password(E2E_PASSWORD),
                    "is_root": username == "root",
                    "is_active": True,
                    "must_change_password": False,
                    "totp_secret": totp.encrypt(spec["secret"]),
                    "totp_last_step": None,
                    "extra_permissions": [] if username == "root" else ["business.view"],
                },
            )
            if username == "moderator":
                admin.roles.set([moderator_role])
