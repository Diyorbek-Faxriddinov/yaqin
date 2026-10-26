# 4-bosqich: integratsiya rejasi

Maqsad — frontend haqiqiy backend bilan (`NEXT_PUBLIC_DEMO_MODE=false`) toʻliq ishlashi: har bir sahifa va amal brauzerda, telefonda va avtomatik testlarda sinalgan boʻlsin. Hosting (server, domen, HTTPS) — 5-bosqich.

## Hozirgi holat (3-bosqich oxirida)

- Backend kontraktdagi barcha 77 ta operatsiyani bajaradi; har bir javob testlarda kontraktga qarshi tekshiriladi.
- Lokal integratsiya ishga tushirilgan: `scripts/local/start.ps1` (Caddy `localhost:8090` → Django va Next.js). Admin kirishi, biznes qoʻshish va eʼlon qilish, rasmlar, kesh yangilash — sinalgan.
- Frontend'da demo rejimga bogʻliq joylar aniq ajratilgan (`isDemoMode`): mock API, ogohlantirish banneri, kirish sahifalaridagi demo tugmalar, statistikadagi namunaviy qiymatlar izohi.
- **Yetishmaydi:** mijozning Telegram va Google orqali kirishi (frontendda faqat "backend ulanganda ishlaydi" matni), haqiqiy backend bilan E2E testlar, xavfsizlik sarlavhalari (CSP).

## Qadamlar

| Qadam | Mazmuni                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Natija                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 4.1   | **Haqiqiy backend uchun maʼlumotlar va E2E.** `manage.py seed_demo` — frontend fixture'laridagi demo bizneslar, sharhlar va soʻrovlarni bazaga yuklaydi (faqat `DEBUG` rejimida, barcha yozuvlar "demo" deb belgilanadi, `--reset` bilan tozalanadi). Playwright'ga backend rejimi: Caddy orqali, seed qilingan baza bilan; demo'ga xos testlar (demo kirish tugmasi, namunaviy statistika) ajratiladi. Toʻliq E2E toʻplami haqiqiy backend bilan ishlatiladi, topilgan farqlar tuzatiladi | Frontend va backend avtomatik testlarda birga sinaladi   |
| 4.2   | **Mijoz kirishi.** Telegram Login Widget va Google Identity Services komponentlari (rasmiy skriptlar), backend sozlamalari (`TELEGRAM_BOT_TOKEN`, `GOOGLE_CLIENT_ID`), xatolar (bloklangan akkaunt, provayder sozlanmagan). Testlarda — imzolangan soxta javoblar; haqiqiy kirish — sizning bot va client ID'ingiz bilan                                                                                                                                                                   | Sevimlilar, sharh va shikoyat haqiqiy rejimda ishlaydi   |
| 4.3   | **Xavfsizlik sarlavhalari.** Content-Security-Policy (Telegram, Google, xarita plitkalari va oʻz domenimiz uchun aniq ruxsatlar), `Permissions-Policy` (joylashuv va kamera — faqat oʻz saytimiz), `frame-ancestors`. Barcha sahifalar va admin panel CSP buzilishlarisiz ishlashi E2E'da tekshiriladi                                                                                                                                                                                     | Brauzer darajasidagi himoya                              |
| 4.4   | **Mustahkamlik va tezlik.** Backend javob bermasa — tushunarli xato holatlari va soʻrov vaqti chegarasi (SSR); har bir admin amalidan keyin ommaviy sahifa yangilanishi (kesh teglari) E2E'da; Lighthouse haqiqiy backend bilan; dev rejimidagi `params`/Suspense maslahati                                                                                                                                                                                                                | Sekin yoki uzilgan backendda ham sayt buzilmaydi         |
| 4.5   | **Telefonda sinov.** Doʻkonda biznes qoʻshish (GPS, kamera, rasm siqish), xarita, qoʻngʻiroq va yoʻl tugmalari — haqiqiy telefonda. Telefon brauzerida joylashuv va kamera faqat HTTPS'da ishlaydi — vaqtinchalik HTTPS manzil kerak (pastga qarang). Sizga qadam-baqadam roʻyxat beriladi                                                                                                                                                                                                 | Asosiy foydalanuvchi oqimlari haqiqiy qurilmada sinalgan |
| 4.6   | **CI va yakun.** GitHub Actions'da integratsiya ishi: PostgreSQL + Redis + Django + Next.js + Playwright (backend rejimi). Hujjatlar: ishga tushirish, demo/haqiqiy rejim (ADR-0011 yangilanadi), README'lar                                                                                                                                                                                                                                                                               | Har bir push'da frontend + backend birga tekshiriladi    |

Har bir qadam oxirida: testlar, lint, tiplar, hisobot (nima ishlaydi / nima ishlamaydi), README'lar tekshiruvi va sizning tasdiqingiz.

## Sizdan kerak boʻladigan narsalar

Hammasi bepul. Akkauntlar sizniki boʻlishi kerak — men qadam-baqadam yoʻriqnoma beraman, maxfiy qiymatlarni faqat lokal `.env` fayllariga yozasiz (Git'ga tushmaydi).

| Nima                                                            | Qachon   | Qanday                                                                                                     |
| --------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Telefonda autentifikator ilovasi (Google Authenticator, Aegis…) | 4.1 dan  | Play Market / App Store                                                                                    |
| Telegram bot                                                    | 4.2      | Telegram'da @BotFather → `/newbot` → token; `/setdomain` → sayt manzili                                    |
| Google OAuth Client ID                                          | 4.2      | Google Cloud Console → "Credentials" → OAuth client (Web) → ruxsat etilgan manzil: `http://localhost:8090` |
| Vaqtinchalik HTTPS manzil (Telegram va telefon sinovi uchun)    | 4.2, 4.5 | Pastdagi qaror                                                                                             |

## Qaror talab qiladigan masala

**Telegram kirishi va telefondagi sinov uchun HTTPS manzil.** Telegram Login Widget `localhost` da ishlamaydi (bot domenga bogʻlanadi), telefon brauzeri esa joylashuv va kamerani faqat HTTPS saytda beradi. Variantlar:

1. **Tavsiya: Cloudflare Tunnel (`cloudflared`).** Bepul, akkauntsiz, bitta `.exe` — `D:\tools\cloudflared` ga qoʻyiladi. Lokal saytga vaqtinchalik `https://<tasodifiy>.trycloudflare.com` manzil beradi. Kamchiligi: manzil har ishga tushirishda oʻzgaradi, Telegram uchun har safar `/setdomain` qilinadi; tunnel ochiq vaqtda sayt internetdan koʻrinadi (faqat sinov paytida yoqiladi).
2. **5-bosqichgacha kutish.** Telegram kirishi va telefon sinovi domen olingandan keyin. 4-bosqichda Google kirishi (`localhost` da ishlaydi) va kompyuterdagi brauzer sinovi bilan cheklanamiz.

Javob bermasangiz, 1-variant bilan davom etaman — `cloudflared` faqat 4.2 da, sizga koʻrsatib yuklanadi.

## Pul sarflash

4-bosqichda pullik xizmat yoʻq. Server va domen — 5-bosqichda, narxlar solishtirilib, faqat sizning aniq roziligingiz bilan.
