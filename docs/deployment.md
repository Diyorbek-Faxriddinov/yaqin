# Production: tuzilma va joylash

Holat: 5.3 — sozlamalar repoda va CI'da tekshiriladi, server sozlash skripti tayyor. Birinchi joylash (5.4), zaxira va monitoring (5.5) — keyingi qadamlar, bu hujjat ular bilan to'ldiriladi.

## Tuzilma

Bitta VPS (Servercore, Toshkent; ADR-0005), Docker Compose — [deploy/compose.yaml](../deploy/compose.yaml):

```text
Internet ──► Caddy :80/:443 ──┬─ /api/v1/media/* ──► disk (media volume, faqat o'qish)
 (HTTPS, siqish, www→asosiy)  ├─ /api/v1/*       ──► backend  (Django + gunicorn) ──► db (PostGIS), redis
                              ├─ /api/revalidate  ──► 404 (faqat ichki tarmoqdan)
                              └─ qolgani          ──► frontend (Next.js standalone)

frontend ──► backend:8000          server tomonidagi API so'rovlari
frontend ──► caddy:8081            next/image uchun rasm fayllari (MEDIA_INTERNAL_URL)
backend  ──► frontend:3000         kesh yangilash webhook'i (REVALIDATE_SECRET)
scheduler                          kuniga bir marta `manage.py cleanup` (ADR-0004)
```

| Xizmat      | Image                                         | Izoh                                                                                                                                                 |
| ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db`        | `postgis/postgis:17-3.5`                      | Birinchi ishga tushishda [postgres/init/01-yaqin.sh](../deploy/postgres/init/01-yaqin.sh): ilova roli (superuser emas, CREATEDB'siz) va kengaytmalar |
| `redis`     | `redis:7.4-alpine`                            | Faqat kesh (cheklov va bloklash hisoblagichlari), diskka yozilmaydi                                                                                  |
| `backend`   | [backend/Dockerfile](../backend/Dockerfile)   | gunicorn, 3 worker, root huquqisiz. Kirish logi yozilmaydi (so'rovda joylashuv bo'lishi mumkin)                                                      |
| `scheduler` | backend image'i                               | Kunlik tozalash                                                                                                                                      |
| `frontend`  | [frontend/Dockerfile](../frontend/Dockerfile) | Next.js standalone. `HOSTNAME=0.0.0.0` **shart** (pastga qarang)                                                                                     |
| `caddy`     | `caddy:2.11.7-alpine`                         | Let's Encrypt sertifikati, siqish (`zstd`, `gzip` — Next'da o'chiq), rasmlar diskdan (`immutable`, `nosniff`), loglarsiz                             |

Tashqariga faqat 80/443 ochiq. Baza, Redis va ilovalar portlari faqat ichki Docker tarmog'ida.

### Muhim kelishuvlar

- **Rasmlar — serverdagi diskda** (`media` volume), Caddy to'g'ridan-to'g'ri beradi. Zaxira nusxasi S3'ga (5.5). ADR-0004 dagi "fayllar S3'da" rejasi o'zgardi — ADR-0005 yangilanishi.
- **Frontend image'i build vaqtida backendga ulanadi** (sahifalar oldindan tayyorlanadi). CI'da vaqtinchalik bo'sh baza bilan yig'iladi. Joylashdan keyin `./revalidate.sh` oldindan tayyorlangan sahifalarni haqiqiy maʼlumot bilan yangilaydi.
- **`NEXT_PUBLIC_*` build vaqtida** brauzer kodiga yoziladi. Domen, Telegram bot nomi yoki Google client ID o'zgarsa, frontend image'i qayta yig'iladi.
- **`HOSTNAME=0.0.0.0`.** Standalone server boshqa manzilda tinglasa (masalan `127.0.0.1`), til proxy'sining rewrite'ini tashqi deb hisoblaydi va bosh sahifa o'ziga `307` bilan yo'naltiriladi (lokal taqlidda topilgan).
- **Django HTTPS'ga o'zi yo'naltirmaydi** (`DJANGO_SSL_REDIRECT=false`) — buni Caddy qiladi. Frontend'ning ichki `http://backend:8000` so'rovlari ham shu backendga keladi.
- **HSTS** Caddyfile'da izohda turibdi. HTTPS to'liq ishlashi tasdiqlangach yoqiladi (5.6).

## Fayllar

