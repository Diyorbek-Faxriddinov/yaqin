# 0014. Doʻkon katalogi: mahsulot rasmlari, turlangan xususiyatlar, mahsulot boʻyicha qidiruv

- **Holat:** Qabul qilingan; 2026-11-01 da yangilangan (standart xususiyatlar, qulayliklar)
- **Sana:** 2026-11-01

## Kontekst

Hostingdan oldingi koʻrib chiqishda (telefon sinovi, 4.5) doʻkon sahifasi xizmat koʻrsatuvchinikidan farq qilmasligi aniqlandi:

- Mahsulotlar faqat matnli narx roʻyxati edi. Mahsulot rasmlari yoʻq edi (`Item.images` doim boʻsh). Bu qaror 3-bosqichda maʼlumot modelida qabul qilingan edi.
- Biznes rasmi qatʼiy balandlikda keng blokda kesilardi: kvadrat rasmning ~22 foizi koʻrinardi. Qolgan rasmlar saytda umuman koʻrinmasdi.
- Admin formasida mahsulot tavsifini kiritib boʻlmasdi.
- Kategoriya xususiyatlari (`AdminAttribute`: select, multiselect, number, boolean) faqat maslahat edi. Qiymat erkin matn sifatida saqlanardi ("40...44"), rus tilidagi sahifada ham oʻzbekcha chiqardi.
- Qidiruv faqat biznes nomi, kategoriya va tuman boʻyicha ishlardi: "Nike" yoki "krossovka" deb qidirilsa, doʻkon topilmasdi.

Haqiqiy maʼlumot kiritish hostingdan keyin boshlanadi. Rasmlar keyinroq qoʻshilsa, har bir doʻkonni qaytadan toʻldirish kerak boʻlardi.

## Qaror

1. **Mahsulot rasmlari** (`ItemPhoto`): biznes rasmlari bilan bir xil ishlov (qayta kodlash, EXIF olib tashlanadi). Bitta mahsulotga koʻpi bilan 5 ta, birinchisi — asosiy. Admin API: yuklash, tartib, oʻchirish. Mahsulot yoki biznes qoralamasi oʻchirilsa, fayllar ham tranzaksiyadan keyin oʻchiriladi.
2. **Turlangan xususiyatlar.**
   - **Kirish.** `ItemAttributeInput` da `key` berilsa, bu biznes kategoriyasining xususiyati boʻladi va qiymat turi boʻyicha tekshiriladi. Xom qiymat (`raw`) saqlanadi: variant qiymatlari, son, `true`/`false`.
   - **Chiqish.** Ommaviy javobda nom va qiymat soʻralgan tilda qaytadi.
   - **Taʼrif oʻzgarsa.** Saqlangan paytdagi oʻzbekcha koʻrinish ham saqlanadi. Taʼrif oʻchirilsa yoki variant olib tashlansa, shu matn koʻrsatiladi, admin formasida esa erkin xususiyat boʻlib chiqadi.
   - **Erkin xususiyatlar** (`key: null`) avvalgidek qoladi.
3. **Admin formasi.**
   - Tavsif maydoni qoʻshildi.
   - Kategoriya xususiyatlari turiga mos boshqaruv bilan chiqadi: variantlar — tugmachalar, son — birligi bilan, Ha/Yoʻq.
   - Bo'lim maydoni shu biznesdagi mavjud boʻlimlarni taklif qiladi. U majburiy emas va umumiy roʻyxat ham emas: boʻlimlar har biznesda har xil va faqat sahifa ichida guruhlaydi.
   - Yangi mahsulot turi: biznesdagi koʻpchilik turi. Katalog boʻsh boʻlsa, kategoriyaga qarab tanlanadi (doʻkonlar va ovqatlanish — mahsulot).
4. **Ommaviy sahifa.**
   - Galereya rasmni kesmaydi: rasm toʻliq koʻrinadi, boʻsh joyni uning xiralashtirilgan nusxasi toʻldiradi. Barcha rasmlar ko'rinadi, kattalashtirib ko'rish mumkin.
   - Mahsulotlar rasmli kartochkalar toʻrida, xizmatlar narx roʻyxatida koʻrsatiladi.
   - Boʻlim sarlavhasi turga qarab: "Mahsulotlar", "Xizmatlar" yoki "Mahsulot va xizmatlar".
   - Mahsulot sahifasida schema.org Product/Service belgilari bor.
5. **Mahsulot boʻyicha qidiruv.**
   - Biznesning `search_text` iga katalogdagi nomlar va boʻlimlar qoʻshiladi. U har bir mahsulot oʻzgarishida yangilanadi.
   - Natijada `matchedItems` — nima uchun topilgani ("Topildi: Nike krossovkasi").
   - Qidiruv takliflarida (`/search/suggest`) mahsulotlar ham bor (`Item.search_text`, trigram indeks).

