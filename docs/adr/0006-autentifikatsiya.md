# 0006. Autentifikatsiya usullari

- **Holat:** Qabul qilingan
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

## Oqibatlar

- MVP'da SMS xarajati va shartnoma kerak emas.
- Telegram yoki Google akkaunti boʻlmagan foydalanuvchi sharh qoldira olmaydi (lekin hamma narsani koʻra oladi).
- Yuridik shaxs paydo boʻlgach, telefon raqam + SMS kod qoʻshilishi mumkin.
