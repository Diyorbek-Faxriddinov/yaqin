# 0005. Hosting Oʻzbekistonda

- **Holat:** Qabul qilingan (provayder 5-bosqichda tanlanadi)
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
