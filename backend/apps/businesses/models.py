from django.contrib.gis.db import models as gis
from django.contrib.postgres.indexes import GinIndex, OpClass
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q

from apps.catalog.models import Category, District
from apps.core.models import TimestampedModel, UUIDModel
from apps.core.schedule import validate_schedule
from apps.core.text import normalize_for_search


class Business(TimestampedModel):
    """Platforma boshqaruvidagi biznes (ADR-0007): admin joyida, egasi roziligi bilan kiritadi."""

    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        HIDDEN = "hidden"

    slug = models.SlugField(max_length=140, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(max_length=2000, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="businesses")
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name="businesses")
    address_text = models.CharField(max_length=300, blank=True)
    address_landmark = models.CharField(max_length=200, blank=True)
    location = gis.PointField(geography=True, srid=4326, null=True, blank=True)
    # [{"number": "+998901234567", "label": null}] — E.164, ko'pi bilan 5 ta (API tekshiradi)
    phones = models.JSONField(default=list, blank=True)
    telegram = models.CharField(max_length=32, blank=True)
    instagram = models.CharField(max_length=30, blank=True)
    website = models.URLField(max_length=300, blank=True)
    # Kontraktdagi WeeklySchedule; null — ish vaqti nomaʼlum
    schedule = models.JSONField(null=True, blank=True, validators=[validate_schedule])
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    # Egasining roziligi: kim, qachon, izoh (ADR-0007). givenAt bo'lsa — rozilik bor
    consent_given_by = models.CharField(max_length=100, blank=True)
    consent_given_at = models.DateTimeField(null=True, blank=True)
    consent_note = models.CharField(max_length=500, blank=True)
    is_verified = models.BooleanField(default=True, help_text="Platforma joyida tekshirgan")
    # Reyting — chop etilgan sharhlardan (moderatsiyada yangilanadi); o'rtacha = sum / count
    rating_count = models.PositiveIntegerField(default=0)
    rating_sum = models.PositiveIntegerField(default=0)
    # Qidiruv: nom, kategoriya (ikki tilda, ota-kategoriya bilan), tuman — normallashtirilgan
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        indexes = [
            models.Index(fields=["status", "category"], name="business_status_category"),
            models.Index(fields=["status", "district"], name="business_status_district"),
            GinIndex(OpClass(F("search_text"), name="gin_trgm_ops"), name="business_search_trgm"),
        ]
        constraints = [
            # E'lon qilingan biznesda joylashuv, manzil va rozilik majburiy —
            # API'ni chetlab o'tganda ham buzilmaydi
            models.CheckConstraint(
                condition=~Q(status="published")
                | (
                    Q(location__isnull=False)
                    & ~Q(address_text="")
                    & Q(consent_given_at__isnull=False)
                ),
                name="business_published_requirements",
            ),
            models.CheckConstraint(
                condition=Q(consent_given_at__isnull=True) | ~Q(consent_given_by=""),
                name="business_consent_has_author",
            ),
            models.CheckConstraint(
                condition=Q(rating_sum__gte=F("rating_count"))
                & Q(rating_sum__lte=F("rating_count") * 5),
                name="business_rating_sum_range",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def has_consent(self) -> bool:
        return self.consent_given_at is not None

    @property
    def rating_average(self) -> float | None:
        if self.rating_count == 0:
            return None
        return round(self.rating_sum / self.rating_count, 1)

    def build_search_text(self) -> str:
        category = self.category
        parts = [self.name, category.name_uz, category.name_ru]
        if category.parent:
            parts += [category.parent.name_uz, category.parent.name_ru]
        parts += [self.district.name_uz, self.district.name_ru]
        return normalize_for_search(" ".join(parts))

    def save(self, *args: object, **kwargs: object) -> None:
        self.search_text = self.build_search_text()
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = {*update_fields, "search_text"}  # type: ignore[misc]
        super().save(*args, **kwargs)  # type: ignore[arg-type]


def photo_upload_to(instance: "BusinessPhoto", filename: str) -> str:
    # Asl fayl nomi ishlatilmaydi (shaxsiy maʼlumot, xavfli belgilar bo'lishi mumkin)
    return f"businesses/{instance.business_id}/{instance.id}.webp"


class BusinessPhoto(UUIDModel):
    """Rasm — serverda qayta kodlangan (EXIF olib tashlangan, 3.6). Birinchisi — muqova."""

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="photos")
    file = models.FileField(upload_to=photo_upload_to, max_length=200)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    alt = models.CharField(max_length=200, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self) -> str:
        return f"{self.business.name} — {self.position + 1}-rasm"


class Item(TimestampedModel):
    """Mahsulot yoki xizmat. Narx — tiyinda, butun son (ADR-0010)."""

    class Kind(models.TextChoices):
        PRODUCT = "product"
        SERVICE = "service"

    class PriceType(models.TextChoices):
        FIXED = "fixed"
        FROM = "from"
        RANGE = "range"
        ON_REQUEST = "on_request"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="items")
    slug = models.SlugField(max_length=140)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    name = models.CharField(max_length=120)
    group = models.CharField(max_length=60, blank=True, help_text="Biznes ichidagi boʻlim")
    description = models.TextField(max_length=1000, blank=True)
    price_type = models.CharField(max_length=16, choices=PriceType.choices)
    price_min = models.BigIntegerField(null=True, blank=True)
    price_max = models.BigIntegerField(null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(5), MaxValueValidator(1440)]
    )
    # [{"key": "size", "name": "Oʻlcham", "value": "M, L"}] — kontraktdagi ItemAttribute
    attributes = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["business", "slug"], name="item_business_slug"),
            # Narx turi va qiymatlari mos: so'rov bo'yicha — qiymatsiz; oraliq — yuqori > quyi.
            # isnull=False aniq yoziladi: SQL'da "NULL > 0" — NULL,
            # CHECK esa NULL'ni o'tkazib yuboradi
            models.CheckConstraint(
                condition=(
                    Q(price_type="on_request", price_min__isnull=True, price_max__isnull=True)
                    | Q(
                        price_type__in=["fixed", "from"],
                        price_min__isnull=False,
                        price_min__gt=0,
                        price_max__isnull=True,
                    )
                    | Q(
                        price_type="range",
                        price_min__isnull=False,
                        price_max__isnull=False,
                        price_min__gt=0,
                        price_max__gt=F("price_min"),
                    )
                ),
                name="item_price_consistent",
            ),
            models.CheckConstraint(
                condition=Q(duration_minutes__isnull=True)
                | Q(kind="service", duration_minutes__gte=5, duration_minutes__lte=1440),
                name="item_duration_only_for_services",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class BusinessRequest(TimestampedModel):
    """“Biznesingizni qo'shing” so'rovi. Telefon — faqat business.edit ruxsatidagilarga ko'rinadi.

    Yopilgan (converted/rejected) so'rov 12 oy ichida o'chiriladi — maxfiylik siyosati (3.8).
    """

    class Status(models.TextChoices):
        NEW = "new"
        CONTACTED = "contacted"
        CONVERTED = "converted"
        REJECTED = "rejected"

    business_name = models.CharField(max_length=120)
    activity = models.CharField(max_length=100, blank=True)
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL)
    address = models.CharField(max_length=300, blank=True)
    contact_name = models.CharField(max_length=60)
    phone = models.CharField(max_length=13, help_text="E.164: +998XXXXXXXXX")
    note = models.TextField(max_length=1000, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    admin_note = models.CharField(max_length=500, blank=True)
    business = models.ForeignKey(
        Business, null=True, blank=True, on_delete=models.SET_NULL, related_name="requests"
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"], name="request_status_created")]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="converted") | Q(business__isnull=False),
                name="request_converted_has_business",
            ),
            models.CheckConstraint(
                condition=~Q(status="rejected") | ~Q(admin_note=""),
                name="request_rejected_has_note",
            ),
        ]

    def __str__(self) -> str:
        return self.business_name
