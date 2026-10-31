# Telefonda sinov (4.5)

Maqsad: asosiy foydalanuvchi oqimlarini haqiqiy telefonda tekshirish. Kompyuterdagi testlar (E2E) telefon oʻlchamini taqlid qiladi, lekin GPS, kamera, qoʻngʻiroq ilovasi, xarita ilovalari va sekin protsessorni tekshira olmaydi — shular uchun bu roʻyxat.

Taxminiy vaqt: 30–40 daqiqa.

## Tayyorlash (kompyuterda)

1. Ishga tushiring — tunnel va production build bilan:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1 -Tunnel -Prod
   ```

   `-Prod` — dev rejimi oʻrniga production build: telefonda sahifalar tez ochiladi va kesh haqiqiy saytdagidek ishlaydi. Build "Yaqin frontend" oynasida 1–3 daqiqa davom etadi — `Ready` chiqquncha kuting.

2. Oxirida chiqqan `https://<tasodifiy>.trycloudflare.com` manzilini telefonga yuboring (masalan, oʻzingizga Telegram'da) va telefonda **shu manzilni** oching.
3. Telegram orqali kirishni ham sinamoqchi boʻlsangiz: BotFather → `/setdomain` → bot → tunnel manzilining host qismi ([auth-setup.md](auth-setup.md)).
4. Google orqali kirish tunnel manzilida **ishlamaydi**: Google Console'da faqat `localhost` ruxsat etilgan, tunnel manzili esa har safar oʻzgaradi. Telefonda mijoz sifatida Telegram yoki "Demo foydalanuvchi" tugmasi bilan kiring.

⚠ Tunnel ochiq paytda sayt internetdan koʻrinadi. Sinovdan keyin "Yaqin tunnel" oynasini yoping.

## Natijalar

| Sana       | Qurilma                      | Natija                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------ |
| 2026-10-31 | Samsung Galaxy A52 (Android) | A1–A8, B1–B10 — hammasi ✅; topilgan masalalar — C boʻlimida |

iPhone (Safari) bilan hali sinalmagan.

## Natijani qanday yuborish

Har band uchun: ✅ ishladi / ❌ ishlamadi (+ nima boʻldi, iloji boʻlsa skrinshot). Boshida telefon modeli va brauzerni yozing (masalan, "Samsung A54, Chrome" yoki "iPhone 13, Safari"). Ikkita turli telefon (Android va iPhone) boʻlsa — yana yaxshi.

## A. Admin: doʻkonda biznes qoʻshish (eng muhim oqim)

Telefonda `…/admin` → login, parol → autentifikator ilovasidagi kod.

| #   | Qadam                                                                                      | Kutiladigan natija                                                                                                                                                       | Natija |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| A1  | Kirish (parol + 2FA)                                                                       | Boshqaruv paneli ochiladi; pastki/yon menyu telefonga sigʻadi                                                                                                            | ✅     |
| A2  | Bizneslar → yangi biznes: nom, kategoriya, tuman                                           | Maydonlar qulay, klaviatura formani yopib qoʻymaydi                                                                                                                      | ✅     |
| A3  | Joylashuv → "Hozirgi joylashuvim"                                                          | Brauzer ruxsat soʻraydi → ruxsat bering → xaritadagi belgi turgan joyingizga koʻchadi (aniqlik bir necha oʻn metr). Belgini surib yoki xaritani bosib toʻgʻrilash mumkin | ✅     |
| A4  | Rasmlar → "Rasm qoʻshish" → **Kamera** bilan suratga oling                                 | Rasm qisqa vaqtda yuklanadi (mobil internetda ham bir necha soniya), toʻgʻri burilgan (yonboshlab qolmagan)                                                              |
| A5  | Yana 2–3 ta rasm — **galereyadan**, bir yoʻla bir nechtasini tanlab                        | Hammasi yuklanadi; tartibini oʻzgartirish va oʻchirish ishlaydi                                                                                                          | ✅     |
| A6  | Telefon raqami, ish vaqti, rozilik (kim bergan) → eʼlon qilish                             | Biznes eʼlon qilinadi, xato chiqmaydi                                                                                                                                    | ✅     |
| A7  | Telefonda ommaviy saytda shu biznes sahifasini oching                                      | Darhol koʻrinadi; rasmlar va xaritadagi joylashuv toʻgʻri                                                                                                                | ✅     |
| A8  | Adminda biznesni **yashiring**, keyin ommaviy sahifani yangilang (bir necha soniya kuting) | "Sahifa topilmadi"                                                                                                                                                       | ✅     |

