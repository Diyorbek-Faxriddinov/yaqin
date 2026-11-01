# 0005. Hosting Oʻzbekistonda

- **Holat:** Qabul qilingan; 2026-11-01 da yangilangan (provayder, domen, fayllar)
- **Sana:** 2026-10-25

## Kontekst

"Shaxsga doir maʼlumotlar toʻgʻrisida"gi qonun Oʻzbekiston fuqarolarining shaxsiy maʼlumotlari Oʻzbekiston hududidagi serverlarda saqlanishini talab qiladi. Foydalanuvchilar Toshkentda. Byudjet kichik.

## Qaror

- Maʼlumotlar bazasi, fayllar va backend — Oʻzbekistondagi VPS'da, Docker Compose bilan.
- Frontend ham oʻsha serverda (Next.js Node rejimida) — APIʼga murojaat tez boʻladi.
- HTTPS — Caddy yoki Nginx + Let's Encrypt.
- Zaxira nusxalar shifrlanadi va boshqa joyda saqlanadi; tiklash muntazam sinab koʻriladi.
- Shaxsiy maʼlumotlar minimal yigʻiladi; foydalanuvchi joylashuvi serverda saqlanmaydi.

## Koʻrib chiqilgan muqobillar

- **Vercel + xorijiy DB** — oddiy, lekin qonun talabiga zid va mahalliy foydalanuvchilar uchun sekinroq.
- **Vercel (frontend) + mahalliy backend** — har bir server render xorijdan Oʻzbekistonga soʻrov yuboradi, kechikish ortadi.

## Oqibatlar

- Mahalliy hosting TAS-IX orqali foydalanuvchilarga tezroq ishlaydi.
- Serverni oʻzimiz boshqaramiz: yangilanishlar, monitoring, zaxira nusxalar — 5-bosqichda sozlanadi.
- Huquqiy talablar huquqshunos bilan tasdiqlanishi kerak.

## Yangilanish (2026-11-01): provayder, domen va fayllar

- **Provayder — Servercore (Toshkent, TAS-IX).** Mahalliy yuridik shaxs bor, soatlik hisob, snapshot va Toshkentdagi S3 xotira. Solishtirilganlar: Airnet, UzCloud (Uztelecom), aHOST, Dicloud va boshqalar. AfzalCloud rad etildi: kompaniya maʼlumoti va zaxira shartlari yoʻq. Server: 2 vCPU, 4 GB RAM, ~50 GB SSD, Ubuntu 24.04 LTS.
- **Domen — `yaqinapp.uz`.** `yaqin.uz` band, egasi bilan gaplashilmoqda. Olinsa, asosiy domen almashtiriladi va `yaqinapp.uz` doimiy yoʻnaltiriladi.
- **Fayllar (rasmlar) — serverdagi diskda.** Caddy beradi, oʻzgarmas kesh bilan. ADR-0004 dagi "S3-mos obyekt saqlash" oʻrniga tanlandi. Sabablari: bitta server uchun oddiyroq, rasm soʻrovlari TAS-IX ichida tez, alohida xizmat va kalit kerak emas. S3 (Toshkent) — shifrlangan zaxira nusxalar uchun. Rasmlar hajmi serverga sigʻmay qolsa, S3'ga koʻchirish qayta koʻrib chiqiladi.
- **Tuzilma va joylash tartibi** — [docs/deployment.md](../deployment.md).
