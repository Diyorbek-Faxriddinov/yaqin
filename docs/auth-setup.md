# Kirishni sozlash: Telegram, Google va admin 2FA

Lokal integratsiyada (`scripts/local/start.ps1`) haqiqiy kirishni sinash uchun yoʻriqnoma. Hammasi bepul. Maxfiy qiymatlar (bot tokeni) faqat lokal `.env` fayllariga yoziladi — ular Git'ga tushmaydi.

> Sozlamani oʻzgartirgandan keyin `start.ps1` oynalarini yopib, qayta ishga tushiring — Next.js va Django sozlamalarni ishga tushganda oʻqiydi.

## 1. Telegram bot

Telegram Login Widget faqat botga bogʻlangan **domen**da ishlaydi (`localhost` emas). Lokal sinov uchun vaqtinchalik HTTPS manzil — Cloudflare Tunnel (`D:\tools\cloudflared`).

1. Telegram'da [@BotFather](https://t.me/BotFather) → `/newbot`.
   - Nomi: masalan, `Yaqin (sinov)`.
   - Username: `bot` bilan tugashi shart, masalan, `yaqin_sinov_bot`.
2. BotFather bergan **tokenni** nusxalang (`123456789:AA...`). ⚠ Bu parol bilan teng: hech kimga yubormang, Git'ga qoʻshmang. Sizib chiqsa — BotFather'da `/revoke`.
3. Fayllarga yozing:
   - `backend/.env`: `TELEGRAM_BOT_TOKEN=<token>`
   - `frontend/.env.local`: `NEXT_PUBLIC_TELEGRAM_BOT=yaqin_sinov_bot` (`@` siz)
4. Tunnel bilan ishga tushiring:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1 -Tunnel
   ```

   Oxirida `https://<tasodifiy>.trycloudflare.com` manzil chiqadi.

5. BotFather → `/setdomain` → botingiz → tunnel manzilining **host** qismi (masalan, `abc-def.trycloudflare.com`).
6. Tunnel manzilini brauzerda oching → **Kirish** → Telegram tugmasi → Telegram'da tasdiqlang → saytga kirgan holda qaytasiz.

Eslatmalar:

- Tunnel manzili har ishga tushirishda oʻzgaradi — har safar `/setdomain` qilinadi. Doimiy domen — 5-bosqichda.
- Tunnel ochiq paytda saytingiz internetdan koʻrinadi. Sinovdan keyin "Yaqin tunnel" oynasini yoping.
- Shu tunnel manzili telefonda ham ochiladi (4.5-qadam: joylashuv va kamera faqat HTTPS'da ishlaydi).

## 2. Google OAuth Client ID

Google `http://localhost` manzilida ishlaydi — tunnel shart emas.

1. [Google Cloud Console](https://console.cloud.google.com/) → yangi loyiha (masalan, `Yaqin`).
2. **Google Auth Platform** (yoki "APIs & Services → OAuth consent screen"):
   - Branding: ilova nomi, sizning email'ingiz.
   - Audience: **External**, holati **Testing**; "Test users" ga oʻz Gmail'ingizni qoʻshing (sinov paytida faqat shu akkauntlar kira oladi).
3. **Clients** (yoki "Credentials → Create credentials → OAuth client ID") → turi **Web application**:
   - **Authorized JavaScript origins:** `http://localhost:8090` va `http://localhost`.
   - Redirect URI kerak emas (popup rejimi).
4. **Client ID** ni nusxalang (`....apps.googleusercontent.com`). Client secret ishlatilmaydi — uni hech qayerga yozmang.
5. Ikkala faylga bir xil qiymat:
   - `backend/.env`: `GOOGLE_CLIENT_ID=<client id>`
   - `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>`
6. `start.ps1` (tunnelsiz) → `http://localhost:8090/kirish` → Google tugmasi.

Backend email'ni saqlamaydi — faqat Google'dagi doimiy identifikator, ism va rasm (maxfiylik siyosati).

## 3. Admin 2FA (autentifikator ilova)

1. Telefoningizga Google Authenticator, Aegis (Android) yoki shunga oʻxshash ilova oʻrnating.
2. Bir martalik Root yaratish:

   ```powershell
   cd backend
   .venv\Scripts\python manage.py createroot --username root --display-name "Bosh administrator"
   ```

3. `http://localhost:8090/admin` → login va parol → ekrandagi QR'ni ilova bilan skanerlang → ilova koʻrsatgan 6 xonali kod.
4. Keyingi kirishlarda faqat parol va ilovadagi kod.

## Muammo boʻlsa

| Belgisi                                                               | Sababi                                                                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Kirish sahifasida "Telegram va Google orqali kirish hali sozlanmagan" | `frontend/.env.local` da `NEXT_PUBLIC_TELEGRAM_BOT` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` yoʻq yoki oynalar qayta ishga tushirilmagan |
| Telegram vidjetida "Bot domain invalid"                               | `/setdomain` qilinmagan yoki tunnel manzili oʻzgargan                                                                            |
| "Bu usul bilan kirish hozircha ishlamayapti"                          | `backend/.env` da `TELEGRAM_BOT_TOKEN` / `GOOGLE_CLIENT_ID` yoʻq                                                                 |
| Google: "access blocked"                                              | Akkauntingiz "Test users" roʻyxatida yoʻq yoki origin `http://localhost:8090` qoʻshilmagan                                       |
| Admin kodi notoʻgʻri                                                  | Telefon vaqti avtomatik emas — sozlamalarda "Avtomatik vaqt" ni yoqing                                                           |
