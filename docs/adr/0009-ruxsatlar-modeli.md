# 0009. Ruxsatlar modeli (RBAC)

- **Holat:** Qabul qilingan (amalga oshirish — 3-bosqich); 2026-11-04 da yangilangan (biznes aʼzoligi)
- **Sana:** 2026-10-25

## Kontekst

Ikki daraja bor: platforma (Root, administratorlar) va biznes (egasi, biznes admini, hisobchi, ishchi, kuryer). Bitta foydalanuvchi bir nechta biznesda turli rolda boʻlishi mumkin. Root vakolatini hech kim oʻziga bera olmasligi kerak.

## Qaror

```text
Permission          atomar ruxsat: "business.verify", "category.manage", ...
Role                ruxsatlar toʻplami; doirasi (scope): PLATFORM yoki BUSINESS
PlatformStaff       foydalanuvchi + rollar + alohida ruxsatlar
BusinessMembership  foydalanuvchi + biznes + rol (+ ixtiyoriy: faqat ayrim filiallar)
```

Qoidalar:

1. **Root — ruxsat emas, alohida belgi.** API orqali berilmaydi va oʻzgartirilmaydi; faqat serverdagi CLI buyrugʻi bilan.
2. **Standart holatda rad etish.** Har bir endpoint kerakli ruxsatni aniq eʼlon qiladi va backendda tekshiradi.
3. **Vakolatni oshirishning oldini olish.** Administrator boshqalarga faqat oʻzida bor va "berilishi mumkin" deb belgilangan ruxsatlarni bera oladi. Administratorlarni boshqarish — faqat Root. MVP'da administrator va rollarni **oʻzgartirish faqat Root**ga ruxsat etilgan; `staff.manage` — faqat koʻrish. Shu bilan vakolat oshirish yoʻli yopiq; "berilishi mumkin" belgisi administratorlarga boshqarish huquqi berilganda kerak boʻladi.
4. **Amaldagi ruxsatlar.** Root har bir administrator uchun yakuniy ruxsatlar roʻyxatini va har birining manbasini (rol yoki alohida) koʻradi.
5. **Biznes turi** qaysi modullar va rollar mavjudligini belgilaydi (sartaroshxonada kuryer yoʻq).
6. **Bizneslar izolyatsiyasi.** Biznesga tegishli soʻrovlar umumiy qatlamda `business_id` boʻyicha filtrlanadi; har bir endpoint uchun "boshqa biznes maʼlumotiga kirib boʻlmaydi" testi yoziladi.
7. **Audit.** Har bir ruxsat oʻzgarishi va admin harakati faqat qoʻshiladigan (append-only) jurnalga yoziladi.
8. **Shaxsiy maʼlumotlar eng kam ruxsat bilan.** "Biznesingizni qoʻshing" soʻrovlarida telefon raqamlari bor — ularni faqat `business.edit` egalari koʻradi. Mijozlar roʻyxatida (`user.view`) kontakt maʼlumotlari qaytarilmaydi; bloklash alohida ruxsat — `user.manage` (2.8 da qoʻshildi).

## Oqibatlar

- Frontend menyuda faqat ruxsat etilgan boʻlimlarni koʻrsatadi, lekin bu faqat qulaylik — himoya backendda.
- Biznes kabineti keyin qoʻshilganda model oʻzgarmaydi.

## Yangilanish (2026-11-04): biznes aʼzoligi amalda — ADR-0015

- `BusinessMembership` amalga oshirildi (`apps/cabinet`), hozircha bitta rol — **ega**; biznesda koʻpi bilan 3 ta. Ega — mijoz akkaunti, platforma xodimi emas.
- Kabinet uchun alohida API (`/cabinet/...`): aʼzo boʻlmagan biznes — `404`. 6-qoida boʻyicha har bir kabinet endpoint'iga "boshqa biznesni koʻrib/oʻzgartirib boʻlmaydi" testi bor (`tests/test_cabinet.py`).
- Yangi platforma ruxsatlari: `business.owners` (egalarni taklif qilish va olib tashlash), `change.review` (egalar takliflarini koʻrib chiqish). Tizim rollariga qoʻshilmadi — Root kerakli administratorga beradi.
