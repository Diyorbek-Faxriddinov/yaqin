#!/bin/bash
# Bazaning birinchi ishga tushishida (bo'sh volume) bir marta bajariladi — postgis image'i
# /docker-entrypoint-initdb.d dagi skriptlarni o'zi chaqiradi.
#
# Ilova roli superuser emas va CREATEDB huquqisiz (backend/scripts/setup-db.sql dan farqli —
# u ishlab chiqish va CI uchun): kengaytmalarni o'zi yarata olmaydi, shuning uchun ular shu yerda.
# Parol muhitdan (deploy/.env → compose.yaml) — faylda saqlanmaydi.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
	-v app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE yaqin LOGIN PASSWORD :'app_password';
CREATE DATABASE yaqin OWNER yaqin;
\connect yaqin
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
SQL
