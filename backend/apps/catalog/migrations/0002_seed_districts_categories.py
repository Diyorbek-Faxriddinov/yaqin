"""Tumanlar va kategoriyalar daraxti (apps/catalog/seed.py). Takroriy ishga tushirishga chidamli:
mavjud yozuv slug bo'yicha topilib yangilanadi. Orqaga qaytarishda o'chirilmaydi — unga bizneslar
bog'langan bo'lishi mumkin.
"""

from django.contrib.gis.geos import Point
from django.db import migrations


def seed(apps, schema_editor):
    from apps.catalog.seed import CATEGORY_TREE, DISTRICTS

    District = apps.get_model("catalog", "District")
    Category = apps.get_model("catalog", "Category")

    for position, (slug, name_uz, name_ru, lat, lng) in enumerate(DISTRICTS):
        District.objects.update_or_create(
            slug=slug,
            defaults={
                "name_uz": name_uz,
                "name_ru": name_ru,
                "center": Point(lng, lat, srid=4326),
                "position": position,
            },
        )

    for root_position, (slug, icon_key, name_uz, name_ru, children) in enumerate(CATEGORY_TREE):
        root, _ = Category.objects.update_or_create(
            slug=slug,
            defaults={
                "icon_key": icon_key,
                "name_uz": name_uz,
                "name_ru": name_ru,
                "parent": None,
                "position": root_position,
            },
        )
        for child_position, (child_slug, child_uz, child_ru) in enumerate(children):
            Category.objects.update_or_create(
                slug=child_slug,
                defaults={
                    "icon_key": "",
                    "name_uz": child_uz,
                    "name_ru": child_ru,
                    "parent": root,
                    "position": child_position,
                },
            )


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
