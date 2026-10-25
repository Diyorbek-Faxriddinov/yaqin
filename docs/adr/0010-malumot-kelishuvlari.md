# 0010. Maʼlumot va matn kelishuvlari

- **Holat:** Qabul qilingan
- **Sana:** 2026-10-25

## Kontekst

Pul summalari, vaqt, oʻzbek yozuvi va identifikatorlar frontend, backend va maʼlumotlar bazasida bir xil talqin qilinishi kerak.

## Qaror

- **Pul:** butun son, **tiyinda** (1 soʻm = 100 tiyin) + valyuta (`UZS`). Float ishlatilmaydi. Koʻrsatishda soʻmgacha yaxlitlanadi: `45 000 soʻm`.
- **Raqam ajratuvchisi:** boʻlinmas boʻshliq (U+00A0), Intl'ga tayanmasdan — server va brauzerda bir xil natija.
- **Vaqt:** API'da ISO 8601 (vaqt zonasi bilan); koʻrsatishda `Asia/Tashkent`, 24 soatlik format.
- **Oʻzbek yozuvi:** interfeys matnlarida rasmiy belgilar — `oʻ`, `gʻ` uchun **ʻ (U+02BB)**, tutuq belgisi uchun **ʼ (U+02BC)**. Qidiruvda `ʻ`, `‘`, `'` va `` ` `` belgilari bir xil deb qabul qilinadi, lotin↔kirill transliteratsiya qilinadi.
- **Identifikatorlar:** UUID; ommaviy URL'larda — `slug`.
- **URL'lar:** oʻzbekcha, apostrofsiz (`/biznes-qoshish`).

## Oqibatlar

- Yaxlitlash xatolari boʻlmaydi; kelajakda Payme/Click (tiyinda ishlaydi) bilan mos.
- Foydalanuvchi qaysi apostrofni yozishidan qatʼi nazar, qidiruv natija beradi.
