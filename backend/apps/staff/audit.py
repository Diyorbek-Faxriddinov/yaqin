"""Audit jurnaliga yozish. Har bir admin amali (kirish, tahrir, moderatsiya) shu yerdan o'tadi.

`summary` — inson o'qiydigan qisqa tavsif; parollar, tokenlar va shaxsiy maʼlumotlar yozilmaydi.
"""

from apps.staff.models import AdminUser, AuditEntry


def audit(
    admin: AdminUser | None,
    action: str,
    target_type: AuditEntry.TargetType,
    target_id: object,
    summary: str,
) -> AuditEntry:
    return AuditEntry.objects.create(
        admin=admin,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary[:300],
    )