| Fayl                                                                        | Vazifasi                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [deploy/compose.yaml](../deploy/compose.yaml)                               | Production to'plami                                               |
| [deploy/Caddyfile](../deploy/Caddyfile)                                     | Reverse proxy (lokal nusxasi — `scripts/local/Caddyfile`)         |
| [deploy/env.example](../deploy/env.example)                                 | Muhit o'zgaruvchilari namunasi. Serverda `.env` — Git'ga kirmaydi |
| [deploy/smoke.sh](../deploy/smoke.sh)                                       | Ishga tushgan to'plamni tekshirish (CI va serverda)               |
| [deploy/revalidate.sh](../deploy/revalidate.sh)                             | Joylashdan keyin frontend keshini yangilash                       |
| [deploy/compose.ci.yaml](../deploy/compose.ci.yaml)                         | Faqat CI: frontend build'i uchun backend porti                    |
| [deploy/server-setup.sh](../deploy/server-setup.sh)                         | Yangi serverni tayyorlash (5.3), bir marta                        |
| [.github/workflows/docker.yml](../.github/workflows/docker.yml)             | Image'lar + butun to'plam + smoke test                            |
| [.github/workflows/server-setup.yml](../.github/workflows/server-setup.yml) | `server-setup.sh` ni systemd'li Ubuntu 24.04 konteynerida sinash  |

## CI ([docker.yml](../.github/workflows/docker.yml))

1. Har safar yangi tasodifiy maxfiy qiymatlar bilan `.env`.
2. Backend image'i. Baza, migratsiyalar, backend.
3. Frontend image'i (`docker build --network host`, backend `127.0.0.1:8000` da).
4. Butun to'plam (`up --wait` — healthcheck'lar bilan).
5. `smoke.sh` tekshiradi:
   - API, sahifalar (uz/ru), admin;
   - CSP, siqish, 404;
   - webhook tashqaridan yopiqligi va ichki tarmoqdan ishlashi;
   - rasm: Caddy, `immutable`, `nosniff`, optimizator, papkadan chiqib bo'lmasligi;
   - `check --deploy`.

## Server (5.3)

Servercore, Toshkent: Ubuntu 24.04 LTS, 2 vCPU, 4 GB RAM, 50 GB disk, ochiq IP. Kirish faqat SSH kalit bilan: maxfiy qismi administrator kompyuterida (`~/.ssh/yaqin_ed25519`, parol bilan himoyalangan), ochiq qismi Servercore'da.

Yangi server bir marta, kompyuterdan tayyorlanadi:

```bash
scp deploy/server-setup.sh root@IP:/root/
ssh root@IP bash /root/server-setup.sh
```

Shundan keyin root bo'lib kirib bo'lmaydi, faqat `ssh deploy@IP`. Birinchi ulanishni yopishdan oldin yangi oynada `deploy` bo'lib kirib ko'ring. Kirib bo'lmasa — Servercore panelidagi konsol orqali.

| Sozlama        | Qiymat                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSH            | Faqat kalit bilan, faqat `deploy`; root va parol bilan kirish yopiq. `sshd_config.d/00-yaqin.conf` — provayderning `50-cloud-init.conf` idan oldin o'qiladi, shuning uchun ustun                               |
| `deploy`       | Paroli yo'q, sudo parolsiz (docker guruhi baribir root'ga teng — himoya SSH kalitida)                                                                                                                          |
| Firewall (ufw) | Faqat 22/tcp, 80/tcp, 443/tcp, 443/udp (HTTP/3). Docker ochgan portlar ufw'dan o'tib ketadi — compose faqat Caddy portlarini ochadi                                                                            |
| fail2ban       | SSH: 10 daqiqada 5 xato → 1 soat blok                                                                                                                                                                          |
| Yangilanishlar | Xavfsizlik yangilanishlari avtomatik (`unattended-upgrades`), kerak bo'lsa 04:00 da qayta yuklash; konteynerlar `restart: unless-stopped` bilan o'zi turadi. Docker paketlari avtomatik yangilanmaydi — qo'lda |
| Docker         | Rasmiy repo, kalit barmoq izi tekshiriladi. Loglar `local` driver bilan: konteyner boshiga ko'pi bilan 5 × 20 MB                                                                                               |
| Boshqa         | Swap 2 GB (`swappiness=10`), vaqt zonasi Asia/Tashkent                                                                                                                                                         |

Skript qayta ishga tushirilsa ham xavfsiz (`deploy` bo'lib: `sudo bash server-setup.sh`). CI uni haqiqiy serverdagidek sinaydi: provayder rasmiga o'xshash konteynerga root bo'lib SSH orqali ishga tushiradi, keyin root va parol bilan kirib bo'lmasligini, sudo, Docker, firewall, fail2ban va qayta ishga tushirishni tekshiradi. Swap konteynerda sinalmaydi.

## Joylash (5.4 da to'ldiriladi)

Serverda, `deploy/` papkasida:

```bash
cp env.example .env && chmod 600 .env        # qiymatlarni serverning o'zida yarating
docker compose up -d --wait db redis
docker compose run --rm backend python manage.py migrate --noinput
docker compose up -d --wait
./revalidate.sh
BASE=https://yaqinapp.uz ./smoke.sh
# birinchi marta — parol interaktiv so'raladi (ekranga va tarixga chiqmaydi)
docker compose run --rm backend python manage.py createroot --username root --display-name "Bosh administrator"
```

Yangilash: yangi image'lar → `migrate` → `up -d --wait` → `./revalidate.sh` → `smoke.sh`.
