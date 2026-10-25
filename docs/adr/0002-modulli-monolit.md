# 0002. Mikroservislar oʻrniga modulli monolit

- **Holat:** Qabul qilingan
- **Sana:** 2026-10-25

## Kontekst

Jamoa — bir kishi va AI yordamchi, muddat — 3 oy, dastlabki yuklama kichik (bitta shahar). Platforma koʻp sohani qamraydi: katalog, qidiruv, sharhlar, moderatsiya, ruxsatlar, kelajakda buyurtma va toʻlovlar.

## Qaror

Backend — bitta Django ilovasi, lekin qatʼiy chegaralangan modullarga boʻlingan: `accounts`, `rbac`, `catalog`, `businesses`, `listings`, `search`, `reviews`, `moderation`, `notifications`, `media`, `audit`, `stats`. Modullar bir-birining ichki modellariga emas, servis funksiyalariga murojaat qiladi.

Frontend — bitta Next.js ilovasi, uchta zona: ommaviy sayt, mijoz kabineti, admin panel.

## Koʻrib chiqilgan muqobillar

- **Mikroservislar** — deploy, tarmoq xatolari, taqsimlangan tranzaksiyalar va monitoring murakkablashadi; foydasi katta yuklama va katta jamoada seziladi. Hozir ortiqcha.
- **Chegarasiz monolit** — tez boshlanadi, lekin vaqt oʻtishi bilan modullar chalkashib ketadi.

## Oqibatlar

- Bitta deploy, bitta maʼlumotlar bazasi, oddiy tranzaksiyalar.
- Kerak boʻlsa (masalan, qidiruv yoki bildirishnomalar) modulni alohida servisga ajratish uchun chegaralar tayyor.
- Admin panelni keyin alohida ilovaga yoki subdomenga (`admin.`) ajratish mumkin.
