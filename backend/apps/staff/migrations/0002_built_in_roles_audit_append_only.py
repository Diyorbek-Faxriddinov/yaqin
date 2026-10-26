"""Tizim rollari va audit jurnalini faqat qo'shiladigan qilish.

Audit yozuvini o'zgartirish yoki o'chirish (shu jumladan TRUNCATE) bazaning o'zida taqiqlangan —
ilova kodidagi xato yoki SQL injeksiya ham jurnalni tozalay olmaydi.
"""

from django.db import migrations

from apps.staff.permissions import BUILT_IN_ROLES

APPEND_ONLY = """
CREATE FUNCTION staff_audit_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit jurnali faqat qoʻshiladi (%)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_auditentry_no_update_delete
    BEFORE UPDATE OR DELETE ON staff_auditentry
    FOR EACH ROW EXECUTE FUNCTION staff_audit_append_only();

CREATE TRIGGER staff_auditentry_no_truncate
    BEFORE TRUNCATE ON staff_auditentry
    FOR EACH STATEMENT EXECUTE FUNCTION staff_audit_append_only();
"""

DROP_APPEND_ONLY = """
DROP TRIGGER staff_auditentry_no_truncate ON staff_auditentry;
DROP TRIGGER staff_auditentry_no_update_delete ON staff_auditentry;
DROP FUNCTION staff_audit_append_only();
"""


def create_roles(apps, schema_editor):
    Role = apps.get_model("staff", "Role")
    for name, description, permissions in BUILT_IN_ROLES:
        Role.objects.get_or_create(
            name=name,
            defaults={
                "description": description,
                "permissions": list(permissions),
                "is_built_in": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("staff", "0001_initial")]

    operations = [
        migrations.RunPython(create_roles, migrations.RunPython.noop),
        migrations.RunSQL(APPEND_ONLY, DROP_APPEND_ONLY),
    ]
