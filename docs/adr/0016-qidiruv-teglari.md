# 0016. Mahsulot teglari va qidiruvni kengaytirish

- **Holat:** Qabul qilingan (2026-11-07)
- **Sana:** 2026-11-07

## Kontekst

Odamlar bir narsani har xil soʻz bilan qidiradi: "soch olish", "stirjka", "стрижка". Biznes kiritishda shu soʻzlarni "Boʻlim" maydoniga yozish zarurati chiqdi, lekin bu maydon qidiruv uchun emas:

- "Boʻlim" biznes sahifasida sarlavha boʻlib chiqadi va mahsulotlarni aynan bir xil matn boʻyicha guruhlaydi: har mahsulotga oʻz teglari yozilsa, har biri alohida boʻlimga aylanadi.
- `Item.search_text` da faqat mahsulot nomi bor. "Boʻlim"dagi soʻz biznesni topadi, lekin mahsulot natijada koʻrsatilmaydi va qidiruv takliflarida chiqmaydi.

Hozirgi qidiruvning boshqa cheklovlari:

- mahsulot tavsifi, xususiyatlari va biznes tavsifi qidiruvga kirmaydi;
- soʻrovdagi har bir soʻz mos kelishi shart: "arzon soch olish" da "arzon" hech qayerda boʻlmasa, natija boʻsh;
- kirill lotinga oʻgiriladi, lekin maʼno bogʻlanmaydi.

## Qaror

### 1. Mahsulotda alohida "Qidiruv teglari" maydoni

- `Item.tags` — satrlar roʻyxati (`JSONField`). "Boʻlim" oʻzgarmaydi va guruhlash uchun qoladi.
- **Saytda koʻrinmaydi:** ommaviy API (`Item`) teglarni qaytarmaydi. Faqat `AdminItem` da, tahrirlash uchun.
- **Qoidalar:** koʻpi bilan 15 ta teg, har biri 2–40 belgi. Bir xil teg (`normalize_for_search` boʻyicha) bir marta saqlanadi. Buzilsa — `400`, `fields.tags`.
- `ItemInput.tags` ixtiyoriy: yuborilmasa, yangi mahsulotda boʻsh, mavjudida **oʻzgarmaydi**. Yangilanish paytida eski brauzer sahifasi teglarni oʻchirib yubormasligi uchun.
- **Kiritish:** yozib Enter yoki vergul; telefonda ham qulay. Pastda taklif tugmalari.
- **Egalar:** kabinetda shu forma. `tags` taklif maydoni boʻladi (`item.tags`), moderator solishtiruvda koʻradi. Spamga qarshi himoya — chegara va moderatsiya.

### 2. Teg takliflari

Bir xil soʻzni har safar yozmaslik uchun: shu kategoriyada eʼlon qilingan bizneslar mahsulotlarida eng koʻp ishlatilgan 20 ta teg hamda shu biznesning oʻz teglari. Ikkita endpoint (admin va kabinet), chunki ular turli sessiya va ruxsat bilan ishlaydi. Ommaviy endpoint qilinmaydi: teglar saytda koʻrinmasligi kerak.

### 3. Qidiruv matni kengayadi

- `Item.search_text` (`CharField(200)` → `TextField`): nom, boʻlim, teglar, xususiyat qiymatlari, tavsif.
- `Business.search_text`: hozirgilar, biznes tavsifi va mahsulotlarning qidiruv matni.
- Natijada teg mahsulotni ham topadi: biznes kartasida "mos mahsulotlar" va qidiruv takliflarida chiqadi.
- Mavjud yozuvlar uchun `manage.py rebuild_search` buyrugʻi, joylashdan keyin bir marta. Matn qoidasi keyinroq oʻzgarsa ham shu buyruq ishlatiladi.

### 4. Ortiqcha soʻz natijani boʻshatmasin

- Avval hozirgi qattiq qidiruv: har bir soʻz mos kelishi kerak.
- Natija **boʻsh** boʻlsa va soʻrovda 3+ harfli kamida ikkita soʻz boʻlsa — yumshoq qidiruv: soʻzlarning kamida yarmi (yuqoriga yaxlitlab) mos kelishi yetarli. Koʻproq soʻz mos kelgani birinchi, keyin tanlangan saralash.
- Kategoriya, tuman va "hozir ochiq" filtrlari yumshatilmaydi.
- `BusinessPage.relaxed: true` boʻladi va sahifa ogohlantiradi: "Aniq mos natija topilmadi — oʻxshashlari koʻrsatilmoqda". Foydalanuvchi aldanmasligi uchun.
- Qidiruv takliflari qattiqligicha qoladi. `/map/markers` soʻrov matnini qabul qilmaydi, unga taʼsir yoʻq.

### 5. Hujjatlar va mock

- Mock qatlam (`src/mocks/db.ts`, `src/lib/text/normalize`) backend bilan bir xil qoidalarda ishlaydi, chunki E2E ikkala rejimda bir xil natija kutadi.
- Maxfiylik siyosati oʻzgarmaydi: teglar shaxsiy maʼlumot emas va qidiruv soʻrovlari saqlanmaydi.

API shartnomasi — asosiy [docs/api/openapi.yaml](../api/openapi.yaml).

## Koʻrib chiqilgan muqobillar

- **"Boʻlim" chegarasini olib, teglarni shu yerga yozish.** Rad etildi: teglar sarlavha boʻlib koʻrinadi, har mahsulot alohida boʻlimga tushadi va mahsulot baribir natijada chiqmaydi.
- **Faqat umumiy sinonimlar lugʻati.** Keyinga qoldirildi. Lugʻat umumiy soʻzlarni har mahsulotga yozish zaruratini yoʻqotadi, lekin brend va mahalliy nomlarni qamramaydi. Teglar tezroq natija beradi va qaysi soʻzlar takrorlanishini koʻrsatadi — lugʻat shu maʼlumotdan toʻldiriladi. Alohida ADR bilan.
- **Teglarni saytda koʻrsatish.** Rad etildi: sahifa soʻzlar uyumiga aylanadi. Xaridorga kerakli maʼlumot — nom, boʻlim va xususiyatlar.
- **Elasticsearch yoki alohida qidiruv tizimi.** Rad etildi: bu hajmda ortiqcha xizmat va server xarajati. PostgreSQL trigram qidiruvi yetarli.
- **AI orqali qidiruv.** Rad etildi: har soʻrov uchun xarajat va kechikish. Keyinroq lugʻatga sinonim taklif qilishda koʻrib chiqilishi mumkin, tasdiqlash odamda qoladi.

## Oqibatlar

- Mahsulot formasiga bitta maydon qoʻshiladi. Kiritish ixtiyoriy.
- Tavsif qidiruvga kirgani uchun natijada biroz shovqin boʻlishi mumkin: tavsifda tilga olingan, lekin sotilmaydigan narsa ham topiladi. Natijalar hali mos kelish darajasi boʻyicha saralanmaydi; shikoyat chiqsa, alohida qaraladi.
- Umumiy soʻzlarni har mahsulotga yozish kamchiligi qoladi. Taklif tugmalari yengillashtiradi, toʻliq yechim — lugʻat.
- Topilmagan qidiruvlar hisoboti bu qarorga kirmaydi: u soʻrovlarni saqlashni talab qiladi, ular shaxsiy maʼlumot boʻlishi mumkin. Alohida qaror va maxfiylik matni kerak.
