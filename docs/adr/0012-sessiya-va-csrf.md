# 0012. Sessiya, CSRF va foydalanuvchi holati

- **Holat:** Qabul qilingan
- **Sana:** 2026-10-25

## Kontekst

Mijozlar sharh, sevimlilar va shikoyatlar uchun kiradi (ADR-0006). Sahifalarning aksariyati ommaviy va keshlanadigan bo'lishi kerak (SEO, tezlik). Backend — Django; frontend va API bir domenda (`/api/v1` reverse proxy orqali).

## Qaror

**Sessiya**

- Backend `sessionid` cookie'sini o'rnatadi: `HttpOnly`, `Secure`, `SameSite=Lax`, 30 kun. Token JavaScript'ga ko'rinmaydi (XSS orqali o'g'irlab bo'lmaydi), `localStorage` ishlatilmaydi.
- Server komponentlari foydalanuvchi nomidan so'rov yuborganda kiruvchi cookie'larni API'ga uzatadi (`features/auth/server.ts`).

**CSRF — double-submit (Django bilan mos)**

- Kirishda `csrftoken` cookie'si (HttpOnly emas) o'rnatiladi.
- O'zgartiruvchi so'rovlar (POST/PUT/PATCH/DELETE) `X-CSRFToken` sarlavhasini yuboradi; backend uni cookie va sessiya bilan solishtiradi. Brauzer klienti buni middleware orqali avtomatik qiladi (`lib/api/browser.ts`).
- `SameSite=Lax` qo'shimcha himoya, lekin yagona himoya emas.

**Himoyalangan sahifalar**

- `proxy.ts`: `/profil/*` ga `sessionid` cookie'siz kirilsa — `/kirish?next=...`. Bu faqat qulaylik ("miltillash" bo'lmasligi uchun).
- Haqiqiy tekshiruv serverda: `AuthGate` → `requireUser()` (`GET /me`, 401 bo'lsa — yo'naltirish).
- `?next=` faqat sayt ichidagi nisbiy yo'l (`lib/safe-redirect.ts`) — open redirect himoyasi.

**Header'dagi foydalanuvchi holati brauzerda**

- `UserMenu` foydalanuvchini `GET /api/v1/me` orqali brauzerda oladi (TanStack Query). Shu tufayli barcha ommaviy sahifalar statik/keshlanadigan bo'lib qoladi — foydalanuvchiga xos maʼlumot HTML keshiga tushmaydi.

**Demo rejim**

- `POST /auth/demo` — har safar alohida demo foydalanuvchi; maʼlumotlar server xotirasida (qayta ishga tushganda o'chadi). Telegram/Google demo rejimida halol rad etiladi (401) va interfeysda faol emas deb ko'rsatiladi.

## Koʻrib chiqilgan muqobillar

- **JWT `localStorage`'da** — XSS'da token o'g'irlanadi, bekor qilish qiyin.
- **Header'ni serverda render qilish** — har bir sahifa dinamik bo'lib qoladi, CDN keshi ishlamaydi.
- **Faqat SameSite cookie, CSRF tokensiz** — eski brauzerlar va subdomen holatlarida yetarli emas.

## Oqibatlar

- Login holati header'da sahifa yuklangandan keyin (bir lahzada) ko'rinadi — joy egallovchi skeleton bilan.
- Backend (3-bosqich): Django session + `CsrfViewMiddleware`, `CSRF_COOKIE_HTTPONLY=False`, `SESSION_COOKIE_SAMESITE="Lax"`, rate limiting kirish endpointlarida.