## Koʻrib chiqilgan muqobillar

- **Mahsulot va xizmat uchun alohida model yoki forma.** Narx, boʻlim, mavjudlik va rasmlar umumiy, farq faqat bir nechta maydonda (davomiylik). Bitta model va tur almashtirgich bilan maydonlar koʻrsatilishi yetarli.
- **Har bir oʻlcham yoki rang uchun alohida narx va qoldiq (variantlar, ombor).** Maʼlumotni platforma admini kiritadi, bizneslar faol emas (ADR-0007, ADR-0008). Qoldiq tez eskiradi va mijozni aldaydi. "Hozir mavjud" belgisi yetarli.
- **Umumiy mahsulot kategoriyalari daraxti** ("Erkaklar poyabzali › Krossovka"). Bu juda katta ish. Biznes kategoriyasi va mahsulot nomi boʻyicha qidiruv MVP uchun yetarli.
- **Boʻlimni majburiy va umumiy roʻyxatdan qilish.** Boʻlim qidiruvni belgilamaydi. Qidiruvni biznes kategoriyasi (majburiy, roʻyxatdan) va endi mahsulot nomi belgilaydi.
- **Xususiyat qiymatini faqat xom koʻrinishda saqlash.** Taʼrif oʻzgarsa, qiymat yoʻqolardi. Koʻrinish nusxasi buni oldini oladi.

## Oqibatlar

- Hostingdan keyin kiritiladigan doʻkon maʼlumotlari toʻliq boʻladi, keyin qayta toʻldirish kerak emas.
- Xususiyatlar boʻyicha ommaviy filtrlar (`filterable`) uchun xom qiymatlar tayyor. Filtrlar keyinroq, maʼlumot toʻplangach qoʻshiladi.
- Rasm xotirasi koʻpayadi. Bitta biznes uchun eng koʻpi 12 ta biznes rasmi va har mahsulotga 5 ta rasm, har biri WebP, uzun tomoni 2000 px gacha. Production xotirasi — 5-bosqich (ADR-0005).
- Katalog oʻzgarganda biznes qidiruv matni qayta hisoblanadi: har bir saqlashda bitta qoʻshimcha soʻrov.
- Frontend mock (`src/mocks/item-attributes.ts`) va backend (`apps/businesses/attributes.py`) bir xil qoidalarni takrorlaydi. Oʻzgarish ikkala joyda ham qilinadi.

## Yangilanish (2026-11-01): standart xususiyatlar va biznes qulayliklari

Hostingdan oldingi koʻrib chiqishda (5.2a) maʼlum boʻldi: production bazasida kategoriyalar xususiyatsiz boshlanadi. Xususiyatlar faqat demo maʼlumotlarida bor edi, shuning uchun mahsulot oʻlchami va brendi yana erkin matn boʻlib qolardi.

- **Standart xususiyatlar toʻplami.** 49 ta ichki kategoriyadan 46 tasi uchun xususiyatlar tayyorlandi, masalan:
  - poyabzal: oʻlcham 35–46, brend, kim uchun, material, mavsum;
  - kiyim: XS–4XL, mato;
  - ovqatlanish: porsiya, halol, achchiq, vegetarian;
  - kurslar: til, format, davomiylik;
  - avto: mashina turi.

  Toʻplam data migratsiyasi bilan yoziladi (`catalog/0003_standard_attributes`) va faqat xususiyatsiz kategoriyalarni toʻldiradi — admin oʻzgartirganini buzmaydi. Mock'dagi nusxa `standard-attributes.json`, test ikkalasini solishtiradi.

- **Biznes qulayliklari** (`Amenity`, 13 ta). Roʻyxat qatʼiy: karta va Payme/Click orqali toʻlov, yetkazib berish, olib ketish, toʻxtash joyi, Wi-Fi, konditsioner, oilaviy xona, bolalar burchagi, namozxona, aravachada kirish, oldindan yozilish, ayollar uchun alohida.
  - Nomlari va ikonkalari frontendda, ikkala tilda.
  - Bu maʼlumot doʻkonga borganda egadan soʻraladi — keyin qayta borish qimmat, shuning uchun hostingdan oldin qoʻshildi.
  - Filtr — keyinroq (`Amenity` qiymatlari tayyor).
- **Jonli navbat va oʻz chatimiz qilinmadi** (ADR-0008 sabablari). Oʻrniga "Oldindan yozilish" qulayligi bor, aloqa esa Telegram va telefon orqali.
- **Veb-sayt endi admin panelda kiritiladi.** Avval saytda koʻrsatilardi, lekin kiritib boʻlmasdi.
