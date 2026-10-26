"""Platforma sozlamalarining yagona yozuvi (standart qiymatlar bilan)."""

from django.db import migrations


def create_row(apps, schema_editor):
    PlatformSettings = apps.get_model("core", "PlatformSettings")
    PlatformSettings.objects.get_or_create(pk=1)


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]

    operations = [migrations.RunPython(create_row, migrations.RunPython.noop)]
