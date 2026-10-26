"""Admin API: administratorlar, rollar (ADR-0009) va audit jurnali.

Ko'rish — staff.manage; o'zgartirish — faqat Root. Root'ning o'zi API orqali o'zgarmaydi
(faqat serverdagi `createroot`). Audit jurnali — faqat o'qish (audit.view).
"""

import re
from typing import Any
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Count
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.api import ApiError, invalid, not_found, page_payload
from apps.staff.audit import audit
from apps.staff.authentication import ROOT, AdminView, current_admin
from apps.staff.models import USERNAME_PATTERN, AdminUser, AuditEntry, Role
from apps.staff.passwords import hash_password, temporary_password
from apps.staff.permissions import ALL_PERMISSIONS, Permission
from apps.staff.sessions import end_admin_sessions

Target = AuditEntry.TargetType
Fields = dict[str, list[str]]


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def role_ref(role: Role) -> dict[str, Any]:
    return {"id": str(role.id), "name": role.name}


def effective_permissions(admin: AdminUser, roles: list[Role]) -> list[dict[str, Any]]:
    """Har bir amaldagi ruxsat va manbalari: qaysi rol(lar)dan va/yoki alohida berilgan."""
    if admin.is_root:
        return [{"permission": p, "sources": []} for p in ALL_PERMISSIONS]
    result = []
    for permission in ALL_PERMISSIONS:
        sources: list[dict[str, Any]] = [
            {"type": "role", "role": role_ref(r)} for r in roles if permission in r.permissions
        ]
        if permission in admin.extra_permissions:
            sources.append({"type": "direct"})
        if sources:
            result.append({"permission": permission, "sources": sources})
    return result


def staff_payload(admin: AdminUser) -> dict[str, Any]:
    roles = list(admin.roles.all())
    return {
        "id": str(admin.id),
        "username": admin.username,
        "displayName": admin.display_name,
        "isRoot": admin.is_root,
        "isActive": admin.is_active,
        "roles": [role_ref(r) for r in roles],
        "extraPermissions": [p for p in ALL_PERMISSIONS if p in admin.extra_permissions],
        "effectivePermissions": effective_permissions(admin, roles),
        "lastLoginAt": admin.last_login_at.isoformat() if admin.last_login_at else None,
        "createdAt": admin.created_at.isoformat(),
    }


def role_payload(role: Any) -> dict[str, Any]:
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or None,
        "permissions": [p for p in ALL_PERMISSIONS if p in role.permissions],
        "isBuiltIn": role.is_built_in,
        "adminCount": role.admin_count,
    }


def parse_permissions(value: Any) -> list[str] | None:
    if not isinstance(value, list) or not all(p in ALL_PERMISSIONS for p in value):
        return None
    return [p for p in ALL_PERMISSIONS if p in value]


def parse_roles(value: Any) -> list[Role] | None:
    if not isinstance(value, list):
        return None
    ids = set()
    for raw in value:
        try:
            ids.add(UUID(str(raw)))
        except ValueError:
            return None
    roles = list(Role.objects.filter(pk__in=ids))
    return roles if len(roles) == len(ids) else None


def get_staff(admin_id: UUID) -> AdminUser:
    admin = AdminUser.objects.select_for_update().filter(pk=admin_id).first()
    if admin is None:
        raise not_found()
    if admin.is_root:
        raise ApiError(403, "root_immutable", "Root API orqali oʻzgartirilmaydi")
    return admin


class StaffAdminView(AdminView):
    admin_permission: str | None = Permission.STAFF_MANAGE


