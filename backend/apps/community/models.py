from django.db import models
from django.db.models import Q

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.core.models import TimestampedModel, UUIDModel


class Review(UUIDModel):
    """Sharh. Akkaunt o'chirilsa chop etilgani muallifsiz qoladi ("O'chirilgan foydalanuvchi"),
    qolganlari o'chiriladi — kontraktdagi DELETE /me va maxfiylik siyosati (servis qatlamida).
    """

    class Status(models.TextChoices):
        PENDING = "pending"
        PUBLISHED = "published"
        REJECTED = "rejected"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(max_length=1000, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    # Biznes javobi (kontraktdagi Review.reply) — biznes kabineti keyingi bosqichda
    reply_text = models.TextField(max_length=1000, blank=True)
    reply_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["business", "status", "-created_at"], name="review_business_status"
            ),
            models.Index(fields=["status", "created_at"], name="review_queue"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(rating__gte=1, rating__lte=5), name="review_rating"),
            # Bir foydalanuvchi bir biznesga bitta sharh
            # (o'chirilgan muallif sharhlari bundan tashqari)
            models.UniqueConstraint(
                fields=["business", "user"],
                condition=Q(user__isnull=False),
                name="review_one_per_user",
            ),
            models.CheckConstraint(
                condition=~Q(status="rejected") | ~Q(rejection_reason=""),
                name="review_rejected_has_reason",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.business.name}: {self.rating}★"


class Complaint(TimestampedModel):
    """Noto'g'ri maʼlumot yoki boshqa muammo haqida xabar; javob foydalanuvchiga ko'rinadi."""

    class Reason(models.TextChoices):
        WRONG_INFO = "wrong_info"
        CLOSED_PERMANENTLY = "closed_permanently"
        WRONG_LOCATION = "wrong_location"
        FAKE_REVIEWS = "fake_reviews"
        FRAUD = "fraud"
        OTHER = "other"

    class Status(models.TextChoices):
        OPEN = "open"
        IN_REVIEW = "in_review"
        RESOLVED = "resolved"
        REJECTED = "rejected"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="complaints")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="complaints")
    reason = models.CharField(max_length=24, choices=Reason.choices)
    text = models.TextField(max_length=1000, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    resolution_note = models.CharField(max_length=500, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"], name="complaint_queue")]
        constraints = [
            # "Boshqa" sababi uchun izoh majburiy (kamida 10 belgi — API'da)
            models.CheckConstraint(
                condition=~Q(reason="other") | ~Q(text=""), name="complaint_other_has_text"
            ),
            models.CheckConstraint(
                condition=~Q(status__in=["resolved", "rejected"]) | ~Q(resolution_note=""),
                name="complaint_closed_has_note",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.business.name}: {self.reason}"


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "business"], name="favorite_unique"),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.business}"