Sinov biznesi eʼlon qilingan boʻlsa — yashirilgan holda qoldiring (bir marta eʼlon qilingan biznes oʻchirilmaydi). Hech qachon eʼlon qilinmagan qoralamani "Holat" boʻlimida oʻchirish mumkin. ⚠ Haqiqiy doʻkon maʼlumotlarini faqat egasining roziligi bilan kiriting.

## B. Ommaviy sayt (mijoz)

| #   | Qadam                                                                       | Kutiladigan natija                                                                        | Natija |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| B1  | Bosh sahifa, kategoriyalar, qidiruv ("sartarosh")                           | Tez ochiladi, matn va tugmalar oʻqiladi, gorizontal aylantirish yoʻq                      | ✅     |
| B2  | Kategoriya sahifasida filtrlar                                              | Pastdan ochiladigan oynada; tanlangandan keyin natijalar yangilanadi                      | ✅     |
| B3  | Xarita: surish, kattalashtirish, belgini bosish, "Mening joylashuvim"       | Silliq ishlaydi; belgi bosilganda biznes kartochkasi chiqadi                              | ✅     |
| B4  | Bosh sahifada yoki kategoriyada "Yaqin atrofimda" (joylashuv ruxsati bilan) | Yaqin bizneslar masofa bilan chiqadi                                                      | ✅     |
| B5  | Biznes sahifasida **Qoʻngʻiroq qilish**                                     | Telefon ilovasi raqam bilan ochiladi                                                      | ✅     |
| B6  | **Yoʻl koʻrsatish** → Yandex va Google                                      | Tegishli xarita ilovasi (yoki sayti) manzil bilan ochiladi                                | ✅     |
| B7  | **Ulashish**                                                                | Telefonning ulashish oynasi chiqadi (Telegram va boshqalar)                               | ✅     |
| B8  | Kirish (Telegram yoki "Demo foydalanuvchi") → sevimlilarga qoʻshish         | Pastki menyudagi "Sevimlilar"da koʻrinadi                                                 | ✅     |
| B9  | Sharh yozish va "Maʼlumot notoʻgʻrimi? Xabar bering"                        | Yuboriladi; "Profil → Sharhlarim / Xabarlarim"da holati koʻrinadi                         | ✅     |
| B10 | Tilni oʻzgartirish (UZ → RU → UZ)                                           | Sahifa boshqa tilda ochiladi (baʼzi sahifalarda bosh sahifaga oʻtishi mumkin — bu maʼlum) | ✅     |

## C. Umumiy taassurot

- Qaysi sahifa sekin tuyuldi? (Tunnel orqali birinchi ochilish biroz sekinroq boʻlishi tabiiy.)
- Bosish qiyin boʻlgan kichik tugmalar, kesilib qolgan matnlar, ekranga sigʻmagan joylar boʻldimi?

Qorongʻi (tungi) tema MVP'da yoʻq — sayt telefon sozlamasidan qatʼi nazar yorugʻ ([design-system.md](design-system.md)).

### 2026-10-31 sinovida topilgan masalalar

| Masala                                                    | Qaror                                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qorongʻi rejimga oʻtish topilmadi                         | Funksiya yoʻq — MVP'da faqat yorugʻ tema (roʻyxatdagi savol xato edi). Hozircha qoʻshilmaydi; ranglar tayyor, keyinroq oson qoʻshiladi                                                      |
| Qoralama yoki eʼlon qilingan biznesni oʻchirish topilmadi | Oʻchirish umuman yoʻq edi. Qoʻshildi: hech qachon eʼlon qilinmagan qoralama — "Holat" boʻlimida "Qoralamani oʻchirish". Eʼlon qilingani faqat yashiriladi (sharhlar, statistika, havolalar) |
