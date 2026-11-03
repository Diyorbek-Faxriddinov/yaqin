# 0008. MVP doirasi

- **Holat:** Qabul qilingan; 2026-11-04 da yangilangan (biznes kabineti)
- **Sana:** 2026-10-25

## Kontekst

Maqsad — onlayn boʻlmagan bizneslarni xaritada koʻrsatib auditoriya yigʻish. Muddat — 3 oy, bitta shahar (Toshkent), barcha kundalik yoʻnalishlar. Bizneslar boshida faol emas.

## Qaror

**MVP'ga kiradi:**

- Ommaviy sayt: kategoriyalar, qidiruv, filtrlar, masofa boʻyicha saralash, xarita, biznes profili, mahsulot/xizmat sahifasi
- Bogʻlanish tugmalari: qoʻngʻiroq, Telegram, Yandex/Google xaritada yoʻl
- Sharhlar, sevimlilar, shikoyatlar
- "Biznesingizni qoʻshing" soʻrov formasi
- Admin panel (telefonga moslashgan): tezkor biznes qoʻshish, katalog, kategoriyalar va atributlar, moderatsiya, administratorlar va ruxsatlar, audit, statistika
- Biznes statistikasi (koʻrishlar, bosishlar) va egasi uchun hisobot havolasi
- Interfeys tillari: oʻzbek (lotin) va rus

**MVP'ga kirmaydi** (sababi bilan):

| Imkoniyat                           | Sabab                                                       |
| ----------------------------------- | ----------------------------------------------------------- |
| Buyurtmalar                         | Bizneslar faol emas — javobsiz buyurtma ishonchni yoʻqotadi |
| Xizmatga yozilish, navbat           | Xuddi shu sabab; murakkab                                   |
| Savatcha, yetkazib berish, kuryer   | Buyurtmalarga bogʻliq                                       |
| Onlayn toʻlov, komissiya, tariflar  | Yuridik shaxs va alohida huquqiy tahlil kerak               |
| SMS                                 | Shartnoma kerak; Telegram yetarli                           |
| Biznes kabineti, egalikni oʻtkazish | ADR-0007 — keyingi bosqich                                  |
| Mijoz bilan chat                    | Bizneslar faol emas                                         |

Hisobchi va kuryer rollari ruxsatlar modelida boshidan boʻladi, interfeysi tegishli modullar bilan chiqadi.

## Oqibatlar

- 3 oy ichida ishga tushirish va maʼlumot yigʻishga vaqt qoladi.
- Keyingi imkoniyatlar qoʻshilganda arxitekturani qayta qurish kerak emas.

## Yangilanish (2026-11-04): biznes kabineti

"Biznes kabineti, egalikni oʻtkazish" MVP'dan keyingi birinchi imkoniyat sifatida qoʻshilmoqda — [ADR-0015](0015-biznes-kabineti.md) (6-bosqich). Sabab: sayt ishga tushgach, maʼlumot yigʻish (jamoa — bitta odam) oʻsishning eng tor joyi boʻlib chiqdi. Egalar faqat taklif qiladi, moderator tasdiqlaydi — maʼlumot ishonchliligi saqlanadi. Jadvaldagi boshqa bandlar oʻz kuchida.
