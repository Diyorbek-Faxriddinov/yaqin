# 3-bosqich: backend rejasi

Maqsad — [API kontrakti](api/openapi.yaml)ni toʻliq bajaradigan Django backend. Frontend undan oʻzgarishsiz foydalanadi (`NEXT_PUBLIC_DEMO_MODE=false`). Talablar roʻyxati — [backend-handoff.md](backend-handoff.md), stek — [ADR-0004](adr/0004-backend-steki.md).

## Stek

| Qism               | Tanlov                                                                                                                 | Izoh                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Til                | Python 3.13                                                                                                            | Kompyuterda bor                                              |
| Framework          | Django 5.2 LTS + Django REST Framework                                                                                 | LTS — 2028-yil aprelgacha xavfsizlik yangilanishlari         |
| Maʼlumotlar bazasi | PostgreSQL 17 + PostGIS                                                                                                | Masofa boʻyicha saralash, xarita                             |
| Kesh, cheklovlar   | Redis (productionda); ishlab chiqishda — DB kesh                                                                       | Windows'da Redis rasmiy yoʻq                                 |
| Fon vazifalar      | Celery + beat (productionda); testlarda — darhol bajarish                                                              | Rasmlar, eskirgan soʻrovlarni oʻchirish                      |
| Parollar, 2FA      | Argon2, pyotp (TOTP) + QR                                                                                              | ADR-0006                                                     |
| Rasmlar            | Pillow — qayta kodlash, EXIF olib tashlash                                                                             |                                                              |
| Testlar            | pytest + pytest-django + factory_boy, har bir endpoint uchun ruxsatlar testlari                                        | Frontend mock testlari — ssenariy manbai                     |
| API kontrakti      | `docs/api/openapi.yaml` — **manba** (koddan generatsiya emas); har bir javob testlarda shu sxemaga qarshi tekshiriladi | ADR-0004dagi drf-spectacular oʻrniga — 3.1da ADR yangilanadi |
| Qidiruv            | PostgreSQL `pg_trgm` + `unaccent`, lotin/kirill normalizatsiyasi                                                       | ADR-0004                                                     |
| Sifat              | ruff (lint + format), mypy                                                                                             | CI'da                                                        |
| Paketlar           | `requirements.txt` — aniq versiyalar (≥2 hafta eski, xavfsizlik tuzatishlari bundan mustasno), `pip-audit`             | Frontenddagi siyosat bilan bir xil                           |

## Qadamlar

| Qadam | Mazmuni                                                                                                                                                                                                                                                     | Natija                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 3.1   | Poydevor: `backend/` loyihasi, sozlamalar (`.env`), PostgreSQL + PostGIS ulanishi, pytest, ruff, mypy, CI (GitHub Actions'da PostGIS servisi), `/api/v1/health`                                                                                             | Boʻsh, lekin toʻliq tekshiriladigan loyiha |
| 3.2   | Maʼlumot modeli: tumanlar, kategoriyalar va atributlar, bizneslar (joylashuv, ish vaqti, rozilik), katalog, rasmlar, sharhlar, shikoyatlar, soʻrovlar, sozlamalar; migratsiyalar; tumanlar va kategoriyalar uchun boshlangʻich maʼlumot (demo bizneslarsiz) | Admin'siz ham koʻrish mumkin boʻlgan sxema |
| 3.3   | Ommaviy API: kategoriyalar, tumanlar, bizneslar roʻyxati (qidiruv lotin/kirill, filtrlar, masofa, "hozir ochiq"), profil, katalog, sharhlar, xarita, takliflar, statistika hodisalari                                                                       | Ommaviy sayt backend bilan ishlaydi        |
| 3.4   | Mijoz autentifikatsiyasi: Telegram Login, Google, sessiya + CSRF, `/me`, sevimlilar, sharh va shikoyat yuborish, akkauntni oʻchirish, bloklash                                                                                                              | Mijoz kabineti                             |
| 3.5   | Admin autentifikatsiyasi va ruxsatlar: parol + TOTP, birinchi kirishda parol almashtirish, IP + login cheklovi, alohida admin sessiyasi, RBAC (rollar, alohida ruxsatlar, manbasi), Root CLI buyrugʻi, audit jurnali                                        | Xavfsiz admin kirishi                      |
| 3.6   | Admin API (1): bizneslar, rasmlar, katalog, eʼlon qilish qoidalari, frontend keshini yangilash webhook'i                                                                                                                                                    | Tezkor qoʻshish ustasi backend bilan       |
| 3.7   | Admin API (2): kategoriyalar, sharh moderatsiyasi, shikoyatlar, soʻrovlar, foydalanuvchilar, administratorlar va rollar, audit roʻyxati, sozlamalar                                                                                                         | Admin panel toʻliq                         |
| 3.8   | Statistika (kunlik agregat), egasi uchun hisobot havolasi, davriy vazifalar (soʻrovlarni 12 oyda oʻchirish), xavfsizlik sozlamalari (HSTS, xavfsiz cookie, loglar)                                                                                          | Handoff roʻyxati yopiladi                  |
| 3.9   | Kontrakt boʻyicha yakuniy tekshiruv: har bir endpoint `openapi.yaml` ga mos, hujjatlar, ishga tushirish yoʻriqnomasi                                                                                                                                        | 4-bosqichga (integratsiya) tayyor          |

Har bir qadam oxirida: testlar, lint, mypy, CI, hisobot (nima ishlaydi / nima ishlamaydi) va sizning tasdiqingiz.

## Tashqi xizmatlar (sinovdan oʻtmaguncha "ishlaydi" deyilmaydi)

- **Telegram Login** — bot yaratish va domen bogʻlash kerak (bepul). Kod testlarda imzo tekshiruvi bilan sinanadi; haqiqiy kirish — 4/5-bosqichda, domen boʻlganda.
- **Google kirish** — Google Cloud'da OAuth mijozi (bepul). Xuddi shunday.
- Pul talab qiladigan xizmatlar 3-bosqichda **yoʻq**.

## Xavflar

- **GeoDjango Windows'da** GDAL va GEOS kutubxonalarini talab qiladi. PostGIS'ning Windows toʻplamidagi DLL'lar bilan ishlatib koʻraman. Ishlamasa — GeoDjango'siz, PostGIS funksiyalarini toʻgʻridan-toʻgʻri SQL ifodalari orqali (productionda Linux'da muammo yoʻq).
- **C: diskda joy kam (≈5 GB)** — maʼlumotlar bazasi, kesh va virtual muhit D: diskka joylanadi.
