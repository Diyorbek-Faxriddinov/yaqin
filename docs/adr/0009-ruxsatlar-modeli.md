# 0009. Ruxsatlar modeli (RBAC)

- **Holat:** Qabul qilingan (amalga oshirish — 3-bosqich)
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
3. **Vakolatni oshirishning oldini olish.** Administrator boshqalarga faqat oʻzida bor va "berilishi mumkin" deb belgilangan ruxsatlarni bera oladi. Administratorlarni boshqarish — faqat Root.
4. **Amaldagi ruxsatlar.** Root har bir administrator uchun yakuniy ruxsatlar roʻyxatini va har birining manbasini (rol yoki alohida) koʻradi.
5. **Biznes turi** qaysi modullar va rollar mavjudligini belgilaydi (sartaroshxonada kuryer yoʻq).
6. **Bizneslar izolyatsiyasi.** Biznesga tegishli soʻrovlar umumiy qatlamda `business_id` boʻyicha filtrlanadi; har bir endpoint uchun "boshqa biznes maʼlumotiga kirib boʻlmaydi" testi yoziladi.
7. **Audit.** Har bir ruxsat oʻzgarishi va admin harakati faqat qoʻshiladigan (append-only) jurnalga yoziladi.
8. **Shaxsiy maʼlumotlar eng kam ruxsat bilan.** "Biznesingizni qoʻshing" soʻrovlarida telefon raqamlari bor — ularni faqat `business.edit` egalari koʻradi. Mijozlar roʻyxatida (`user.view`) kontakt maʼlumotlari qaytarilmaydi; bloklash alohida ruxsat — `user.manage` (2.8 da qoʻshildi).

## Oqibatlar

- Frontend menyuda faqat ruxsat etilgan boʻlimlarni koʻrsatadi, lekin bu faqat qulaylik — himoya backendda.
- Biznes kabineti keyin qoʻshilganda model oʻzgarmaydi.