class AdminStaffListView(StaffAdminView):
    admin_permissions = {"POST": ROOT}

    def get(self, request: Request) -> Response:
        admins = AdminUser.objects.prefetch_related("roles").order_by("created_at")
        return Response([staff_payload(a) for a in admins])

    def post(self, request: Request) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        username, display_name = text(body.get("username")).lower(), text(body.get("displayName"))
        roles = parse_roles(body.get("roleIds", []))
        extra = parse_permissions(body.get("extraPermissions", []))
        fields: Fields = {}
        if not re.fullmatch(USERNAME_PATTERN, username):
            fields["username"] = ["Kichik lotin harflari, raqam, . _ - (3–32)"]
        if not 2 <= len(display_name) <= 60:
            fields["displayName"] = ["2–60 belgi"]
        if roles is None:
            fields["roleIds"] = ["Rol topilmadi"]
        if extra is None:
            fields["extraPermissions"] = ["Ruxsat notoʻgʻri"]
        if fields or roles is None or extra is None:
            raise invalid(fields)
        taken = ApiError(409, "username_taken", "Bu login band", {"username": ["Bu login band"]})
        if AdminUser.objects.filter(username=username).exists():
            raise taken

        password = temporary_password()
        actor = current_admin(request)
        try:
            with transaction.atomic():
                # Birinchi kirishda yangi parol va 2FA sozlanadi (must_change_password, TOTP yo'q)
                admin = AdminUser.objects.create(
                    username=username,
                    display_name=display_name,
                    password_hash=hash_password(password),
                    must_change_password=True,
                    extra_permissions=extra,
                )
                admin.roles.set(roles)
                audit(actor, "admin.create", Target.ADMIN, admin.id, f"Qoʻshildi: {username}")
        except IntegrityError:
            raise taken from None
        return Response({"staff": staff_payload(admin), "temporaryPassword": password}, status=201)


