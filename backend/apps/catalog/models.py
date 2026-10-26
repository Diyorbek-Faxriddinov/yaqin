from django.contrib.gis.db import models as gis
from django.core.validators import RegexValidator
from django.db import models

from apps.core.models import UUIDModel

SLUG_VALIDATOR = RegexValidator(
    r"^[a-z0-9]+(-[a-z0-9]+)*$", "Lotin harflari, raqamlar va chiziqcha (URL uchun)"
)


class District(UUIDModel):
    """Toshkent tumanlari. Markaz — xarita va "tuman markazidan masofa" uchun."""

    slug = models.SlugField(max_length=60, unique=True, validators=[SLUG_VALIDATOR])
    name_uz = models.CharField(max_length=60)
    name_ru = models.CharField(max_length=60)
    center = gis.PointField(geography=True, srid=4326)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "name_uz"]

    def __str__(self) -> str:
        return self.name_uz

    def name(self, lang: str) -> str:
        return self.name_ru if lang == "ru" else self.name_uz


class Category(UUIDModel):
    """Ikki darajali kategoriyalar: yo'nalish (ikonka bilan) va ichki kategoriya.

    Biznes faqat ichki kategoriyaga biriktiriladi. Slug yaratilgandan keyin o'zgarmaydi — URL'lar
    barqaror (kontraktdagi AdminCategoryUpdate'da slug yo'q). Atributlar — kontraktdagi
    AdminAttribute ro'yxati (JSONB, ADR-0004); tekshiruv API qatlamida.
    """

    class IconKey(models.TextChoices):
        SHOPPING = "shopping"
        FOOD = "food"
        BEAUTY = "beauty"
        HOME_SERVICES = "home-services"
        AUTO = "auto"
        HEALTH = "health"
        EDUCATION = "education"
        SPORT = "sport"
        TRAVEL = "travel"
        EVENTS = "events"
        PETS = "pets"
        PROFESSIONAL = "professional"

    slug = models.SlugField(max_length=60, unique=True, validators=[SLUG_VALIDATOR])
    name_uz = models.CharField(max_length=60)
    name_ru = models.CharField(max_length=60)
    icon_key = models.CharField(max_length=20, choices=IconKey.choices, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    position = models.PositiveIntegerField(default=0)
    attributes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "name_uz"]
        constraints = [
            # Yo'nalishda ikonka bo'lishi shart (ichki kategoriya ota-kategoriyanikini ishlatadi)
            models.CheckConstraint(
                condition=models.Q(parent__isnull=False) | ~models.Q(icon_key=""),
                name="category_root_has_icon",
            ),
        ]

    def __str__(self) -> str:
        return self.name_uz

    @property
    def is_leaf(self) -> bool:
        return self.parent_id is not None

    def name(self, lang: str) -> str:
        return self.name_ru if lang == "ru" else self.name_uz

    def effective_icon_key(self) -> str:
        """Ichki kategoriya ikonkasi ota-kategoriyadan."""
        return self.icon_key or (self.parent.icon_key if self.parent else "")
