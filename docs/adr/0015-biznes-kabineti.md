# 0015. Biznes kabineti: egalar oʻzgarish taklif qiladi, moderator tasdiqlaydi

- **Holat:** Taklif (6.1 — koʻrib chiqilmoqda)
- **Sana:** 2026-11-04

## Kontekst

MVP'da bizneslarni faqat platforma jamoasi yuritadi (ADR-0007): maʼlumot va rasmlarni joyida yigʻib, admin panelda kiritadi. Saytni ishga tushirgandan keyin (5-bosqich) ikki muammo koʻrindi:

- **Jamoa bitta odam.** Har bir narx, ish vaqti yoki rasm oʻzgarishi uchun do'konga qayta borish kerak — bu oʻsishning eng tor joyi.
- **Auditoriya soʻrayapti:** "Nega biznes egasi oʻz maʼlumotini oʻzi oʻzgartira olmaydi?"

Shu bilan birga MVP qarorining sabablari kuchda qolmoqda: maʼlumot ishonchliligi (soxta yoki xato maʼlumot saytga tushmasin), egalarning texnik bilimi kam, xavfsizlik (yozish huquqiga ega akkauntlar kam boʻlsin).

ADR-0007 bu bosqichni oldindan koʻzda tutgan ("bir martalik taklif havolasi orqali egalikni oʻtkazish, biznes kabineti"), ADR-0009 esa ikki darajali ruxsatlar modelini belgilagan: platforma xodimlari va biznes aʼzolari (`BusinessMembership`).

## Qaror

### 1. Egalar — platforma xodimlari emas

- Ega **mijoz akkaunti** bilan ishlaydi (Telegram yoki Google orqali kirish, ADR-0006) — admin paneliga kirmaydi, alohida parol va 2FA kerak emas.
- Egalik — `BusinessMembership` (foydalanuvchi + biznes + rol). Hozircha bitta rol: **ega**. Hisobchi, ishchi va boshqa rollar (ADR-0009) — keyinroq, modul bilan.
- Bitta biznesda koʻpi bilan **3 ta ega**; bitta foydalanuvchi bir nechta biznes egasi boʻlishi mumkin.
- Kabinet uchun **alohida, tor API** (`/cabinet/...`): admin API'ga obyekt darajasidagi tekshiruv qoʻshilmaydi. Foydalanuvchi aʼzo boʻlmagan biznes — `404`.

### 2. Egalik taklif havolasi orqali beriladi

- Admin (`business.owners` ruxsati) biznes sahifasida havola yaratadi. Havola va QR kod faqat yaratilganda bir marta koʻrsatiladi.
- Havola: `https://yaqinapp.uz/kabinet/qoshilish#<token>`. Token URL fragmentida (`#`), shuning uchun server loglariga va `Referer` sarlavhasiga tushmaydi.
- Token ~256 bit tasodifiy; backend faqat SHA-256 xeshini saqlaydi (hisobot havolasi bilan bir xil, ADR-0007). **Bir martalik, 7 kun** amal qiladi; biznesda bir vaqtda bitta faol havola — yangisi eskisini bekor qiladi.
- Ega havolani ochadi, Telegram yoki Google orqali kiradi, tasdiqlaydi — egalik yaratiladi. Takroriy bosish xato emas (taklif ikkinchi marta sarflanmaydi).
- Admin egalikni istalgan payt bekor qila oladi; ega oʻzi ham chiqishi mumkin. Ikkala holatda egasining kutilayotgan takliflari qaytarib olinadi.
- Har bir qadam (havola yaratish, qabul qilish, bekor qilish) audit jurnaliga yoziladi.

### 3. Kabinetda ega nima qila oladi

- Oʻz bizneslari roʻyxati, joriy (tasdiqlangan) maʼlumot, statistika (koʻrishlar va bosishlar — admin bilan bir xil, shaxsiy maʼlumotsiz), takliflari va ularning holati.
- **Oʻzgarish taklif qiladi:**
  - profil: tavsif, telefonlar, Telegram, Instagram, veb-sayt, qulayliklar, ish vaqti;
  - **muhim maydonlar** (moderatorga alohida belgi bilan): nom, kategoriya, tuman, manzil, xaritadagi joy;
  - katalog: mahsulot yoki xizmat qoʻshish, oʻzgartirish, oʻchirish (rasmlari bilan);
  - biznes rasmlari: qoʻshish, olib tashlash, tartib.
- **Qila olmaydi:** eʼlon qilish yoki yashirish, slug (sahifa manzili), rozilik qaydi, biznesni oʻchirish, sharhlarni oʻchirish yoki moderatsiya qilish.
- **Koʻrmaydi:** "Biznesingizni qoʻshing" soʻrovlari va ulardagi telefonlar, sharh mualliflari haqida ommaviy sahifadagidan ortiq maʼlumot, boshqa bizneslar.
- **Oʻz biznesiga sharh yoza olmaydi** (`403 own_business`) — manfaatlar toʻqnashuvi.
- Hisobot havolasi (ADR-0007) saqlanadi — kabinetga kirmaydigan egalar uchun.

### 4. Har bir oʻzgarish — taklif, moderator tasdigʻi bilan

