# 0013. Brauzer xavfsizlik sarlavhalari (CSP, Permissions-Policy)

- **Holat:** Qabul qilingan; 2026-10-31 da yangilangan (Zod va `eval`)
- **Sana:** 2026-10-26

## Kontekst

Sayt tashqi skriptlarni ishlatadi (Telegram Login Widget, Google Identity Services), xarita plitkalarini tashqi provayderdan oladi, admin panelda QR kod (data URI) va rasm siqish (blob) bor. XSS boʻlgan taqdirda ham zarar cheklanishi kerak: begona saytdan skript yuklash, maʼlumotni begona serverga yuborish, saytni boshqa saytga iframe ichida joylash (clickjacking).

Next.js oʻz sahifalariga inline skriptlar qoʻshadi (hydration maʼlumotlari). Ularni nonce bilan qatʼiy cheklash mumkin, lekin bu barcha sahifalarni har soʻrovda serverda render qilishga majbur qiladi — statik oldindan render va kesh (Cache Components, ADR-0002) yoʻqoladi, sayt sekin mobil internetda sezilarli sekinlashadi.

## Qaror

**Sahifalar** (Next.js, `frontend/src/lib/security-headers.ts`):

| Direktiva                                 | Qiymat                                                                                               | Sabab                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `default-src`                             | `'self'`                                                                                             | Qolgan hammasi — faqat oʻz saytimiz                          |
| `script-src`                              | `'self' 'unsafe-inline'` + `telegram.org`, `accounts.google.com/gsi/client` (dev'da `'unsafe-eval'`) | Next.js inline skriptlari; kirish vidjetlari                 |
| `style-src`                               | `'self' 'unsafe-inline'` + `accounts.google.com/gsi/style`                                           | Komponent uslublari, Google tugmasi                          |
| `img-src`                                 | `'self' data: blob:` + xarita provayderi                                                             | QR, rasm siqish, xarita                                      |
| `connect-src`                             | `'self'` + xarita provayderi + `accounts.google.com/gsi/` (dev'da `ws: wss:`)                        | API, plitkalar, Google                                       |
| `worker-src`                              | `'self' blob:`                                                                                       | MapLibre worker'i (`/vendor`)                                |
| `frame-src`                               | `oauth.telegram.org`, `accounts.google.com/gsi/`                                                     | Kirish vidjetlari iframe'lari                                |
| `frame-ancestors`                         | `'none'`                                                                                             | Saytni iframe'ga joylab boʻlmaydi                            |
| `object-src` / `base-uri` / `form-action` | `'none'` / `'self'` / `'self'`                                                                       | Plaginlar yoʻq; `<base>` va formalar orqali chalgʻitish yoʻq |

Xarita provayderi `NEXT_PUBLIC_MAP_STYLE_URL` dan olinadi — provayder oʻzgarsa, CSP ham avtomatik oʻzgaradi.

Qoʻshimcha: `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()` (joylashuv faqat "Yaqin atrofimda" uchun; rasmlar fayl tanlash orqali — kamera ruxsati kerak emas), `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Google va Telegram kirish oynalari), `Referrer-Policy: strict-origin-when-cross-origin` (hisobot sahifasida — `no-referrer`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

**API va rasmlar** (Django, `SecurityHeadersMiddleware`): `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-origin`.

**HSTS** — HTTPS toʻliq ishlashi tasdiqlangach (5-bosqich, `DJANGO_HSTS_SECONDS` va reverse proxy).

## Koʻrib chiqilgan muqobillar

- **Nonce bilan qatʼiy CSP (`'strict-dynamic'`)** — inline XSS'ga qarshi kuchliroq, lekin barcha sahifalar dinamik renderga oʻtadi (statik kesh yoʻq). Saytda foydalanuvchi kiritgan HTML koʻrsatilmaydi, React matnni avtomatik ekranlaydi — xavf/foyda nisbati hozir buni oqlamaydi. Foydalanuvchi kontenti (masalan, formatlangan matn) paydo boʻlsa, qayta koʻrib chiqiladi.
- **Faqat `Report-Only`** — buzilishlarni koʻrsatadi, lekin bloklamaydi; E2E testlar buzilish yoʻqligini tekshirgani uchun darhol bloklash rejimi tanlandi.

## Oqibatlar

- Yangi tashqi manba (analitika, CDN, boshqa xarita) qoʻshilsa — `security-headers.ts` ga aniq qoʻshish kerak, aks holda brauzer bloklaydi. Bu ataylab: har bir tashqi bogʻliqlik koʻrinib turadi.
- E2E `e2e/security.spec.ts` asosiy sahifalarda (xarita, kirish vidjetlari, admin panel bilan) CSP buzilishi yoʻqligini tekshiradi; detektor ataylab qilingan buzilishni ushlashi sinalgan.

## Yangilanish (2026-10-31): Zod va `eval` (4.4)

Productionda `'unsafe-eval'` yoʻq, shuning uchun `eval`/`new Function` ishlatadigan kutubxona jim buziladi. Lighthouse biznes sahifasida shuni topdi: Zod 4 sxemalarni tezlashtirish uchun `new Function` ishlatadi. Qaror: Zod `jitless` rejimida (`frontend/src/lib/zod-config.ts`); CSP oʻzgarmaydi. Buzilish sahifa yuklangandan keyin, kechiktirilgan modulda ham sodir boʻlishi mumkin — E2E har sahifadan keyin kutadi va buzilishlarni sahifalar boʻylab yigʻadi (`jitless` oʻchirilganda test buzilishni ushlashi tekshirilgan).