class AdminStaffDetailView(StaffAdminView):
    admin_permission = ROOT

    def patch(self, request: Request, admin_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        actor = current_admin(request)
        with transaction.atomic():
            admin = get_staff(admin_id)
            fields: Fields = {}
            changes: list[str] = []
            if "displayName" in body:
                name = text(body["displayName"])
                if not 2 <= len(name) <= 60:
                    fields["displayName"] = ["2–60 belgi"]
                elif name != admin.display_name:
                    admin.display_name = name
                    changes.append("ism")
            roles = parse_roles(body["roleIds"]) if "roleIds" in body else None
            if "roleIds" in body and roles is None:
                fields["roleIds"] = ["Rol topilmadi"]
            extra = (
                parse_permissions(body["extraPermissions"]) if "extraPermissions" in body else None
            )
            if "extraPermissions" in body and extra is None:
                fields["extraPermissions"] = ["Ruxsat notoʻgʻri"]
            active = body.get("isActive", admin.is_active)
            if not isinstance(active, bool):
                fields["isActive"] = ["Qiymat kerak"]
            if fields:
                raise invalid(fields)

            if roles is not None and {r.id for r in roles} != set(
                admin.roles.values_list("id", flat=True)
            ):
                admin.roles.set(roles)
                changes.append("rollar")
            if extra is not None and extra != sorted(
                admin.extra_permissions, key=ALL_PERMISSIONS.index
            ):
                admin.extra_permissions = extra
                changes.append("alohida ruxsatlar")
            if active != admin.is_active:
                admin.is_active = active
                changes.append("faollashtirildi" if active else "oʻchirildi")
                if not active:
                    # O'chirilgan administrator darhol tizimdan chiqariladi
                    end_admin_sessions(admin)
            admin.save()
            audit(
                actor,
                "admin.update",
                Target.ADMIN,
                admin.id,
                f"{admin.username}: {', '.join(changes) or 'oʻzgarishsiz'}",
            )
        return Response(staff_payload(admin))


class AdminStaffResetPasswordView(StaffAdminView):
    admin_permission = ROOT

    def post(self, request: Request, admin_id: UUID) -> Response:
        actor = current_admin(request)
        password = temporary_password()
        with transaction.atomic():
            admin = get_staff(admin_id)
            # Tiklangan akkaunt: keyingi kirishda yangi parol va 2FA qaytadan sozlanadi
            admin.password_hash = hash_password(password)
            admin.must_change_password = True
            admin.totp_secret, admin.totp_last_step = "", None
            admin.save()
            end_admin_sessions(admin)
            audit(
                actor,
                "admin.reset_password",
                Target.ADMIN,
                admin.id,
                f"Parol yangilandi: {admin.username}",
            )
        return Response({"temporaryPassword": password})


def roles_with_counts() -> Any:
    return Role.objects.annotate(admin_count=Count("admins", distinct=True))


def parse_role(body: dict[str, Any]) -> tuple[str, str, list[str]]:
    name, description = text(body.get("name")), text(body.get("description"))
    permissions = parse_permissions(body.get("permissions"))
    fields: Fields = {}
    if not 2 <= len(name) <= 40:
        fields["name"] = ["2–40 belgi"]
    if len(description) > 200:
        fields["description"] = ["Koʻpi bilan 200 belgi"]
    if not permissions:
        fields["permissions"] = ["Kamida bitta ruxsat"]
    if fields or not permissions:
        raise invalid(fields)
    return name, description, permissions


def name_taken() -> ApiError:
    return invalid({"name": ["Bu nom band"]})


class AdminRoleListView(StaffAdminView):
    admin_permissions = {"POST": ROOT}

    def get(self, request: Request) -> Response:
        return Response([role_payload(r) for r in roles_with_counts()])

    def post(self, request: Request) -> Response:
        name, description, permissions = parse_role(
            request.data if isinstance(request.data, dict) else {}
        )
        actor = current_admin(request)
        if Role.objects.filter(name__iexact=name).exists():
            raise name_taken()
        try:
            with transaction.atomic():
                role = Role.objects.create(
                    name=name, description=description, permissions=permissions
                )
                audit(actor, "role.create", Target.ROLE, role.id, f"Qoʻshildi: {name}")
        except IntegrityError:
            raise name_taken() from None
        return Response(role_payload(roles_with_counts().get(pk=role.pk)), status=201)


class AdminRoleDetailView(StaffAdminView):
    admin_permission = ROOT

    def _get(self, role_id: UUID) -> Role:
        role = Role.objects.select_for_update().filter(pk=role_id).first()
        if role is None:
            raise not_found()
        return role

    def patch(self, request: Request, role_id: UUID) -> Response:
        name, description, permissions = parse_role(
            request.data if isinstance(request.data, dict) else {}
        )
        actor = current_admin(request)
        try:
            with transaction.atomic():
                role = self._get(role_id)
                if Role.objects.filter(name__iexact=name).exclude(pk=role.pk).exists():
                    raise name_taken()
                # Shu roldagi administratorlarga darhol ta'sir qiladi (ruxsatlar har so'rovda
                # hisoblanadi)
                role.name, role.description, role.permissions = name, description, permissions
                role.save()
                audit(
                    actor,
                    "role.update",
                    Target.ROLE,
                    role.id,
                    f"{name}: {', '.join(permissions)}",
                )
        except IntegrityError:
            raise name_taken() from None
        return Response(role_payload(roles_with_counts().get(pk=role.pk)))

    def delete(self, request: Request, role_id: UUID) -> Response:
        actor = current_admin(request)
        with transaction.atomic():
            role = self._get(role_id)
            if role.is_built_in:
                raise ApiError(409, "built_in_role", "Tizim rolini oʻchirib boʻlmaydi")
            if role.admins.exists():
                raise ApiError(
                    409, "role_in_use", "Rol administratorlarga berilgan — avval olib tashlang"
                )
            role.delete()
            audit(actor, "role.delete", Target.ROLE, role_id, f"Oʻchirildi: {role.name}")
        return Response(status=204)


def audit_payload(entry: AuditEntry) -> dict[str, Any]:
    admin = entry.admin
    return {
        "id": str(entry.id),
        "at": entry.at.isoformat(),
        "admin": {"id": str(admin.id), "displayName": admin.display_name} if admin else None,
        "action": entry.action,
        "targetType": entry.target_type,
        "targetId": entry.target_id,
        "summary": entry.summary,
    }


class AdminAuditListView(AdminView):
    admin_permission = Permission.AUDIT_VIEW

    def get(self, request: Request) -> Response:
        entries = AuditEntry.objects.select_related("admin").order_by("-at", "-id")
        target_type = request.query_params.get("targetType")
        if target_type is not None:
            if target_type not in Target.values:
                raise invalid({"targetType": ["Notoʻgʻri qiymat"]})
            entries = entries.filter(target_type=target_type)
        admin_id = request.query_params.get("adminId")
        if admin_id is not None:
            try:
                entries = entries.filter(admin_id=UUID(admin_id))
            except ValueError:
                raise invalid({"adminId": ["Notoʻgʻri qiymat"]}) from None
        return Response(page_payload(entries, request, audit_payload))
