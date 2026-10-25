# 0007. Boshqariladigan biznes modeli

- **Holat:** Qabul qilingan
- **Sana:** 2026-10-25

## Kontekst

Doʻkon egalari boshida platformaga ishonmaydi va oʻz profilini yuritmaydi. Muallif doʻkonlarga borib, ularning roziligi bilan maʼlumot va rasmlarni yigʻadi va profillarni oʻzi yuritadi.

Doʻkonlarga login/parol berib, keyin ularning akkauntiga kirish xavfli: parol muallifga maʼlum boʻladi, audit jurnalida kim nima qilgani ajralmaydi, "boshqa foydalanuvchi nomidan kirish" funksiyasi suiisteʼmolga ochiq.

## Qaror

- Biznes **"platforma boshqaruvida"** holatida yaratiladi va egasiz boʻladi.
- Root (yoki ruxsati bor administrator) biznes profili va katalogini **admin panelning oʻzida** toʻgʻridan-toʻgʻri tahrirlaydi. Hech kimning akkauntiga kirilmaydi.
- Har bir oʻzgarish audit jurnaliga "kim → qaysi biznes uchun → nima" koʻrinishida yoziladi.
- Biznes qoʻshilganda **rozilik** qayd etiladi: kim, qachon, nimani eʼlon qilishga rozi boʻldi (ixtiyoriy — hujjat rasmi).
- Egaga **faqat oʻqish uchun hisobot havolasi** berilishi mumkin: maxfiy, bekor qilinadigan, shaxsiy maʼlumotsiz (koʻrishlar va bosishlar soni).
  - Token ~250 bit tasodifiy; backend faqat uning SHA-256 xeshini saqlaydi — havola faqat yaratilganda bir marta koʻrsatiladi, yoʻqolsa yangisi yaratiladi (eskisi bekor boʻladi).
  - Sahifa `noindex`, `Referrer-Policy: no-referrer`, keshlanmaydi; ochilishlar soni va oxirgi ochilgan vaqt adminga koʻrinadi (2.9).

## Keyingi bosqich

Bizneslar faollashganda: bir martalik taklif havolasi/QR orqali **egalikni oʻtkazish**, ega parolni oʻzi oʻrnatadi, biznes kabineti ochiladi. Backenddagi ruxsatlar modeli bunga boshidan tayyor (ADR-0009).

## Oqibatlar

- Muallif hech kimning parolini bilmaydi; audit toʻgʻri qoladi.
- MVP'da biznes kabineti interfeysi kerak emas — frontend hajmi qisqaradi.