- Ega formani saqlaganda biznes oʻzgarmaydi — **taklif** (`BusinessChange`) yaratiladi. Turlari: `profile`, `item.create`, `item.update`, `item.delete`, `photos`.
- Taklif yuborilganda maydonlar **admin API qoidalari bilan** tekshiriladi (umumiy validatsiya kodi) — ega va admin uchun qoidalar bir xil boʻladi.
- Taklif oʻzgargan maydonlarning **oʻsha paytdagi qiymatini** (`before`) saqlaydi. Moderator har bir maydon uchun uchta qiymatni koʻradi: **oldin / hozir / taklif**. "Oldin" va "hozir" farq qilsa — **ziddiyat** belgisi (taklifdan keyin kimdir oʻzgartirgan).
- Shu nishon (profil, bitta mahsulot yoki biznes rasmlari) uchun yangi taklif yuborilsa, eskisi `superseded` boʻladi — moderator faqat oxirgisini koʻradi.
- **Tasdiq** bitta tranzaksiyada: maydonlar qayta tekshiriladi (kategoriya xususiyatlari oʻzgargan boʻlishi mumkin), faqat taklifdagi maydonlar joriy maʼlumot ustiga yoziladi, audit jurnaliga "moderator → egasi taklifi" yoziladi, sayt keshlari yangilanadi.
- **Rad etish** sababi majburiy (3–200 belgi) va egaga koʻrinadi. Ega kutilayotgan taklifni oʻzi qaytarib olishi mumkin.
- Cheklovlar: biznes boʻyicha 20 ta kutilayotgan taklif, foydalanuvchi boʻyicha kuniga 30 ta.
- Yangi ruxsat **`change.review`** — Root uni yordamchi moderatorlarga bera oladi; ular boshqa admin huquqlarini olmaydi. Egalarni boshqarish — alohida ruxsat **`business.owners`**.

### 5. Taklifdagi rasmlar saytda koʻrinmaydi

- Rasmlar admin yuklashi bilan bir xil ishlovdan oʻtadi (qayta kodlash, EXIF/GPS olib tashlash), lekin **ochiq papkaga tushmaydi**: alohida papkada turadi va faqat sessiya bilan (ega yoki moderator) koʻriladi; `Cache-Control: private, no-store`.
- Tasdiqda ochiq papkaga koʻchiriladi; rad etilganda, qaytarib olinganda yoki eskirganda oʻchiriladi. Taklifga 24 soatda qoʻshilmagan yuklashlar ham oʻchiriladi (kunlik tozalash, ADR-0004).

### 6. Bildirishnomalar

- Yangi taklif — "Yaqin — server" Telegram guruhiga: biznes nomi va taklif turi, **shaxsiy maʼlumotsiz** (soʻrovlar xabari bilan bir xil usul, 5.5).
- Ega taklif holatini kabinetda koʻradi. Telegram orqali egaga xabar yuborish — keyinroq (bot uchun egaga yozishga rozilik soʻraladi).

### 7. Hujjatlar

- "Foydalanish shartlari": ega kiritgan maʼlumot uchun javobgar; moderator taklifni tahrirsiz rad etishi yoki tasdiqlashi mumkin.
- "Maxfiylik siyosati": egalik (qaysi akkaunt qaysi biznes egasi) va takliflar tarixi saqlanishi.

API shartnomasi — [docs/api/drafts/business-cabinet.yaml](../api/drafts/business-cabinet.yaml) (loyiha). 6.2 da backend bilan birga asosiy `openapi.yaml` ga koʻchiriladi: backend testlari kontraktdagi har bir operatsiya sinalganini tekshiradi, amalga oshirilmagan endpoint esa CI'ni yiqitardi.

## Koʻrib chiqilgan muqobillar

- **Egalarni admin paneliga "faqat bitta biznesni boshqaradigan" rol bilan qoʻshish.** Rad etildi:
  - admin API'ning har bir endpoint'iga obyekt darajasidagi tekshiruv kerak boʻladi; bittasi unutilsa, ega boshqa bizneslarni yoki soʻrovlardagi telefonlarni koʻradi;
  - admin panel — eng yuqori ishonch darajasi; notanish odamni u yerga kiritish keraksiz xavf;
  - admin kirishi (parol + majburiy 2FA) kichik biznes egasi uchun ogʻir;
  - administratorlarni faqat Root boshqaradi (ADR-0009) — har bir ega uchun qoʻlda akkaunt ochish kerak boʻlardi.
- **Egalar toʻgʻridan-toʻgʻri tahrirlaydi, moderatsiyasiz (yoki keyin tekshiriladi).** Hozircha rad etildi — maʼlumot ishonchliligi platformaning asosiy vaʼdasi. Keyinroq "ishonchli ega" uchun kam xavfli maydonlar (ish vaqti, "hozir mavjud") darhol chiqib, keyin koʻrib chiqilishi mumkin — alohida qaror bilan.
- **Egalar uchun alohida login va parol.** Rad etildi — Telegram yoki Google akkaunti hammada bor, parol esa unutiladi va qayta tiklash jarayonini talab qiladi.
- **Butun biznesning qoralama nusxasi (versiyalash).** Rad etildi — har bir maydon uchun taklif sodda: solishtirish, qisman tasdiqlash va ziddiyatni aniqlash oson.

## Oqibatlar

- Moderator maʼlumot yigʻmaydi — tekshiradi va tasdiqlaydi. Jamoa kengaysa, `change.review` ruxsatini yordamchilarga berish yetarli.
- Yozish huquqiga ega akkauntlar koʻpayadi — xavfsizlik kabinet API'ning torligiga va **har bir endpoint uchun "boshqa biznesni koʻrib/oʻzgartirib boʻlmaydi" testiga** tayanadi (ADR-0009, 6-qoida).
- Validatsiya kodi admin va kabinet uchun umumiy boʻladi — qoida bir joyda oʻzgaradi.
- Kutilayotgan rasmlar uchun qoʻshimcha disk joyi (cheklovlar va tozalash bilan).
- Frontend'ga yangi boʻlim: `/kabinet` (ega uchun, telefonga moslashgan) va admin paneldagi "Takliflar".
