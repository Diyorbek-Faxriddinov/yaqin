# 0006. Autentifikatsiya usullari

- **Holat:** Qabul qilingan; 2026-11-02 da yangilangan (Telegram vidjeti)
- **Sana:** 2026-10-25

## Kontekst

Yuridik shaxs yoʻq — SMS provayderlar bilan shartnoma tuzish qiyin. Oʻzbekistonda Telegram deyarli hammada bor. Administratorlar platformaning eng xavfli akkauntlari.

## Qaror

| Foydalanuvchi       | Kirish usuli                                            |
| ------------------- | ------------------------------------------------------- |
| Mijoz               | Telegram Login yoki Google                              |
| Root, administrator | Login + kuchli parol (Argon2) + **majburiy 2FA (TOTP)** |
| Biznes egasi        | Keyingi bosqich (qarang: ADR-0007)                      |

- Sessiya — `httpOnly`, `Secure`, `SameSite=Lax` cookie + CSRF token. Token `localStorage` da saqlanmaydi.
- Kirishga urinishlar soni cheklanadi (rate limiting), faol sessiyalarni koʻrish va bekor qilish mumkin.
- Cheklov **IP + login** juftligi boʻyicha (va IP boʻyicha umumiy chegara) boʻladi. Faqat login boʻyicha bloklash begona odamga root'ni ataylab bloklab qoʻyish imkonini beradi (mock qatlami soddalik uchun faqat login boʻyicha cheklaydi — 2.7).
- Admin sessiyasi alohida cookie'da (`adminsessionid`, `SameSite=Strict`, 8 soat) — mijoz sessiyasidan mustaqil.
- Mock rejimida Telegram/Google oʻrniga "Demo foydalanuvchi sifatida kirish" tugmasi boʻladi.

### Yangilanish (3.5): admin kirishi amalda

- Kirish uch qadamli boʻlishi mumkin: `login` (parol) → `setup` (faqat birinchi kirishda yoki parol tiklangandan keyin: yangi parol + TOTP kaliti QR orqali) → `2fa` (kod). Sozlash maʼlumotlari faqat toʻgʻri kod kiritilgach saqlanadi.
- TOTP kaliti bazada shifrlangan (Fernet); bir kodni qayta ishlatib boʻlmaydi.
- Cheklov: IP + login juftligi (5 xato / 15 daqiqa), faqat login boʻyicha yuqoriroq chegara (20) va IP boʻyicha umumiy chegara.
- `csrftoken` cookie mijoz va admin sessiyalari uchun umumiy: yangi sessiya ochiq turgan boshqasining tokenini oladi.

### Yangilanish (2026-11-02): Telegram vidjeti — qaytish manzili orqali

Birinchi joylashda (5.4) Telegram tugmasi saytda umuman chiqmadi. Sababi: vidjet `data-onauth` matnini `eval` bilan bajaradi, CSP esa `unsafe-eval` ga ruxsat bermaydi. Lokal sinovda bu ko'rinmagan, chunki `next dev` CSP'si eval'ga ruxsat beradi.

- Vidjet endi `data-auth-url` bilan ishlaydi. Telegram kirgandan keyin foydalanuvchini kirish sahifasiga imzolangan maydonlar bilan qaytaradi (`?id=…&hash=…`, `next` saqlanadi).
- Sahifa maydonlarni darhol manzildan olib tashlaydi (`history.replaceState`), keyin backendga yuboradi. Imzo va muddat avvalgidek backendda tekshiriladi.
- `unsafe-eval` qo'shilmadi: u butun saytda XSS himoyasini zaiflashtirardi.

## Oqibatlar

- MVP'da SMS xarajati va shartnoma kerak emas.
- Telegram yoki Google akkaunti boʻlmagan foydalanuvchi sharh qoldira olmaydi (lekin hamma narsani koʻra oladi).
- Yuridik shaxs paydo boʻlgach, telefon raqam + SMS kod qoʻshilishi mumkin.
