-- Maʼlumotlar bazasini bir martalik tayyorlash (PostgreSQL superuser sifatida bajariladi).
-- Ilova roli superuser emas: kengaytmalarni oʻzi yarata olmaydi, shuning uchun ular shu yerda.
--
--   psql -U postgres -h localhost -v app_password="'...'" -f backend/scripts/setup-db.sql
--
-- Parol buyruq qatorida beriladi — faylda yoki repoda saqlanmaydi.

CREATE ROLE yaqin LOGIN PASSWORD :app_password;

-- Testlar (pytest-django) har safar test_yaqin bazasini template1 dan yaratadi —
-- shuning uchun rolga CREATEDB va kengaytmalar template1 ga ham (faqat ishlab chiqish/CI)
ALTER ROLE yaqin CREATEDB;

\connect template1
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

\connect postgres
CREATE DATABASE yaqin OWNER yaqin;
