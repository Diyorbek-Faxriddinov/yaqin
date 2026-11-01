# Ish holati

Oxirgi yangilanish: 2026-11-01

## Bosqichlar

| Bosqich | Mazmuni                           | Holat                                         |
| ------- | --------------------------------- | --------------------------------------------- |
| 0       | Gʻoya tahlili, arxitektura        | ✅ Tasdiqlangan                               |
| 1       | Frontend rejasi                   | ✅ Tasdiqlangan                               |
| 2       | Frontend ishlab chiqish           | ✅ Tasdiqlangan                               |
| 3       | Backend                           | ✅ Tasdiqlangan ([reja](backend-plan.md))     |
| 4       | Integratsiya va yakuniy tekshiruv | ✅ Tasdiqlangan ([reja](integration-plan.md)) |
| 5       | Hosting va domen                  | 🔄 Jarayonda ([tuzilma](deployment.md))       |

## 2-bosqich qadamlari

| Qadam | Mazmuni                                                                                          | Holat |
| ----- | ------------------------------------------------------------------------------------------------ | ----- |
| 2.1   | Poydevor: Next.js, TS, ESLint/Prettier, Tailwind, next-intl, Vitest, Playwright, CI, README, ADR | ✅    |
| 2.2   | Dizayn tizimi, umumiy komponentlar, layoutlar                                                    | ✅    |
| 2.3   | OpenAPI kontrakti, generatsiya, mock qatlam, demo maʼlumotlar                                    | ✅    |
| 2.4   | Bosh sahifa, kategoriyalar, roʻyxat, filtrlar, qidiruv                                           | ✅    |
| 2.5   | Biznes profili, mahsulot sahifasi, xarita                                                        | ✅    |
| 2.6   | Kirish (mock), mijoz kabineti, sharhlar, sevimlilar, shikoyatlar                                 | ✅    |
| 2.7   | Admin: kirish+2FA, layout, bizneslar, tezkor qoʻshish, katalog, rasmlar                          | ✅    |
| 2.8   | Admin: kategoriyalar, moderatsiya, shikoyatlar, soʻrovlar, foydalanuvchilar                      | ✅    |
| 2.9   | Admin: administratorlar, rollar, audit, sozlamalar, statistika, hisobot havolasi                 | ✅    |
| 2.10  | Statik sahifalar, SEO, a11y, tezlik, hujjatlar                                                   | ✅    |

## 3-bosqich qadamlari

| Qadam | Mazmuni                                                                              | Holat |
| ----- | ------------------------------------------------------------------------------------ | ----- |
| 3.1   | Poydevor: Django, PostgreSQL + PostGIS, sozlamalar, testlar, kontrakt tekshiruvi, CI | ✅    |
| 3.2   | Maʼlumot modeli va migratsiyalar                                                     | ✅    |
| 3.3   | Ommaviy API                                                                          | ✅    |
| 3.4   | Mijoz autentifikatsiyasi, kabinet                                                    | ✅    |
| 3.5   | Admin autentifikatsiyasi, RBAC, audit                                                | ✅    |
| 3.6   | Admin API: bizneslar, rasmlar, katalog                                               | ✅    |
| 3.7   | Admin API: moderatsiya, kategoriyalar, administratorlar, sozlamalar                  | ✅    |
| 3.8   | Statistika, hisobot havolasi, davriy vazifalar, xavfsizlik                           | ✅    |
| 3.9   | Kontrakt boʻyicha yakuniy tekshiruv, hujjatlar                                       | ✅    |

## 5-bosqich qadamlari

| Qadam | Mazmuni                                                                      | Holat |
| ----- | ---------------------------------------------------------------------------- | ----- |
| 5.1   | Provayder va domen                                                           | ✅    |
| 5.2   | Production sozlamalari repoda: Dockerfile'lar, compose, Caddy, CI smoke test | 🔄    |
| 5.3   | Server: SSH kalit, firewall, avtomatik yangilanishlar, Docker                | ⏳    |
| 5.4   | Birinchi joylash: maxfiy kalitlar, migratsiyalar, root, DNS, Telegram/Google | ⏳    |
| 5.5   | Zaxira (shifrlangan, S3 Toshkent, tiklash sinovi) va monitoring              | ⏳    |
| 5.6   | Yakuniy tekshiruv, HSTS, birinchi bizneslar                                  | ⏳    |

## 5.2 natijalari — production sozlamalari ([deployment.md](deployment.md))

- **Docker:**
  - `backend/Dockerfile`: Python 3.13, GDAL, gunicorn 26.2.0, root huquqisiz.
  - `frontend/Dockerfile`: Next.js standalone, uch bosqichli build.
  - `deploy/compose.yaml`:
    - xizmatlar: PostGIS, Redis, backend, kunlik tozalash, frontend, Caddy;
    - healthcheck'lar, log hajmi cheklovi;
    - tashqariga faqat 80/443;
    - baza roli superuser emas.
- **Caddy (`deploy/Caddyfile`):**
  - Let's Encrypt, `www` → asosiy domen (301);
  - siqish: `zstd`, `gzip`;
  - rasmlar diskdan (`immutable`, `nosniff`);
  - API so'rovlari 10 MB gacha;
  - kesh webhook'i tashqaridan yopiq;
  - loglar yozilmaydi (maxfiylik).
- **Rasm optimizatori uchun ichki manzil** (`MEDIA_INTERNAL_URL`, `src/lib/api/media-url.ts`, unit test). Productionda Django rasmlarni bermaydi, avval optimizator `API_URL/media` ga murojaat qilardi — productionda rasmlar ochilmay qolardi.
- **CI (`.github/workflows/docker.yml`):** image'lar yig'iladi, butun to'plam ishga tushadi, `deploy/smoke.sh` 20 ta tekshiruv qiladi.
- **Mahalliy taqlid** (Docker'siz):
  - standalone build, production Caddyfile nusxasi, waitress;
  - tekshirildi: sahifalar, qidiruv, siqish, rasmlar (Caddy va optimizator), `www` yo'naltirish, 10 MB cheklovi (413), webhook (tashqaridan 404, ichkaridan 200).
- **Topilgan va hal qilingan muammo:** standalone server `HOSTNAME=127.0.0.1` bilan bosh sahifani o'ziga 307 bilan yo'naltirardi. Docker'dagi `0.0.0.0` bilan to'g'ri ishlaydi, Dockerfile'da izoh bilan mahkamlandi.
- **Tekshirilmagan:** Dockerfile'lar va compose haqiqiy Docker'da faqat GitHub Actions'da ishlaydi (lokalda Docker yo'q). `docker compose config` va `caddy validate` bilan lokal tekshirildi.

## 5.1 natijalari — provayder va domen

- **Servercore (Toshkent)** tanlandi (ADR-0005 yangilanishi). Akkaunt tekshiruvda, server hali yaratilmagan — pul sarflanmagan.
- **Domen `yaqinapp.uz`** — faol, 2027-11-01 gacha (registrator Eskiz). `yaqin.uz` egasi bilan gaplashilmoqda.

## 4-bosqich qadamlari

| Qadam | Mazmuni                                                | Holat |
| ----- | ------------------------------------------------------ | ----- |
| 4.1   | Haqiqiy backend uchun maʼlumotlar (`seed_demo`) va E2E | ✅    |
| 4.2   | Mijoz kirishi: Telegram va Google                      | ✅    |
| 4.3   | Xavfsizlik sarlavhalari (CSP, Permissions-Policy)      | ✅    |
| 4.4   | Mustahkamlik va tezlik                                 | ✅    |
| 4.5   | Telefonda sinov                                        | ✅    |
| 4.6   | CI'da integratsiya, hujjatlar                          | ✅    |
| 4.7   | Doʻkon katalogi (hostingdan oldingi koʻrib chiqish)    | ✅    |

## 4.7 natijalari — doʻkon katalogi ([ADR-0014](adr/0014-dokon-katalogi.md))

Hostingdan oldingi koʻrib chiqishda (telefonda, oʻzimiz qoʻshgan doʻkon) topilgan kamchiliklar:

- **Biznes rasmi kesilardi.** Muqova qatʼiy balandlikda edi, kvadrat rasmning desktopda ~22 foizi koʻrinardi. Qolgan rasmlar saytda umuman koʻrinmasdi. Endi galereya: rasm toʻliq (`object-contain`), boʻsh joyni uning xiralashtirilgan nusxasi toʻldiradi. Barcha rasmlar koʻrinadi, telefonda suriladi, kattalashtiriladi, `next/image` (avval 2000 px gacha asl fayl).
- **Doʻkon xizmatdan farq qilmasdi.** Mahsulot rasmlari (5 tagacha, `ItemPhoto`, biznes rasmlari kabi qayta kodlanadi) qoʻshildi. Mahsulotlar rasmli kartochkalarda, xizmatlar narx roʻyxatida koʻrsatiladi. Sarlavha turga qarab: "Mahsulotlar", "Xizmatlar" yoki "Mahsulot va xizmatlar". Mahsulot sahifasida galereya, tavsif, schema.org Product/Service, ulashish rasmi bor.
- **Admin formasi.**
  - Tavsif maydoni qoʻshildi (avval kiritib boʻlmasdi).
  - Rasmlar: yangi mahsulotda saqlangach yuklanadi.
  - Kategoriya xususiyatlari turiga mos: oʻlcham variantlari tugmachalar, son birligi bilan, Ha/Yoʻq.
  - Boʻlim takliflari (shu biznesdagi mavjud boʻlimlar).
  - Yangi mahsulot turi: biznesdagi koʻpchilik turi, katalog boʻsh boʻlsa — kategoriyaga qarab.
  - Admin bo'limi "Narxlar" → "Katalog".
- **Xususiyatlar tartibsiz edi.**
  - Kategoriya xususiyati endi tekshiriladi va xom qiymat bilan saqlanadi.
  - Rus tilidagi sahifada nom va qiymat ruscha chiqadi (avval oʻzbekcha edi).
  - Taʼrif oʻzgarsa, saqlangan matn koʻrsatiladi.
- **Qidiruv mahsulotni topmasdi.** "Nike" yoki "krossovka" deb qidirilsa, doʻkon topilmasdi. Endi biznes qidiruv matnida katalogdagi nomlar va boʻlimlar bor. Natijada "Topildi: …" (`matchedItems`) koʻrinadi, takliflar API'sida mahsulotlar ham bor. Mavjud yozuvlar migratsiyada qayta hisoblandi (lokal bazadagi Theonly_uz endi "nike" bilan topiladi).
- **Aloqa maʼlumotlari koʻrinmasdi.** Instagram va veb-sayt admin panelda kiritilardi, lekin saytda hech qayerda chiqmasdi. Ikkinchi va keyingi telefonlar ham koʻrinmasdi. Endi biznes sahifasida "Aloqa" boʻlimi bor.
- **Kontrakt.**
  - Mahsulot rasmlari: 3 ta yangi endpoint.
  - `AdminItem` (`photos`, `attributeValues`).
  - `ItemAttributeInput.key`.
  - `BusinessSummary.matchedItems`.
  - `SearchSuggestions.items`.
- **Testlar.** Backend 509 (+16 yangi va kontrakt matritsasi), frontend unit 237 (+12), E2E backend (CI taqlidi) 270 passed, 0 beqaror. Demo: 254 passed, 1 yiqildi — `cache-revalidation` (kategoriya qoʻshish, planshet), toʻliq toʻplam yuklamasi ostida. Qayta yurgizishda 9/9 va planshetda 3 marta takrorlab — oʻtdi.
- **Telefonda (A52) va GitHub CI'da tasdiqlandi** (2026-11-01): integratsiya (haqiqiy backend bilan E2E) GitHub'da birinchi marta ishga tushdi — 270 passed; Frontend — yashil. Backend CI yangi test faylidagi tip izohlari tufayli yiqildi (lokalda `mypy apps` yurgizilgan, CI esa `mypy .` — testlar bilan) — tuzatildi.
- **Vizual tekshiruv** (skrinshot, desktop va telefon): kvadrat, keng va tik rasmlar kesilmasdan koʻrinadi. Kartochkalar, mahsulot sahifasi, admin dialogi va qidiruvdagi "Topildi" tekshirildi.

**Ataylab qilinmadi** (ADR-0014): oʻlcham yoki rang boʻyicha alohida narx va qoldiq, umumiy mahsulot kategoriyalari daraxti, majburiy umumiy boʻlimlar. Xususiyatlar boʻyicha ommaviy filtrlar keyinroq, maʼlumot toʻplangach qoʻshiladi. Qidiruv takliflari endpointi bor, lekin frontendda avtomatik toʻldirish (autocomplete) UI hali yoʻq (2-bosqichdan beri).

## 4.6 natijalari — CI'da integratsiya

- **`.github/workflows/integration.yml`** — har push va PR'da (frontend, backend, kontrakt yoki Caddyfile oʻzgarsa): PostgreSQL + PostGIS + Redis, Django, Next.js, Caddy (versiya va SHA-512 mahkamlangan — relizdan yuklab, qayta hisoblab tekshirilgan), Playwright, `npm run e2e:backend`. Xato boʻlsa — hisobot artefakt sifatida. GitHub'da hali ishga tushmagan (siz push qilganingizda birinchi marta ishlaydi); lokal taqlid: `CI=1`, UTC vaqt, 2 worker (GitHub runner kabi) — toʻliq aylana ~6 daqiqa.
- **CI taqlidi uchta haqiqiy xatoni ochdi** (hammasi productionga ham taalluqli — backend uzilganda):
  1. **Next 16.4.3 kesh ishlovchisi:** xato bilan tugagan `use cache` toʻldirishidan keyin kalit abadiy "kutilmoqda" holatida qolardi — shu kalitni soʻragan har bir sahifa jarayon qayta ishga tushguncha ochilmasdi (16.5 canary'da ham tuzatilmagan). `frontend/cache-handler.mjs` — standart ishlovchi + bir qatorli tuzatish; unit test Next'ning oʻz ishlovchisi hali ham osilishini ham tekshiradi (tuzatilsa — bilib olamiz).
  2. **Vaqt chegarasi yoʻqolishi:** Next eskirgan keshni fonda qayta toʻldirganda soʻrovdan `signal` ni olib tashlaydi — `AbortSignal.timeout` bilan qilingan vaqt chegarasi ishlamay, soʻrov javob bermaydigan backendni abadiy kutardi. `createBackendFetch` endi taymer bilan poygada; rasm proksisi ham shu orqali (avval umuman vaqt chegarasi yoʻq edi).
  3. **Next'ning gzip'i:** xato bilan tugagan oqimli javobni baʼzan yopmasdi (8 tadan 1). Siqish reverse proxy'ga oʻtkazildi (`compress: false`, Caddyfile'da `encode zstd gzip`) — productionda ham shunday boʻlishi shart.
- **Test infratuzilmasi:** "backend javob bermasa" serveri build'ning alohida nusxasida (`.next-resilience`) — avval 3101 bilan umumiy ish vaqti keshi xatolarni tasodifiy qilib yashirardi; "javob bermaydigan" port soket xatosidan yiqilmaydi; demo kirish tugmasi sahifa jonlanguncha faolsiz (admin kirishidagi kabi — undan oldingi bosish jim yoʻqolardi; E2E'da 4 ta beqaror test shundan edi).
- **Hujjatlar:** ADR-0011 (demo va haqiqiy rejim) yangilandi; ADR-0007 va ADR-0013 ga 4.4–4.5 dagi qoʻshimchalar asl matn ichidan sanali "Yangilanish" boʻlimlariga koʻchirildi (ADR qoidasi: asl matn oʻzgarmaydi); ADR indeksiga shu tartib yozildi. README'lar — CI va yangi kelishuvlar.
- Testlar: backend 481, frontend unit 225 (+4), E2E backend 261 (+1; CI taqlidida 0 beqaror), demo 246.

**Ochiq masala:** backend butunlay oʻchgan holda bir nechta admin sahifasi brauzerda parallel ochilsa, HTML oqimi xato sahifasidan keyin baʼzan yopilmaydi (foydalanuvchi xato sahifasini ~2 s da koʻradi, lekin brauzer "yuklanmoqda" holatida qoladi). Faqat admin panel, faqat backend oʻchganda; ildizi Next ichida, topilmadi. E2E foydalanuvchi koʻradigan natijani tekshiradi.

**5-bosqich uchun:** reverse proxy siqishi majburiy (Next'da oʻchirilgan); `cache-handler.mjs` server bilan birga joylanadi.

## 4.5 — tayyorgarlik (telefondagi sinovdan oldin)

- **`start.ps1 -Prod`** — Next.js dev rejimi oʻrniga production build (`.next-local`): telefonda sahifalar tez, kesh haqiqiy saytdagidek, dev belgisi yoʻq. Sinab koʻrildi: build ~50 s, sahifalar `x-nextjs-cache: HIT`, HMR yoʻq.
- **Telefon sinovi roʻyxati** — [phone-testing.md](phone-testing.md): admin oqimi (GPS, kamera, rasm siqish, eʼlon qilish, yashirish) va ommaviy sayt (xarita, qoʻngʻiroq, yoʻl koʻrsatish, ulashish, sharh, til).
- **Prefetch'da 404 (yangi topilgan):** til almashtirgich Next `Link` boʻlgani uchun Next `/ru` dan `/[locale]` qolipini oʻrganib ("optimistic routing"), prefikssiz oʻzbekcha manzillarni (`/haqida`, `/xarita`) bosh sahifa deb taxmin qilardi va mavjud boʻlmagan segmentni soʻrardi. Til almashtirgich endi oddiy havola (sahifa toʻliq yuklanadi). `optimisticRouting: false` ham sinaldi va rad etildi: har bir havola (bosh sahifadagi oʻnlab biznes kartochkalari) uchun alohida server soʻrovi — kichik serverga ortiqcha yuk. E2E (`shell.spec.ts`) eski build'da 3/3 yiqiladi, yangisida oʻtadi.
- **Kesh poygasi — haqiqiy sababi topildi va tuzatildi:** 4.4 dagi "3 s dan keyin takror" yuklama ostida yetmas edi (toʻliq E2E ~2 aylanadan birida yiqildi; 4.4 dagi toza natijalar omad edi). Sababi Next 16.4 da: `use cache` toʻldirishi soʻrovlararo boʻlishiladi va yangilanishdan keyin boshlangan render undan oldin boshlangan, hali tugamagan toʻldirishga qoʻshilib eski maʼlumot oladi; sahifa keshi uni yangi vaqt bilan yozadi. Diagnostika bilan tasdiqlandi (oʻchirishdan keyingi birinchi render `MISS`, 7 s, lekin eski maʼlumot bilan). Endi yangilash 3, 10 va 30 s dan keyin takrorlanadi (oxirgisi — eng sekin toʻldirish: backend `API_TIMEOUT_MS` 10 s). Natija: demo 6 aylana, backend 1 aylana — hammasi oʻtdi; diagnostikada poyga 3 marta yuz berib, 10 s takrori bilan tuzalgani koʻrindi. E2E kutish oynasi 45 s.
- **Testlar barqarorligi:** sharh va xabar dialoglari yuklama ostida React jonlanishidan oldin bosilib ochilmay qolardi — test dialog ochilguncha qayta bosadi.
- Testlar: backend 473, frontend unit 220, E2E backend 257 (+3), demo 243 (+3).

## 4.5 natijalari — telefondagi sinov

- **Haqiqiy telefonda sinaldi (2026-10-31, siz, Samsung Galaxy A52):** admin oqimi (2FA kirish, GPS bilan joylashuv, kamera va galereyadan rasm, eʼlon qilish, yashirish) va ommaviy sayt (xarita, "Yaqin atrofimda", qoʻngʻiroq, yoʻl koʻrsatish, ulashish, sevimlilar, sharh, xabar, til) — 18 band, hammasi ishladi. Natijalar — [phone-testing.md](phone-testing.md). iPhone (Safari) bilan hali sinalmagan.
- **Sinovda topilgan 1 — bizneslarni oʻchirish yoʻq edi.** Qaror (siz tanladingiz): faqat hech qachon eʼlon qilinmagan qoralama oʻchiriladi; eʼlon qilingani yashiriladi (sharhlar, statistika, havolalar saqlanadi) — [ADR-0007](adr/0007-boshqariladigan-biznes.md). Kontrakt: `DELETE /admin/businesses/{id}` (`business.edit`; eʼlon qilingan — 409 `business_was_published`) va `AdminBusiness.publishedAt`. Backend: rasmlar fayllari tranzaksiyadan keyin oʻchadi, soʻrovdan yaratilgan qoralama oʻchsa soʻrov `contacted` holatiga qaytadi (aks holda baza cheklovi buziladi), audit `business.delete`. Admin panel: "Holat" boʻlimida "Qoralamani oʻchirish" (tasdiqlash oynasi bilan); eʼlon qilinganida — sababi yozilgan. Mock ham bir xil. Testlar: backend (oʻchirish, rad etish, ruxsatlar, kontrakt matritsasi — 78/78), mock unit, E2E ikkala rejimda.
- **Sinovda topilgan 2 — qorongʻi tema yoʻq.** Qaror (siz tanladingiz): hozircha qoʻshilmaydi (MVP — faqat yorugʻ tema, [design-system.md](design-system.md)). Roʻyxatdagi bu savol xato edi — tuzatildi.
- **Yuklama ostidagi E2E:** toʻliq backend aylanalarida ikki marta boshqa-boshqa test yiqildi (bir marta CSP testi, bir marta "backend javob bermasa" testlari — sahifa 30 s ichida yuklanmadi). Har biri alohida 3–5 marta takrorlanganda oʻtdi, oxirgi toʻliq aylana — 260/260. Kompyuterda 12 GB RAM va standart 8 parallel worker — sinov paytida boshqa dasturlar ochiq boʻlsa, sekinlashish mumkin. Kuzatib boriladi; takrorlansa — lokal worker soni kamaytiriladi (CI'da 1 marta qayta urinish bor).
- Testlar: backend 481 (+8), frontend unit 221 (+1), E2E backend 260 (+3), demo 246 (+3).

## 4.4 natijalari

- **Backend javob bermasa** (`frontend/src/lib/api/backend-fetch.ts`): server tomonidagi API soʻrovlari `API_TIMEOUT_MS` (standart 10 s) dan keyin toʻxtatiladi va tushunarli xato beradi (503 — `backend_timeout` / `backend_unavailable`). Logga faqat usul va yoʻl yoziladi (query string'da joylashuv boʻlishi mumkin). Ommaviy sayt, admin panel va hisobot sahifasida umumiy xato sahifasi (`RouteError`): "Nimadir xato ketdi" + "Qayta urinish".
- **E2E `resilience`** (`e2e/resilience.spec.ts`, faqat backend rejimida): Next.js ulanishni qabul qilib javob bermaydigan portga ulanadi (`API_TIMEOUT_MS=1500`). Keshlangan bosh sahifa ochiladi; qidiruv va admin panel 15 s ichida xato sahifasini koʻrsatadi. Test maʼnoli ekani tekshirildi: vaqt chegarasi 60 s qilinganda yiqiladi.
- **Admin oʻzgarishidan keyin ommaviy sahifa yangilanishi** (`e2e/cache-revalidation.spec.ts`, ikkala rejimda): biznes eʼlon qilinadi → koʻrinadi, yashiriladi → yoʻqoladi; ichki kategoriya qoʻshiladi/oʻchiriladi; sozlamalardagi kontakt Aloqa sahifasida. Topilgan va tuzatilgan xatolar (`frontend/src/lib/revalidate-tags.ts`):
  - qoralama paytida ochilgan biznes sahifasi ("Sahifa topilmadi") eʼlondan keyin ham 404 boʻlib qolardi — kesh tegi notFound() natijasiga bogʻlanmaydi; endi `business:*` / `category:*` teglarida marshrut ham yangilanadi;
  - poyga holati: yangilanishdan oldin boshlangan render keyin tugab, eski maʼlumotni keshga qayta yozardi (yashirilgan biznes koʻrinib qolardi, E2E'da 3 dan 2 marta) — yangilash javobdan 3 s keyin takrorlanadi (`after()`);
  - biznes sahifasidagi Suspense oʻrami 404 holatini keshda qoldirardi — olib tashlandi, dev rejimidagi `params`/Suspense maslahati `instant = false` bilan yopildi (dev logida ogohlantirish yoʻq).
- **CSP va Zod:** Lighthouse biznes sahifasida CSP buzilishini topdi — Zod 4 tezlik uchun `new Function` (eval) ishlatadi, CSP esa uni taqiqlaydi. `z.config({ jitless: true })` (`frontend/src/lib/zod-config.ts`). `e2e/security.spec.ts` buni oʻtkazib yuborgan edi (buzilishlar sahifa almashganda yoʻqolardi, kechiktirilgan modullar kutilmasdi) — test tuzatildi va qarshi tekshiruv bilan sinaldi: `jitless` oʻchirilganda `script-src ← eval` ushlanadi.
- **Telefonda bosh sahifa konsol xatosi:** pastki navigatsiyadagi "Profil" / "Sevimlilar" oldindan yuklanganda proxy kirish sahifasiga yoʻnaltirar, Next esa undan profil segmentini soʻrab 404 olardi. Himoyalangan havolalar endi oldindan yuklanmaydi (`bottom-nav.tsx`). Proxy orqali hal qilish ishlamaydi — Next proxy'dan prefetch sarlavhalarini ataylab olib tashlaydi. E2E soʻrovning oʻzini tekshiradi (vaqtga bogʻliq emas); proxy uchun unit testlar qoʻshildi.
- **Lighthouse** (13.5, mobil profil — sekinlashtirilgan CPU va tarmoq, haqiqiy backend, lokal `next start` + Caddy; har sahifa 3 marta):

  | Sahifa          | Tezlik | Accessibility | Best practices | SEO | LCP        | TBT         |
  | --------------- | ------ | ------------- | -------------- | --- | ---------- | ----------- |
  | Bosh sahifa     | 67–69  | 100           | 100            | 100 | 4,6–4,7 s  | 530–630 ms  |
  | Biznes sahifasi | 68–71  | 100           | 100            | 100 | 4,0–4,8 s  | 530–610 ms  |
  | Kategoriyalar   | 68–70  | 100           | 100            | 100 | 4,2–5,0 s  | 530–630 ms  |
  | Qidiruv         | 64–68  | 100           | 100            | 63  | 4,1–4,3 s  | 770–1070 ms |
  | Xarita          | 37–39  | 100           | 100            | 100 | 8,4–10,1 s | 4,8–5,9 s   |

  Qidiruv SEO'si ataylab past (`noindex` — natija sahifalari indekslanmaydi). Avvalgi oʻlchovdagi biznes sahifasining `noindex`i qayta chiqmadi; konsol xatolari yoʻq. CLS hamma joyda ~0.

- Testlar: backend 473, frontend unit 220 (+9), E2E backend 254 (+13), demo 240 (+10).

**Ochiq masalalar (tezlik):** LCP ~4,5 s ni asosan JavaScript bajarilishi ushlab turibdi (sekinlashtirilgan CPU'da asosiy chunk ~1,1 s; render'ni bloklovchi CSS ~250 ms). Xarita sahifasini MapLibre ogʻirlashtiradi. Hostingda siqish (Brotli), CDN va HTTP/2 raqamlarni oʻzgartiradi — shuning uchun chuqur optimallashtirish haqiqiy serverdagi oʻlchovdan keyin (5-bosqich) qilinishi maqsadga muvofiq. Maʼlum cheklov: qoralama paytida ochilgan biznesning sharhlar sahifasi eʼlondan keyin bir necha daqiqa 404 boʻlib qolishi mumkin (oʻzi tuzaladi).

## 4.3 natijalari

- **Sahifalar uchun sarlavhalar** (`frontend/src/lib/security-headers.ts`, [ADR-0013](adr/0013-xavfsizlik-sarlavhalari.md)): Content-Security-Policy — tashqi manbalar aniq roʻyxatda (xarita plitkalari, Telegram, Google); saytni iframe'ga joylash, plaginlar, `<base>` va begona formalar taqiqlangan. `Permissions-Policy` — joylashuv faqat oʻz saytimizga, kamera va mikrofon yopiq. `Cross-Origin-Opener-Policy: same-origin-allow-popups` (kirish oynalari ishlashi uchun), `Referrer-Policy`, `nosniff`, `X-Frame-Options`. Xarita provayderi oʻzgarsa, CSP avtomatik moslashadi; dev rejimida HMR uchun qoʻshimcha ruxsatlar.
- **API va rasmlar uchun** (Django `SecurityHeadersMiddleware`): `default-src 'none'`, `Cross-Origin-Resource-Policy: same-origin`.
- **Qaror:** skriptlarda `'unsafe-inline'` qoldirildi — nonce bilan qatʼiy CSP barcha sahifalarni dinamik renderga oʻtkazib, statik keshni yoʻqotardi; sabablari va qachon qayta koʻrib chiqilishi ADR'da.
- **E2E** (`e2e/security.spec.ts`): sarlavhalar bor; bosh sahifa, kategoriyalar, biznes sahifasi, kirish (vidjetlar bilan), xarita (tashqi plitkalar bilan), admin paneli va biznes qoʻshish — CSP buzilishisiz. Detektorning oʻzi ham sinaldi: ataylab qoʻshilgan begona skript, rasm va `fetch` bloklandi va ushlandi. Dev serverga qarshi ham oʻtdi.
- Testlar: backend 473 (+1), frontend unit 211 (+4), E2E backend 241, demo 230 (+9 har birida).

**Qoʻlda tasdiqlandi (2026-10-26, siz sinadingiz):** CSP bilan haqiqiy Google (`localhost:8090`) va Telegram (tunnel orqali) kirishi ishladi.

## 4.2 natijalari

- **Mijoz kirishi haqiqiy rejimda:** Telegram Login Widget va Google Identity Services rasmiy skriptlari (`provider-buttons.tsx`). Skript faqat kirish sahifasida va faqat sozlangan boʻlsa yuklanadi (`NEXT_PUBLIC_TELEGRAM_BOT`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`); sozlanmagan provayder ishlayotgandek koʻrsatilmaydi ("hali sozlanmagan"). Imzo va ID token faqat backendda tekshiriladi.
- **Xato xabarlari:** bloklangan akkaunt, provayder ishlamayapti, juda koʻp urinish, vidjet yuklanmadi — har biri uchun tushunarli matn (uz/ru).
- **Telegram — E2E'da boshidan oxirigacha:** sinov bot tokeni bilan Telegram algoritmida imzolangan maʼlumot → frontend vidjet callback'i → backend imzoni tekshiradi → sessiya → profil. Soxta imzo rad etiladi. Google'da haqiqiy imzoni yaratib boʻlmaydi — frontend → backend yoʻli va rad etish sinaldi.
- **Backend:** Google kalitlarini olishda tarmoq xatosi 500 emas, tushunarli `401 provider_unavailable`.
- **Testlarda tashqi tarmoq yoʻq:** E2E Telegram/Google skriptlarini sinov skriptlari bilan almashtiradi; accessibility tekshiruvi uchinchi tomon vidjetlarini hisobga olmaydi.
- **Cloudflare Tunnel** (`D:\tools\cloudflared`, 2026.10.0, SHA256 tekshirilgan) va `start.ps1 -Tunnel`: vaqtinchalik `https://….trycloudflare.com` manzil, u avtomatik ruxsat etilgan saytlar roʻyxatiga qoʻshiladi; Telegram uchun `/setdomain` koʻrsatmasi chiqadi.
- **Yoʻriqnoma:** [auth-setup.md](auth-setup.md) — Telegram bot, Google Client ID, admin 2FA va muammolar jadvali.
- Testlar: backend 472 (+1), frontend unit 207 (+2), E2E backend 232 (+9: 3 ta provayder testi × 3 ekran), demo 221.

**Sizning sinovingizdan keyin (2026-10-26):** Google tugmasi chiqdi, lekin kirish "Kirib boʻlmadi" bilan tugadi — sabab `backend/.env` dagi `GOOGLE_CLIENT_ID` oldida tasodifiy `https://` edi (frontend qiymati bilan mos emas → backend token'ni rad etdi); tuzatildi. Telegram "Bot domain invalid" — sayt `localhost` orqali ochilgan, tunnel manzili kerak. Shundan kelib chiqib: backend endi notoʻgʻri formatdagi `GOOGLE_CLIENT_ID` / `TELEGRAM_BOT_TOKEN` bilan aniq xabar berib ishga tushmaydi; rad etish sabablari backend logida yoziladi; Google tekshiruvida 10 soniyalik soat farqi qabul qilinadi; kirish sahifasida `localhost` da Telegram uchun izoh chiqadi.

**Haqiqiy akkauntlar bilan tasdiqlandi (2026-10-26, siz sinadingiz):**

- **Google** — `http://localhost:8090` da haqiqiy Google akkaunti bilan kirish ishladi.
- **Telegram** — `start.ps1 -Tunnel` manzili orqali (@yaqin_xizmat_bot, `/setdomain` — `https://` siz host) haqiqiy Telegram akkaunti bilan kirish ishladi.
- Tunnel'ni men ishga tushira olmadim (kompyuterdagi saytni internetga ochishga xavfsizlik tizimi ruxsat bermadi) — uni siz ishga tushirdingiz.

## 4.1 natijalari

**Frontend E2E testlari haqiqiy backend bilan oʻtdi: 223 ta** (221 asosiy + 2 ta admin sessiyasi), demo rejimda ham — 221 ta.

- **`npm run e2e:backend`** — bitta buyruq: `yaqin_e2e` bazasi noldan (`manage.py e2e_prepare`), demo rejimsiz build (`.next-backend`; build vaqtida vaqtinchalik backend), Playwright Caddy (8091) → Django (8001) + Next.js (3101) orqali — productiondagi tartib bilan bir xil. Ish bazangizga tegilmaydi.
- **Demo maʼlumot bir manbadan:** `frontend/scripts/export-demo-data.ts` mock fixture'larini `backend/demo/demo-data.json` ga eksport qiladi; `manage.py seed_demo` uni yuklaydi (53 biznes, 181 mahsulot, 1867 sharh, kategoriya atributlari, moderatsiya navbatlari, 90 kunlik namunaviy statistika). Faqat `DEBUG` rejimida; qatʼiy ID'lar — `--reset` faqat demo yozuvlarni oʻchiradi. Reyting — mock'dagi kabi fixture qiymati.
- **Admin 2FA haqiqiy:** setup project demo administratorlar bilan haqiqiy TOTP orqali bir marta kiradi, testlar sessiyani ulaydi (backend kodni qayta qabul qilmaydi, parallel testlar bir 30 soniyada kiradi). Yangi administratorning birinchi kirishi (parol + QR + kod) backendda toʻliq forma orqali sinaladi — kod sahifadagi kalitdan hisoblanadi (RFC 6238, `pyotp` bilan bir xil natija tekshirildi).
- **Mijoz kirishi lokal va E2E'da:** `NEXT_PUBLIC_DEMO_LOGIN=true` bilan haqiqiy backendda ham "Demo foydalanuvchi" tugmasi (backend uni faqat `DEBUG`'da beradi). `start.ps1` ham shuni yoqadi — siz sevimlilar, sharh va shikoyatni lokal sinay olasiz.
- **Cheklovlar E2E'da:** barcha testlar bitta IP'dan — `DJANGO_THROTTLE_OVERRIDES` bilan yumshatiladi; faqat `DEBUG`'da, productionda ilova ishga tushmaydi.

**Topilgan va tuzatilgan:**

- SEO testi zaif edi: `"Disallow: /"` qatori `"Disallow: /admin"` ichida ham uchragani uchun ikkala rejimda oʻtardi — endi har rejim aniq tekshiriladi (demo — butunlay yopiq, haqiqiy — ochiq, shaxsiy sahifalar yopiq, sitemap bor).
- Test rasmi (64×48) backend talabidan (kamida 200 px) kichik edi — 320×240.
- Kategoriya atributlari (masalan, kafe uchun "Porsiya") backend seed'ida yoʻq edi — endi `seed_demo` yuklaydi (faqat atributsiz kategoriyalarga).
- Windows konsolida oʻzbekcha ʻ ʼ belgili chiqishda `manage.py` buyruqlari yiqilardi — chiqish UTF-8.

Testlar: backend 471 (+4: `seed_demo`), frontend unit 205, E2E demo 221 / backend 223.

**Hali qilinmagan:** backend rejimidagi E2E CI'da — 4.6; Telegram va Google — 4.2.

## 3.9 natijalari — 3-bosqich yakuni

**Kontrakt va backend toʻliq mos — buni testlar har safar oʻzi tekshiradi:**

- **Operatsiyalar qamrovi:** toʻliq test toʻplami oxirida kontraktdagi har bir operatsiya (77 ta) kamida bitta testda kontraktga qarshi tekshirilganmi, koʻriladi — biri tushib qolsa, `pytest` yiqiladi (`tests/conftest.py`). `CONTRACT_REPORT=1 pytest` — eʼlon qilingan, lekin testlarda uchramagan status kodlarini koʻrsatadi: hozir **bittasi ham yoʻq** (har bir operatsiyaning har bir kodi tekshirilgan).
- **Xavfsizlik matritsasi** (`tests/test_contract_matrix.py`, kontraktdan avtomatik — yangi endpoint ham avtomatik tushadi): sessiyasiz — 401, ruxsatsiz administratorga — 403, begona saytdan — 403 `origin_denied`, yoʻq obyekt — 404, notoʻgʻri sahifa — 400. Jami 170+ holat.
- **N+1 yoʻq** (`tests/test_query_counts.py`): 15 ta roʻyxat endpointida SQL soʻrovlar soni 2 va 6 ta yozuvda bir xil.
- **Route qamrovi:** kontraktdagi har bir yoʻl backendda bor.

**Topilgan va tuzatilgan:** rasm yuklashda mavjud boʻlmagan biznes uchun 404 oʻrniga 400 qaytardi (fayl biznesdan oldin tekshirilardi) — endi biznes avval tekshiriladi, rasm keraksiz qayta ishlanmaydi.

**Yakuniy tekshiruvlar:** maxfiy qiymatlar repoda yoʻq (faqat CI uchun yaratilgan test kaliti); `pip-audit` (asosiy va dev) va `npm audit` — zaiflik yoʻq; analitika va reklama cookie'lari yoʻq.

Testlar: backend **467** (3.8 da 279), frontend unit 205, E2E 221.

### 3-bosqich: nima tayyor

- Kontraktdagi barcha 77 ta operatsiya: ommaviy sayt, mijoz kabineti, admin panel (bizneslar, rasmlar, katalog, kategoriyalar, moderatsiya, foydalanuvchilar, administratorlar va rollar, audit, sozlamalar, statistika, hisobot havolasi).
- Xavfsizlik: Argon2 + majburiy TOTP (shifrlangan kalit), IP + login bloklash, alohida admin sessiyasi, CSRF, `Origin` tekshiruvi, RBAC, bazada himoyalangan audit jurnali, tokenlar faqat xesh koʻrinishida, EXIF/GPS'siz rasmlar, loglarda joylashuv yoʻq.
- Lokal integratsiya: `scripts/local/start.ps1` (Caddy orqali, productiondagi tartib).

### 4-bosqichga (integratsiya) qoladigan ishlar

- Mijozning Telegram va Google orqali kirishi: frontend vidjetlari, bot (@BotFather) va Google OAuth client ID — ikkalasi bepul; Telegram uchun haqiqiy domen yoki vaqtinchalik tunnel kerak.
- Frontend E2E testlarini haqiqiy backend bilan ishlatish (alohida seed).
- Haqiqiy autentifikator ilovasi bilan admin 2FA'ni qoʻlda sinash.
- Biznes sahifasidagi Next.js tezlik maslahati (`params` Suspense'dan tashqarida) va boshqa optimallashtirishlar.

### 5-bosqichga (hosting) qoladigan ishlar

- Oʻzbekistondagi server va domen (pullik — sizning roziligingiz bilan), HTTPS, HSTS, Redis, `cleanup` cron'i, rasmlar uchun xotira va sarlavhalar, proxy loglarida query string yoʻqligi, `NEXT_PUBLIC_SITE_URL`.

## Lokal integratsiya (3.8 dan keyin)

Frontend va backend birga ishga tushirildi va sinaldi: `scripts/local/start.ps1` — Django, Next.js (demo oʻchiq) va Caddy (`http://localhost:8090`, productiondagi tartib). Caddy — `D:\tools\caddy` (v2.11.7, checksum tekshirilgan). Caddy orqali sinaldi: admin kirishi (2FA bilan), biznes yaratish va eʼlon qilish → ommaviy sahifada paydo boʻlishi (kesh yangilash webhook'i bilan), rasm yuklash va koʻrsatish, begona `Origin` rad etilishi.

**Topilgan va tuzatilgan:** rasmli biznes paydo boʻlishi bilan bosh sahifa va qidiruv xato berardi — backend toʻliq URL (`http://127.0.0.1:8000/media/...`) qaytarardi, frontend esa mock'dagidek `/api/v1/media/...` kutadi. Endi backend rasmlarni `/api/v1/media/...` yoʻli bilan beradi (kontraktda `uri-reference`), Next.js rasm optimizatori esa ularni backenddan oladi (`app/api/v1/[...path]/route.ts`).

**Bu rejimda hali ishlamaydi (4-bosqich):** mijozning Telegram/Google orqali kirishi (frontendda vidjetlar yoʻq; bot va client ID kerak) — demak sevimlilar, sharh va shikoyat. Dev rejimida Next.js biznes sahifasi uchun tezlik maslahatini chiqaradi (`params` Suspense'dan tashqarida) — xato emas, optimallashtirish roʻyxatida.

## 3.8 natijalari

| Endpoint / vosita                                    | Imkoniyatlar                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/stats` (`stats.view`)                    | 7, 30 yoki 90 kun: kunlik qator (hodisasiz kunlar nol bilan), jami, eng koʻp koʻrilgan 10 ta biznes (aloqa bosishlari bilan), kontent soni (eʼlon qilingan, yangi bizneslar, sharhlar, shikoyatlar, soʻrovlar). Faqat eʼlon qilingan bizneslar hodisalari |
| `GET /admin/businesses/{id}/stats` (`business.view`) | Bitta biznes qatori                                                                                                                                                                                                                                       |
| `GET/POST/DELETE .../report-link`                    | Holat (`business.view`), yangi havola va bekor qilish (`business.edit`). Token ~256 bit, bir marta koʻrsatiladi, bazada faqat xeshi; yangisi eskisini bekor qiladi                                                                                        |
| `GET /reports/{token}`                               | Egasi uchun 30 kunlik hisobot (shaxsiy maʼlumotsiz); `Cache-Control: no-store`, `Referrer-Policy: no-referrer`; ochilishlar sanaladi; notoʻgʻri havola — 404; IP boʻyicha cheklov (30/daqiqa, 429)                                                        |
| `manage.py cleanup [--dry-run]`                      | Muddati oʻtgan mijoz va admin sessiyalari, kirish challenge'lari; yopilganiga 12 oy boʻlgan soʻrovlar (maxfiylik siyosati vaʼdasi)                                                                                                                        |

- **`Origin` tekshiruvi:** oʻzgartiruvchi API soʻrovlari brauzerdan faqat `DJANGO_ALLOWED_ORIGINS` dagi saytlardan; begonasi — `403 origin_denied`. Mehmon POST'lari (hodisalar, soʻrov formasi, kirish) CSRF tokenisiz boʻlgani uchun shu himoya qiladi.
- **Loglar:** ilova loglarida URL query string yozilmaydi (joylashuv `lat/lng` boʻlishi mumkin); `runserver` bilan tekshirildi. Django xabarlari endi ikki marta yozilmaydi.
- **Redis:** `REDIS_URL` berilsa kesh Redis'da (cheklov va bloklash hisoblagichlari barcha jarayonlar uchun umumiy); berilmasa — `check --deploy` ogohlantiradi (`yaqin.W001`).
- **HTTPS sozlamalari** muhitdan: `DJANGO_BEHIND_HTTPS_PROXY`, `DJANGO_SSL_REDIRECT`, `DJANGO_HSTS_SECONDS`, `DJANGO_HSTS_INCLUDE_SUBDOMAINS`, `DJANGO_HSTS_PRELOAD`. Hammasi berilganda `check --deploy` — ogohlantirishsiz. HSTS standartda oʻchiq: HTTPS ishlashi tasdiqlanmasdan yoqilsa, qaytarish qiyin.
- **Qaror (ADR-0004 yangilandi):** Celery ishlatilmaydi — yagona davriy ish uchun `cleanup` buyrugʻi va server cron'i yetarli; Redis — faqat kesh.
- **Kontrakt toʻliqligi:** kontraktdagi barcha endpointlar backendda bor (kutilayotganlar roʻyxati boʻsh).
- Testlar: backend 279 (+18).

**Kontrakt oʻzgardi:** `Origin` uchun 403 — kirish (demo, admin login/setup/2fa) va hodisalar endpointlariga; `/reports/{token}` ga 429; `info` boʻlimida qoida yozildi.

**Hali ishlamaydi / qoldi:**

- **Redis lokal sinalmagan:** kompyuterda Redis yoʻq (Windows'da rasmiy versiyasi yoʻq, WSL distributivi C: diskka bir necha GB yozadi). CI'ga Redis xizmati qoʻshildi — butun test toʻplami Redis kesh bilan ishlaydi, lekin CI faqat siz GitHub'ga joylaganingizda ishga tushadi.
- `cleanup` ni kuniga bir marta ishga tushirish (cron/systemd timer), reverse proxy (Caddy) log formatidan query string'ni olib tashlash, HSTS'ni yoqish — 5-bosqich (hosting).
- Brauzerdagi admin panelning statistika sahifasi backendga 4-bosqichda ulanadi.

## 3.7 natijalari

| Boʻlim           | Endpointlar                                                | Ruxsat                                        | Imkoniyatlar                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kategoriyalar    | `/admin/categories`, `.../{id}`, `.../{id}/attributes`     | `category.manage`                             | Daraxt tartibidagi roʻyxat (bizneslar soni ichki kategoriyalari bilan); ikki daraja; slug oʻzgarmaydi; band slug — 409; bizneslari yoki ichki kategoriyasi bor kategoriya oʻchmaydi (409); yoʻnalish ikonkasi ichkilarga ham taʼsir qiladi; nom oʻzgarsa bizneslarning qidiruv matni yangilanadi; atributlar (5 tur, variantlar, birlik) |
| Sharhlar         | `/admin/reviews`, `.../{id}`                               | `review.moderate`                             | Navbat — eng eskisi birinchi; chop etish va rad etish (sabab majburiy); reyting faqat chop etilganlik holati oʻzgarganda qayta hisoblanadi (takror chop etish ikki marta qoʻshmaydi)                                                                                                                                                     |
| Shikoyatlar      | `/admin/complaints`, `.../{id}`                            | `complaint.manage`                            | Ochiq va koʻrib chiqilayotganlar — eng eskisi birinchi; hal qilish va rad etishda javob majburiy                                                                                                                                                                                                                                         |
| Soʻrovlar        | `/admin/business-requests`, `.../{id}`, `.../{id}/convert` | `business.edit`                               | Holat va izoh; rad etishda sabab majburiy; soʻrovdan qoralama (manzil va telefon koʻchiriladi); yaratilgandan keyin oʻzgarmaydi (409); yopilgan vaqt saqlanadi (12 oylik oʻchirish uchun)                                                                                                                                                |
| Foydalanuvchilar | `/admin/users`, `.../{id}`                                 | `user.view`, `user.manage`                    | Qidiruv, bloklanganlar filtri, sharh va shikoyatlar soni; kontakt maʼlumotlari yoʻq; bloklashda sabab majburiy, sessiyalar darhol tugaydi                                                                                                                                                                                                |
| Administratorlar | `/admin/staff`, `.../{id}`, `.../{id}/reset-password`      | koʻrish — `staff.manage`, oʻzgartirish — Root | Amaldagi ruxsatlar manbasi bilan (rol yoki alohida); yangi admin — vaqtinchalik parol, birinchi kirishda sozlash; oʻchirilganda sessiyalar tugaydi; parol tiklansa 2FA ham qaytadan sozlanadi; Root API orqali oʻzgarmaydi                                                                                                               |
| Rollar           | `/admin/roles`, `.../{id}`                                 | koʻrish — `staff.manage`, oʻzgartirish — Root | Ruxsatlar oʻzgarishi shu roldagi adminlarga darhol taʼsir qiladi; tizim yoki ishlatilayotgan rol oʻchmaydi (409); nom takrorlanmaydi                                                                                                                                                                                                     |
| Audit            | `/admin/audit`                                             | `audit.view`                                  | Faqat oʻqish, eng yangisi birinchi; obyekt turi va administrator boʻyicha filtr                                                                                                                                                                                                                                                          |
| Sozlamalar       | `/admin/settings`                                          | `settings.manage`                             | Sharhlar moderatsiyasi, soʻrov formasi, kontaktlar; ommaviy sahifalar keshi yangilanadi                                                                                                                                                                                                                                                  |

- Har bir oʻzgarish audit jurnaliga yoziladi; ommaviy saytga taalluqlilari frontend keshini yangilaydi.
- Umumiy qism: `AdminView` (sessiya, CSRF, ruxsat), `page_payload` (sahifalash), `invalid` (forma xatolari).
- **Kontrakt toʻliqligi testi:** kontraktdagi har bir endpointga backendda route bor; hali yoʻqlari (3.8: statistika va hisobot havolasi — 4 ta) aniq roʻyxatda.
- Testlar: backend 261 (+39), frontend unit 205.

**Kontrakt oʻzgardi:** 28 ta admin endpointiga yetishmagan 401/403/400 javoblari qoʻshildi (sessiyasiz, ruxsatsiz, notoʻgʻri filtr); `AdminReview.author` endi `null` boʻlishi mumkin (akkauntini oʻchirgan muallif) — frontend "Oʻchirilgan foydalanuvchi" deb koʻrsatadi, mock ham shunday.

**Hali ishlamaydi / qoldi:**

- Statistika, hisobot havolasi, davriy vazifalar (eskirgan sessiyalar, yopilgan soʻrovlarni 12 oydan keyin oʻchirish), Redis, HTTPS sarlavhalari, `Origin` tekshiruvi — 3.8.
- Brauzerdagi admin panel hali backendga ulanmagan (4-bosqich) — bu qadam API testlari bilan tekshirildi, HTTP smoke oʻtkazilmadi (3.6 dagi smoke server qatlamini allaqachon tekshirgan).
- Administratorlarni boshqarish faqat Root'da (MVP qarori, ADR-0009) — "berilishi mumkin" ruxsatlar keyin.

## 3.6 natijalari

| Endpoint                                          | Imkoniyatlar                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/POST /admin/businesses`                      | Barcha holatlar; qidiruv (nom, slug), holat va "roziliksiz" filtrlari, rasmlar va mahsulotlar soni, oxirgi oʻzgargani birinchi. Yangi biznes — qoralama (saytda koʻrinmaydi)                                                                                            |
| `GET/PATCH /admin/businesses/{id}`                | Qisman yangilash: nom, tavsif, kategoriya (faqat ichki), tuman, manzil, joylashuv, telefonlar (E.164, 5 tagacha), Telegram/Instagram (`@` olib tashlanadi), ish vaqti, rozilik, holat. Eʼlon qilish — joylashuv, manzil va roziliksiz 400 (`fields` da yetishmaganlari) |
| `POST /admin/businesses/{id}/photos`              | Rasm yuklash (pastga qarang)                                                                                                                                                                                                                                            |
| `PUT .../photos/order`, `DELETE .../photos/{id}`  | Tartib (birinchisi — muqova; roʻyxat aynan mos boʻlishi shart), oʻchirish (fayl ham)                                                                                                                                                                                    |
| `GET/POST .../items`, `PUT/DELETE .../items/{id}` | Mahsulot va xizmatlar: narx turlari (aniq, "...dan", oraliq, soʻrov boʻyicha), davomiylik faqat xizmatda, 20 tagacha xususiyat; slug biznes ichida noyob va tahrirda oʻzgarmaydi                                                                                        |

- **Ruxsatlar:** koʻrish — `business.view`; tahrirlash, rasm va katalog — `business.edit`; holat (eʼlon qilish, yashirish) — `business.publish`. Ikkalasi bir soʻrovda boʻlsa — ikkala ruxsat kerak.
- **Rasmlar:** fayl mazmuni boʻyicha faqat JPEG, PNG, WebP (boshqa format dekoderlari umuman chaqirilmaydi); 5 MB (413), 40 megapiksel, kichik tomoni kamida 200 px; biznesga 12 ta. Har doim WebP'ga qayta kodlanadi: EXIF, jumladan GPS, olib tashlanadi, burilish qoʻllanadi, uzun tomoni 2000 px gacha; shaffoflik va rang profili saqlanadi. Klient yuborgan oʻlchamlarga ishonilmaydi. Saqlash xatosida diskda yetim fayl qolmaydi.
- **Slug:** kirill nomlar lotinga oʻgiriladi; nom oʻzgarsa slug faqat biznes hali hech qachon eʼlon qilinmagan boʻlsa oʻzgaradi — eʼlon qilingan sahifa manzili (havolalar, qidiruv tizimlari) buzilmaydi. Mock ham shunday qilindi.
- **Audit:** `business.create`, `business.update`, `business.status.*`, `photo.*`, `item.*`.
- **Frontend keshi:** har oʻzgarishda `businesses` va `business:{slug}` (eski slug ham); holat yoki kategoriya oʻzgarsa — `categories`.
- **Haqiqiy HTTP orqali sinov** (vaqtinchalik bazada, keyin oʻchirildi): Root yaratish → kirish va 2FA sozlash → biznes → rasm (WebP, EXIF'siz) → mahsulot → eʼlon qilish → ommaviy sahifada koʻrinadi → chiqish.
- Pillow 13.0.0: 2 haftadan yosh, lekin 12.3.0 da ~40 ta zaiflik (`pip-audit`) — xavfsizlik istisnosi.
- Testlar: backend 222 (+37), frontend unit 205.

**Kontrakt toʻldirildi:** rasm va katalog endpointlariga 401 (va kerakli joylarda 404); bizneslar roʻyxatiga 400 (notoʻgʻri filtr yoki sahifa).

**Hali ishlamaydi / qoldi:**

- Brauzerdagi admin panel hali backendga ulanmagan (reverse proxy — 4-bosqich); hozircha API testlar va HTTP smoke orqali tekshirildi.
- Rasmlar lokal diskda; production xotirasi (Oʻzbekistondagi disk yoki S3-mos), `immutable` kesh va `nosniff` sarlavhalari — 5-bosqich. Ishlab chiqishda rasmlarni Django beradi (faqat `DEBUG`).
- Frontend `next/image` uchun backend rasm domeni sozlamasi — 4-bosqich.
- Soʻrovdan biznes yaratish (`/admin/business-requests/{id}/convert`) — 3.7 (umumiy tekshiruv tayyor: `parse_create`).
- Mahsulot rasmlari MVP'da yoʻq (`Item.images` — boʻsh roʻyxat). — 4.7 da qoʻshildi (ADR-0014)

## 3.5 natijalari

Yangi ilova — `apps/staff`: administratorlar, rollar, admin sessiyalari, kirish challenge'lari, audit jurnali.

| Endpoint / buyruq                          | Imkoniyatlar                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/auth/login`                   | Login + parol (Argon2). Javob: `challengeToken` (5 daqiqa), `next` (`totp` yoki `setup`), `mustChangePassword`. Notoʻgʻri parol, nomaʼlum login va oʻchirilgan akkaunt — bir xil 401 va bir xil javob vaqti |
| `POST /admin/auth/setup`                   | **Yangi.** Birinchi kirish yoki tiklangan akkaunt: yangi parol (kamida 12 belgi, oddiy, faqat raqamli, loginga oʻxshash va avvalgi parol taqiqlangan) va TOTP kaliti (QR — SVG, kalit matni)                |
| `POST /admin/auth/2fa`                     | TOTP kodi (±30 soniya). Bir kodni qayta ishlatib boʻlmaydi; 5 ta notoʻgʻri kod — challenge bekor (429). Muvaffaqiyatli boʻlsa `adminsessionid` (HttpOnly, SameSite=Strict, 8 soat)                          |
| `POST /admin/auth/logout`, `GET /admin/me` | Chiqish (CSRF bilan), joriy admin va amaldagi ruxsatlari                                                                                                                                                    |
| `python manage.py createroot`              | Yagona Root (DB cheklovi); parol faqat `getpass` yoki `--password-stdin` orqali (shell tarixida qolmaydi)                                                                                                   |

- **Parol tanlashga qarshi:** IP + login juftligi — 15 daqiqada 5 xato → 15 daqiqa blok; faqat login boʻyicha (turli IP'lardan) — 20 xato; IP boʻyicha umumiy chegara — 30/daqiqa. Begona odam haqiqiy adminni oʻz IP'sidan bloklay olmaydi.
- **2FA kalitlari** bazada Fernet bilan shifrlangan (`TOTP_ENCRYPTION_KEY` — productionda majburiy, yoʻq boʻlsa ilova ishga tushmaydi).
- **Sozlash atomar:** yangi parol va kalit challenge'da kutadi, faqat toʻgʻri kod kiritilgach akkauntga yoziladi — jarayon yarim yoʻlda qolsa, akkaunt oʻzgarmaydi.
- **RBAC:** 12 ta atomar ruxsat (kontraktdagi roʻyxat bilan bir xilligi testda), 3 ta tizim roli (Moderator, Kontent menejeri, Tahlilchi), amaldagi ruxsatlar = rollar ∪ alohida; Root — hammasi. View'larda: `IsAdmin` + `admin_permission` (`"root"` — faqat Root).
- **Audit jurnali faqat qoʻshiladi:** UPDATE, DELETE va TRUNCATE bazadagi trigger bilan rad etiladi; yozuvi bor administratorni oʻchirib boʻlmaydi (faqat oʻchiriladi). DB cheklovlari: bitta Root, Root'ni oʻchirib boʻlmaydi, login formati.
- **Umumiy CSRF tokeni:** mijoz va admin sessiyasi bir brauzerda ochiq boʻlsa, ikkalasi bir xil `csrftoken` ni ishlatadi — biri kirsa yoki chiqsa, ikkinchisi buzilmaydi.
- **Frontend:** kirish oynasiga sozlash bosqichi qoʻshildi (yangi parol ×2 → QR va kalit → kod); mock ham shu oqimda (yangi va paroli tiklangan administrator birinchi kirishda sozlaydi); E2E testi yangilandi.
- Testlar: backend 185 (+46), frontend unit 204, E2E 221 (3 ekran).

**Kontrakt oʻzgardi:** `login` javobi `AdminLoginChallenge` (`next`, `mustChangePassword`); yangi `POST /admin/auth/setup` (`AdminTotpSetup`); admin chiqishiga 403 (CSRF).

**Hali ishlamaydi / qoldi:**

- Administratorlar, rollar, parolni tiklash, audit roʻyxati endpointlari — 3.7 (model va ruxsat tekshiruvi tayyor).
- Bloklash hisoblagichlari hozircha jarayon xotirasida (LocMem) — bir nechta jarayonli productionda Redis kerak (3.8).
- Faol admin sessiyalarini koʻrish va bekor qilish (ADR-0006) — kontraktda endpoint yoʻq; hozircha parolni tiklash va oʻchirish sessiyalarni tugatadi (3.7).
- `TOTP_ENCRYPTION_KEY` yoʻqolsa, barcha administratorlar 2FA'ni qaytadan sozlashi kerak — kalit zaxirasi hosting bosqichida (5) rejalashtiriladi.
- Haqiqiy autentifikator ilovasi bilan qoʻlda sinov — 4-bosqichda (testlarda RFC 6238 boʻyicha `pyotp` bilan tekshirildi).

## 3.4 natijalari

| Endpoint                                                                    | Imkoniyatlar                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/telegram`                                                       | Telegram Login Widget imzosi (HMAC-SHA256, kalit — bot tokenining xeshi), `auth_date` muddati (24 soat), faqat Telegram maydonlari |
| `POST /auth/google`                                                         | Rasmiy `google-auth` bilan ID token (imzo, muddat, `aud`, `iss`, tasdiqlangan email); email saqlanmaydi — faqat `sub`              |
| `POST /auth/demo`                                                           | Faqat `DEBUG` rejimida (integratsiya sinovlari); productionda 404, `DEBUG` siz yoqilsa ilova ishga tushmaydi                       |
| `POST /auth/logout`, `GET/PATCH/DELETE /me`                                 | Chiqish, ismni oʻzgartirish, akkauntni oʻchirish (chop etilgan sharhlar muallifsiz qoladi, qolganlari oʻchadi)                     |
| `/me/favorites`, `/me/favorites/ids`, `PUT/DELETE /me/favorites/{id}`       | Sevimlilar (faqat eʼlon qilinganlar, oxirgi qoʻshilgani birinchi)                                                                  |
| `POST /businesses/{slug}/reviews`, `/me/reviews`, `DELETE /me/reviews/{id}` | Sharh (bitta biznesga bitta — 409), moderatsiya sozlamasiga koʻra; chop etilganda reyting atomar yangilanadi                       |
| `POST /complaints`, `/me/complaints`                                        | Shikoyat ("Boshqa" — kamida 10 belgi)                                                                                              |

- **Sessiya:** `sessionid` — HttpOnly, SameSite=Lax, 30 kun, productionda Secure; token bazada faqat SHA-256 xeshi. `csrftoken` — double-submit: sarlavha = cookie = sessiyadagi token (vaqtga chidamli taqqoslash).
- **Cheklovlar:** kirish — IP boʻyicha (20/daqiqa); sharh va shikoyat — foydalanuvchi boʻyicha (10/soat).
- Bloklangan foydalanuvchi kira olmaydi (403 `account_blocked`), sessiyasi ham ishlamaydi.
- Provayder sozlanmagan boʻlsa (token yoki client ID yoʻq) — halol `401 provider_unavailable`.
- **Frontend keshini yangilash** (`apps/core/revalidate.py`): oʻzgarishdan keyin frontendning `/api/revalidate` webhook'i chaqiriladi — faqat tranzaksiya muvaffaqiyatli yakunlanganda; frontend javob bermasa ham foydalanuvchi soʻrovi buzilmaydi.
- Testlar: 139 (backend), har bir javob kontraktga qarshi.

**Kontrakt toʻldirildi:** kirish endpointlarida 403 (bloklangan) va 429, demo — 404 (productionda), chiqish — 403 (CSRF), sharh va shikoyatda — 429.

**Hali ishlamaydi / sinalmagan:**

- **Telegram va Google orqali haqiqiy kirish sinalmagan.** Imzo tekshiruvi testlarda Telegram hujjatidagi algoritm bilan sinaldi, lekin haqiqiy bot (@BotFather, bepul) va Google OAuth mijozi (bepul) domen bilan birga kerak — 4/5-bosqichda.
- Frontend brauzer soʻrovlari (`/api/v1`) backendga reverse proxy orqali yetadi — 4-bosqich.
- Bloklash amali (admin) — 3.7; productionda cookie'lar faqat HTTPS — `SESSION_COOKIES_SECURE` (standart: DEBUG oʻchiq boʻlsa yoqiq).

## 3.3 natijalari

| Endpoint                                                            | Imkoniyatlar                                                                                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /categories`, `/categories/{slug}`, `/districts`               | Daraxt, eʼlon qilingan bizneslar soni (ichki kategoriyalar bilan), atributlar joriy tilda                                                                              |
| `GET /businesses`                                                   | Qidiruv (lotin, kirill, imlo xatosi), kategoriya (ota-kategoriya ichkilarini ham), tuman, "hozir ochiq", masofa; saralash: tavsiya, reyting, masofa, yangi; sahifalash |
| `GET /businesses/{slug}`, `/items`, `/items/{itemSlug}`, `/reviews` | Profil (galereya, narx oraligʻi katalogdan), katalog, faqat chop etilgan sharhlar ("Malika R.", oʻchirilgan muallif — "Oʻchirilgan foydalanuvchi")                     |
| `GET /map/markers`, `/search/suggest`                               | Xarita nuqtalari (1000 tagacha), takliflar (5+5)                                                                                                                       |
| `POST /events`                                                      | Kunlik statistika hisoblagichi (faqat son, parallel soʻrovlarga chidamli), IP boʻyicha cheklov                                                                         |
| `POST /business-requests`, `GET /settings`                          | Soʻrov formasi (raqam E.164 ga, rozilik majburiy, forma yopiq boʻlsa 403, IP boʻyicha cheklov), ommaviy kontaktlar                                                     |

- Xatti-harakat frontend mock'i bilan bir xil: "tavsiya etilgan" formulasi, "hozir ochiq" (yarim tundan va yakshanbadan dushanbaga oʻtadigan oraliqlar bilan), parametr xatolari (`fields`).
- Faqat eʼlon qilingan bizneslar koʻrinadi; qoralama — 404.
- Testlar: 112 (backend), har bir javob kontraktga qarshi tekshiriladi.
- **Real frontend bilan sinov:** frontend demo rejimisiz, backendga ulab yigʻildi va ishga tushirildi. Server tomonda render qilinadigan sahifalar (bosh sahifa, kategoriya, biznes profili, mahsulot, qidiruv, rus tili) backend maʼlumotlarini toʻgʻri koʻrsatdi. Sinov maʼlumotlari keyin oʻchirildi.

**Topilgan va tuzatilgan:**

- Kontraktda eʼlon qilinmagan javoblar (kontrakt tekshiruvi ushladi): `/search/suggest` — 400, `/events` — 429, `/business-requests` — 403 `requests_closed`. Kontrakt toʻldirildi.
- **Frontend production build haqiqiy backend bilan yiqilardi**: Cache Components rejimida `generateStaticParams` boʻsh roʻyxat qaytarsa build xatosi — yangi (boʻsh) bazada yoki mahsuloti yoʻq biznesda. Demo maʼlumotlarda bunday holat yoʻqligi uchun yashirin edi. Endi boʻsh boʻlsa placeholder (Next.js hujjatidagi tavsiya), sahifa uni 404 qiladi.
- **Har bir ommaviy sahifaga barcha tarjimalar, jumladan admin panel matnlari ham yuborilardi** (tarjimalarning 58 %, ~22 KB). Endi admin matnlari faqat admin boʻlimida.

**Hali ishlamaydi:**

- Brauzerdan keladigan `/api/v1` soʻrovlari (sevimlilar, sharh yozish, xarita filtrlari va h.k.) productionda reverse proxy orqali backendga yetadi — 4-bosqichda sozlanadi va sinaladi.
- Kirish talab qiladigan endpointlar (sharh yozish, sevimlilar, admin) — 3.4–3.7.
- Kesh hozircha xotirada (cheklov hisoblagichlari bitta jarayonda); productionda Redis — 3.8.
- Kirishsiz POST endpointlarida `Origin` tekshiruvi — 3.8.
- Topilmagan biznes sahifasi "200 + noindex" qaytaradi (Next 16 xususiyati, maʼlum cheklovlarda).

## 3.2 natijalari

- **Modellar** (5 ilova): `catalog` (tumanlar, kategoriyalar va atributlar), `accounts` (mijozlar — parolsiz, Telegram/Google), `businesses` (biznes, rasmlar, katalog, "Biznesingizni qoʻshing" soʻrovlari), `community` (sharhlar, shikoyatlar, sevimlilar), `core` (platforma sozlamalari). Sxema va diagramma — [backend-data-model.md](backend-data-model.md).
- **Joylashuv** — PostGIS `geography` (masofa metrlarda; ikki nuqta orasidagi masofa test bilan tekshirildi).
- **Qidiruv** — normallashtirilgan `search_text` + GIN trigram indeks: lotin, kirill va imlo xatosi bilan (`ustos` → "Ustoz") topadi. Normalizatsiya frontend bilan bir xil (bir xil test holatlari).
- **15 ta maʼlumotlar bazasi cheklovi**: eʼlon qilish shartlari, narx izchilligi, bitta foydalanuvchi — bitta sharh va boshqalar. API'ni chetlab oʻtgan kod ham ularni buzolmaydi.
- **Boshlangʻich maʼlumot** (data migratsiya): 12 tuman va 61 kategoriya — frontend bilan bir xil slug'lar, frontend fixture'laridan avtomatik koʻchirilgan. Demo bizneslar productionga tushmaydi.
- Ish vaqti (`WeeklySchedule`) tekshiruvi — frontend mock'idagi qoidalar bilan bir xil.
- Testlar endi migratsiyalar bilan ishlaydi; model oʻzgarib migratsiya unutilsa — test yiqiladi. Jami 63 test, ruff va mypy (strict) — xatosiz.

**Topilgan va tuzatilgan:** narx cheklovi narxsiz "aniq narx"ni oʻtkazib yuborardi — SQL'da `NULL > 0` natijasi `NULL`, `CHECK` esa uni "oʻtdi" deb hisoblaydi. Har bir shoxga `IS NOT NULL` aniq qoʻshildi (test buni ushladi).

**Oʻzgarish:** `factory_boy` olib tashlandi — qatʼiy mypy bilan tiplari mos emas; oʻrniga oddiy tiplangan yordamchi funksiyalar (`tests/factories.py`).

**Hali ishlamaydi:**

- Endpointlar yoʻq — maʼlumotlar API orqali hali koʻrinmaydi (3.3).
- Administratorlar, rollar, audit (3.5), statistika va hisobot havolalari (3.8) jadvallari keyingi qadamlarda.
- Kategoriya yoki tuman nomi oʻzgarganda `search_text` ni yangilash — 3.7.
- Rasm fayllarini saqlash va qayta kodlash — 3.6.

## 3.1 natijalari

- **Lokal maʼlumotlar bazasi** (C: diskka hech narsa yozilmagan): PostgreSQL 17.11 va PostGIS 3.6.2 — rasmiy bepul arxivlardan `D:\tools\pgsql` ga (PostGIS arxivining MD5 yigʻindisi tekshirildi), maʼlumotlar — `D:\tools\pgdata`. Server faqat `127.0.0.1` da; superuser va ilova paroli tasodifiy, repodan tashqarida.
- Ilova roli `yaqin` superuser emas; kengaytmalar (`postgis`, `pg_trgm`, `unaccent`) `scripts/setup-db.sql` bilan — skript alohida vaqtinchalik klasterda sinab koʻrildi.
- **Django 5.2.18 LTS + DRF 3.18.3**, Python virtual muhiti va pip keshi D: diskda. Bogʻliqliklar aniq versiyalar bilan, `pip-audit` — zaiflik yoʻq.
- **GeoDjango Windows'da ishladi** — PostGIS toʻplamidagi GDAL/GEOS DLL'lari bilan (rejadagi asosiy xavf yopildi).
- Sozlamalar muhit oʻzgaruvchilaridan (`.env` faqat lokal); productionda `DJANGO_SECRET_KEY` boʻlmasa ilova ishga tushmaydi.
- Xatolar kontraktdagi `Error` formatida (`code`, `message`, `fields`) — DRF tashqarisidagi 404/500 ham JSON (HTML sahifa emas).
- **Kontrakt tekshiruvi:** `tests/contract.py` har bir javobni `openapi.yaml` ga qarshi tekshiradi; sxemaga zid javob testni yiqitishi ham test bilan isbotlangan.
- `GET /api/v1/health` — kontraktga qoʻshildi (ilova va baza holati, ichki tafsilotsiz).
- Sifat: ruff (lint + format), mypy (strict) — xatosiz; 13 test.
- **CI** (`.github/workflows/backend.yml`): PostGIS servisi, `setup-db.sql`, pip-audit, ruff, mypy, `check --deploy`, pytest.
- ADR-0004 yangilandi: OpenAPI manbasi — qoʻlda yoziladigan kontrakt (drf-spectacular oʻrniga).

**Hali ishlamaydi:**

- Modellar, endpointlar, autentifikatsiya — keyingi qadamlarda.
- `check --deploy` ogohlantirishlari: CSRF middleware (3.4, sessiyalar bilan), HSTS va HTTPS'ga yoʻnaltirish (3.8).
- CI GitHub'da hali ishga tushmagan — siz push qilganingizda birinchi marta ishlaydi.
- Lokal PostgreSQL kompyuter qayta yoqilganda avtomatik ishga tushmaydi — buyruq `backend/README.md` da.

## 2.1 natijalari

- Next.js 16.4.3 + React 19.3, TypeScript strict, Tailwind CSS 4.
- next-intl 4.14: `uz` (prefikssiz) va `ru` (`/ru`), til `next/root-params` orqali, `src/proxy.ts`.
- 404: tilga mos (`[locale]/not-found.tsx`) va global (`global-not-found.tsx`).
- Inter shrifti: latin, latin-ext, kirill.
- Narx formatlash (`src/lib/format/price.ts`) + 10 ta unit test.
- E2E: 5 ta test × 3 ekran (375/768/1280) — til, 404 holat kodi, gorizontal scroll, axe (WCAG 2 AA).
- GitHub Actions: lint, typecheck, format, unit, build, e2e.

## 2.2 natijalari

- Dizayn tokenlari (firuza + amber + stone), WCAG AA kontrast — [design-system.md](design-system.md).
- shadcn/ui (Radix) komponentlari; telefon uchun kattalashtirilgan oʻlchamlar.
- Karkas: header (qidiruv, til, kirish), telefonda pastki navigatsiya, footer, demo ogohlantirish, tilga mos 404.
- Soha komponentlari: BusinessCard (+ skeleton), OpenStatusBadge, RatingStars/RatingInline, PriceTag, CategoryTile, CategoryIcon.
- Holatlar: EmptyState, ErrorState.
- Masofa va kasr formatlash + testlar (jami 29 unit test).
- Komponentlar koʻrgazmasi: `/dev/ui` (production'da yopiq).
- E2E: 31 test (karkas, til almashtirish, qidiruv formasi, klaviatura, 404, axe); koʻrgazma sahifasi axe boʻyicha qoʻlda tekshirildi — 0 xato.

### 2.2 davomida qabul qilingan texnik qarorlar

- **Til faqat URL'dan aniqlanadi** (`localeDetection: false`, cookie yoʻq). Avtomatik aniqlash rus tilidan oʻzbekchaga qaytishda URL'ni `/uz` holida qoldirib ketardi (E2E test aniqladi).
- shadcn'ning `cn` paketi (shadcn muallifining rasmiy paketi) — `clsx + tailwind-merge` oʻrniga.
- `next-themes` olib tashlandi (faqat yorugʻ tema).
- shadcn standartidagi ikki kontrast xatosi tuzatildi: `destructive` → `#B91C1C`, faol boʻlmagan tab matni.

## 2.3–2.4 natijalari

**Ishlaydigan sahifalar** (demo maʼlumotlar bilan):

| Sahifa               | Imkoniyatlar                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `/`                  | Qidiruv, "Yaqin atrofimda", 12 kategoriya, yangi qoʻshilganlar, tumanlar                     |
| `/kategoriyalar`     | Barcha kategoriyalar va ichki kategoriyalar, bizneslar soni                                  |
| `/kategoriya/[slug]` | Sahifa yoʻli, ichki kategoriya chiplari, filtrlar (tuman, hozir ochiq, saralash), sahifalash |
| `/qidiruv`           | Lotin/kirill qidiruv, kategoriya filtri, boʻsh natija holati                                 |

- API kontrakti: `docs/api/openapi.yaml` (ommaviy qism); tiplar generatsiya qilinadi, CI mosligini tekshiradi.
- Mock qatlam — jarayon ichidagi MSW handler'lari (ADR-0011); 54 ta toʻqima biznes, 12 tuman, 12 kategoriya / 62 ta ichki.
- "Hozir ochiq" — brauzerda, foydalanuvchi vaqti boʻyicha (yarim tundan keyin yopilish, tushlik, dam olish kunlari).
- Joylashuv — faqat foydalanuvchi ruxsati bilan, ~110 m aniqlikda cookie'da; URL'ga yozilmaydi.
- Testlar: 101 unit, 72 E2E (3 ekran), axe — bosh sahifa, kategoriyalar, qidiruv.

**Shu qadamlarda topilgan va tuzatilgan xatolar:**

- Til almashtirgich yuk ostida ruschadan oʻzbekchaga oʻtganda URL'ni `/uz` holida qoldirardi — endi til havolalari aniq yasaladi (`src/i18n/localized-path.ts`); 48/48 stress-test.
- Planshetda (768–1023 px) "Kategoriyalar" va "Xarita" havolalari yoʻq edi — endi ikonka koʻrinishida.
- "аптека" kabi soʻz oxiri farq qiladigan qidiruvlar topilmasdi.
- MSW'ning `Math.random()` prerender ogohlantirishi — `connection()` bilan.

**Hali ishlamaydi:** admin panel (2.7–2.9), statik sahifalar va "Biznes qoʻshish" formasi (2.10).

## 2.5 natijalari

| Sahifa                    | Imkoniyatlar                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/biznes/[slug]`          | Ish holati, reyting, narxlar (boʻlimlar, davomiylik, "...dan", "soʻrov boʻyicha"), haftalik ish vaqti (bugun belgilangan), manzil + moʻljal + xarita, sharhlar (oxirgi 5), JSON-LD |
| `/biznes/[slug]/sharhlar` | Barcha sharhlar, sahifalash                                                                                                                                                        |
| `/biznes/[slug]/[item]`   | Mahsulot/xizmat: narx, davomiylik, atributlar, biznes bilan bogʻlanish                                                                                                             |
| `/xarita`                 | MapLibre + OpenFreeMap, klasterlar, kategoriya va "hozir ochiq" filtri, roʻyxat, tanlangan biznes kartasi, "mening joylashuvim"                                                    |

- Bogʻlanish: qoʻngʻiroq (`tel:`), Telegram, Yandex/Google xaritada yoʻl, ulashish.
- Statistika hodisalari (`profile_view`, `call_click`, `direction_click`, `telegram_click`) — `/api/v1/events`, shaxsiy maʼlumotsiz.
- `/api/v1/*` route handler — brauzer soʻrovlari uchun (demo rejimda mock).
- API kontrakti kengaytirildi: items, reviews, map markers.
- MapLibre 6.13.0 (aniq versiya, 2 haftadan eski); worker `public/vendor` ga build oldidan koʻchiriladi.
- Testlar: 115 unit, 102 E2E.

**Topilgan va tuzatilgan:** xarita konteyneri balandligi 0 edi (MapLibre `position: relative` beradi); "soʻm dan" → "soʻmdan"; telefonda ish vaqti/manzil sahifa oxirida edi; tanlangan karta pastki menyu ostida qolardi; kichik xaritani manbalar yozuvi yopib qoʻyardi.

## 2.6 natijalari

| Sahifa / imkoniyat   | Tafsilot                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `/kirish`            | Demo kirish; Telegram/Google — faol emas (backend bilan 4-bosqichda), `?next=` bilan qaytish |
| Header               | Foydalanuvchi menyusi (profil, sevimlilar, sharhlarim, xabarlarim, chiqish)                  |
| `/profil`            | Ismni o'zgartirish, chiqish, akkauntni o'chirish (tasdiqlash bilan)                          |
| `/profil/sevimlilar` | Saqlangan bizneslar; yurakcha — kartalarda va profilda (optimistik yangilanish)              |
| `/profil/sharhlar`   | Holati bilan (moderatsiyada / chop etilgan / rad etilgan), o'chirish                         |
| `/profil/xabarlar`   | Noto'g'ri maʼlumot haqidagi xabarlar va holati                                               |
| Biznes profili       | "Sharh yozish" (1–5 yulduz, izoh, moderatsiya), "Maʼlumot notoʻgʻrimi? Xabar bering"         |

- Xavfsizlik: httpOnly sessiya, CSRF double-submit, himoyalangan sahifalar (proxy + server tekshiruvi), open redirect himoyasi — ADR-0012.
- Kutubxonalar (aniq versiyalar, ≥2 hafta): TanStack Query 5.104.1, React Hook Form 7.89.0, Zod 4.6.6 (4.6.5 dagi yuqori darajali zaiflik tufayli), @hookform/resolvers 5.9.1.
- CI'ga `npm audit --audit-level=high` qo'shildi.
- Testlar: 139 unit, 131 E2E.

**Topilgan va tuzatilgan:** reyting tanlansa ham forma "Bahoni tanlang" derdi (RHF `valueAsNumber` radio'da ishlamaydi); profil sahifalarida `Math.random` prerender ogohlantirishi; telefondagi kartada uzun nom yurakcha ostiga kirardi; "Saqlash" tugmasining ekran o'quvchi nomi ko'rinadigan matnga mos emas edi (WCAG 2.5.3).

## 2.7 natijalari

| Sahifa / imkoniyat       | Tafsilot                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/kirish`          | Login + parol → 6 xonali kod (TOTP, mock). 5 xato urinish → 60 s blok; kod 5 daqiqa amal qiladi                                     |
| Admin layout             | Desktop — chap panel, telefon — yuqori panel + menyu; telefonda "Biznes qoʻshish" tugmasi (bosh panel va roʻyxatda)                 |
| `/admin`                 | Bosh panel: eʼlon qilingan, qoralama, yashirilgan, rozilik qayd etilmagan bizneslar soni                                            |
| `/admin/bizneslar`       | Qidiruv, holat filtri (`?filtr=`), rasm va narxlar soni, "Yana koʻrsatish"                                                          |
| `/admin/bizneslar/yangi` | 7 qadamli usta: asosiy → joylashuv (GPS yoki xaritada belgilash) → rasmlar (kamera) → ish vaqti → aloqa + rozilik → katalog → eʼlon |
| `/admin/bizneslar/[id]`  | Xuddi shu boʻlimlar tablarda (`?bolim=`); oʻzgarish saqlangach ommaviy sahifa keshi yangilanadi                                     |

- Ruxsatlar backend/mock'da tekshiriladi (ADR-0009): demo `moderator` bizneslarni koʻradi, lekin tahrirlay olmaydi.
- Eʼlon qilish uchun joylashuv, manzil va egasining roziligi majburiy (ADR-0007).
- Rasmlar: brauzerda qayta siqiladi (EXIF, jumladan GPS, olib tashlanadi), JPEG/PNG/WebP, 5 MB gacha, 12 tagacha, tartibini oʻzgartirish va oʻchirish.
- Har bir oʻzgarish audit jurnaliga yoziladi (koʻrish sahifasi — 2.9).
- Production uchun `/api/revalidate` webhook'i (Bearer `REVALIDATE_SECRET`, vaqtga chidamli taqqoslash) — backend 3-bosqichda ishlatadi.
- Testlar: 167 unit, 152 E2E (3 ekran; admin testlari 4 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:**

- Sahifa toʻliq yuklanishidan oldin kiritilgan login/parol yoʻqolardi; JavaScript yuklanmay turib yuborilsa, parol URL'ga tushishi mumkin edi. Endi maydonlar boshqarilmaydi, forma `method="post"`, tugma sahifa tayyor boʻlguncha faolsiz.
- shadcn `Alert` har doim `role="alert"` berardi — statik maslahatlar ekran oʻquvchida favqulodda xabar kabi oʻqilardi.
- Demo rejimda yuklangan rasmlar `next/image` optimizatorida 404 berardi (server xotirasida) — demo'da optimizatsiyasiz.
- "Biznes qoʻshish" tugmasi forma sahifalarida formaning oʻz tugmalarini toʻsardi.
- Server sahifalaridan client moduldagi funksiyalar chaqirilardi — `admin-params.ts` ga ajratildi.

**Hali ishlamaydi / mock:**

- 2FA — har doim `123456`; haqiqiy TOTP (kalit yaratish, QR) backend bilan (3-bosqich).
- Login cheklovi faqat login boʻyicha; backend'da IP + login boʻyicha boʻladi (ADR-0006).
- Rasmlar va barcha admin oʻzgarishlari server xotirasida — qayta ishga tushganda oʻchadi.
- Kategoriyalar, moderatsiya, shikoyatlar (2.8), administratorlar, audit koʻrish, statistika (2.9) — hali yoʻq.

## 2.8 natijalari

| Sahifa                      | Ruxsat             | Imkoniyatlar                                                                                                                                          |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/sorovlar`           | `business.edit`    | "Biznesingizni qoʻshing" soʻrovlari: qoʻngʻiroq, "Bogʻlanildi", rad etish (izoh bilan), **soʻrovdan qoralama** → usta joylashuv qadamidan davom etadi |
| `/admin/sharhlar`           | `review.moderate`  | Navbat (eng eskisi birinchi), chop etish, sabab bilan rad etish (tayyor variantlar); chop etilgan sharh saytda va reytingda                           |
| `/admin/shikoyatlar`        | `complaint.manage` | Koʻrib chiqishga olish, biznesni tahrirlashga oʻtish, javob bilan yopish — javob foydalanuvchiga koʻrinadi                                            |
| `/admin/kategoriyalar`      | `category.manage`  | Yoʻnalish (ikonka bilan) va ichki kategoriya qoʻshish, nomlarni tahrirlash, boʻsh kategoriyani oʻchirish                                              |
| `/admin/kategoriyalar/[id]` | `category.manage`  | Atributlar: matn, son (birlik), Ha/Yoʻq, bitta/bir nechta variant; tartib; katalog formasida tavsiya sifatida chiqadi                                 |
| `/admin/foydalanuvchilar`   | `user.view`        | Qidiruv, bloklanganlar filtri; bloklash/blokdan chiqarish — `user.manage` (sessiyalar darhol tugatiladi)                                              |
| `/admin`                    | —                  | "Navbatda": yangi soʻrovlar, moderatsiyadagi sharhlar, ochiq shikoyatlar (faqat ruxsat bor boʻlimlar)                                                 |

- API kontrakti: kategoriyalar/atributlar, sharhlar, shikoyatlar, soʻrovlar (shu jumladan ommaviy `POST /business-requests` — 2.10 dagi forma uchun), foydalanuvchilar; yangi ruxsat `user.manage` (ADR-0009, 8-qoida).
- Sharh va shikoyatlar biznesga ID orqali bogʻlanadi — biznes nomi (slug) oʻzgarsa ham uzilmaydi.
- Kategoriya slug'i yaratilgandan keyin oʻzgarmaydi (URL'lar barqaror). Biznesi yoki ichki kategoriyasi bor kategoriyani oʻchirib boʻlmaydi.
- Demo navbat: 4 ta sharh, 3 ta shikoyat, 3 ta soʻrov, 6 ta foydalanuvchi (`fixtures/moderation.ts`, toʻqib chiqarilgan).
- Testlar: 187 unit, 173 E2E (3 ekran; admin testlari 3 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:**

- Brauzerda oʻzbekcha sana "2026 M10 25" koʻrinishida chiqardi (Chrome'ning ICU maʼlumotlarida `uz` oy nomlari yoʻq) — mijoz kabinetidagi sharh va xabarlar sanalariga ham taʼsir qilardi. Endi oy nomlari qoʻlda: "25-oktabr, 2026".
- Mijozning sharh/shikoyati biznes nomi oʻzgarganda eski slug bilan qolib ketardi.

**Hali ishlamaydi / mock:**

- "Biznesingizni qoʻshing" ommaviy formasi — 2.10 da (endpoint va admin tomoni tayyor). Mock'da IP boʻyicha cheklov yoʻq — backend'da boʻladi.
- Atributlar boʻyicha ommaviy filtrlar yoʻq (`filterable` belgisi kontraktda bor, interfeysda ishlatilmaydi).
- Kategoriyalar tartibini oʻzgartirish yoʻq (yangisi oxiriga qoʻshiladi).
- Demo kirish har safar yangi foydalanuvchi yaratadi, shuning uchun bloklashni faqat ochiq sessiyada sinash mumkin; haqiqiy Telegram/Google akkaunti qayta kira olmasligi — backend bilan.
- Administratorlar, audit jurnalini koʻrish, statistika — 2.9.

## 2.9 natijalari

| Sahifa                                 | Ruxsat                                        | Imkoniyatlar                                                                                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/administratorlar`              | `staff.manage` (koʻrish), Root (oʻzgartirish) | Administrator qoʻshish (vaqtinchalik parol bir marta koʻrsatiladi), rollar va alohida ruxsatlar, **amaldagi ruxsatlar manbasi bilan**, parolni yangilash, oʻchirish (sessiyalar tugatiladi). Root'ni API orqali oʻzgartirib boʻlmaydi |
| `/admin/administratorlar?bolim=rollar` | xuddi shu                                     | Tizim rollari (Moderator, Kontent menejeri, Tahlilchi) va oʻz rollaringiz; ishlatilayotgan yoki tizim rolini oʻchirib boʻlmaydi                                                                                                       |
| `/admin/audit`                         | `audit.view`                                  | Barcha admin harakatlari (kirishlar bilan), tur boʻyicha filtr; faqat oʻqish                                                                                                                                                          |
| `/admin/statistika`                    | `stats.view`                                  | 7/30/90 kun: koʻrishlar, qoʻngʻiroq, Telegram, yoʻnalish; kunlik grafik + jadval; eng koʻp koʻrilgan 10 biznes; yangi kontent                                                                                                         |
| `/admin/sozlamalar`                    | `settings.manage`                             | Sharhlar oldindan moderatsiyasi (oʻchirilsa — darhol chiqadi), soʻrov formasi ochiq/yopiq, platforma kontaktlari                                                                                                                      |
| Biznes → "Statistika" tab              | `business.view`                               | Biznes statistikasi; **egasi uchun hisobot havolasi** (yaratish, ulashish, bekor qilish — `business.edit`)                                                                                                                            |
| `/hisobot/[token]`                     | ommaviy (maxfiy havola)                       | Egasi uchun: 30 kunlik koʻrishlar va bosishlar, shaxsiy maʼlumotsiz; `noindex`, `no-referrer`                                                                                                                                         |

- Statistika hodisalari (`/api/v1/events`) endi saqlanadi: kunlik hisoblagichlar, faqat son.
- Yangi ruxsat `stats.view`; moderator demo akkaunti: "Moderator" roli + alohida `business.view` (manba koʻrinishini koʻrsatish uchun).
- Grafik rangi (`--chart-1`, teal-600) palitra tekshiruvidan oʻtkazildi: `#0f766e` rang toʻyinganligi boʻyicha oʻtmadi.
- Testlar: 196 unit, 188 E2E (3 ekran; admin testlari 3 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:** statistika jadvalining aylantiriladigan hududi klaviatura bilan ochilmasdi (axe, WCAG 2.1.1); telefonda jadval ustunlari sarlavhalari yopishib qolardi.

**Hali ishlamaydi / mock:**

- ⚠ Statistika demo rejimda **namunaviy** (fixture bizneslar uchun deterministik toʻqib chiqarilgan qiymatlar); saytdagi haqiqiy bosishlar ustiga qoʻshiladi. Sahifalarda ogohlantirish bor.
- Yangi administrator: birinchi kirishda parolni almashtirish va shaxsiy TOTP (QR) sozlash — backend bilan (demo'da kod har doim `123456`).
- Platforma kontaktlari saqlanadi va `GET /settings` qaytaradi, saytda koʻrsatish — 2.10 ("Aloqa" sahifasi).
- Audit jurnalida administrator va sana boʻyicha filtr interfeysda yoʻq (API'da `adminId` bor).
- Hisobot havolasi uchun IP boʻyicha cheklov — backend'da.

## 2.10 natijalari

| Sahifa / imkoniyat        | Tafsilot                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/haqida`                 | Platforma qanday ishlaydi, bizneslar uchun shartlar (bepul, joyida, rozilik bilan, hisobot), tamoyillar                                                                         |
| `/aloqa`                  | Admin sozlamalaridagi kontaktlar (Telegram, telefon, email); boʻsh boʻlsa — soʻrov formasiga yoʻllanma                                                                          |
| `/biznes-qoshish`         | Kirishsiz soʻrov formasi: tekshiruv, shaxsiy maʼlumotga rozilik, raqam E.164 ga keltiriladi; forma yopiq boʻlsa — xabar. Soʻrov admin "Soʻrovlar" navbatiga tushadi             |
| `/shartlar`, `/maxfiylik` | Ikki tilda, mundarija bilan; **loyiha sifatida belgilangan** (huquqshunos tekshiruvi kerak)                                                                                     |
| SEO                       | canonical, hreflang (uz/ru/x-default), Open Graph + OG rasm (`/opengraph-image`), `sitemap.xml` (≈700 manzil, hreflang bilan), `robots.txt`, `WebSite` + `SearchAction` JSON-LD |
| Demo rejim                | `robots.txt` — `Disallow: /`, sahifalarda `noindex`: toʻqib chiqarilgan maʼlumotlar qidiruvga tushmaydi                                                                         |

- Footer'ga "Aloqa" havolasi qoʻshildi; barcha footer havolalari endi ishlaydi.
- [docs/backend-handoff.md](backend-handoff.md) — 3-bosqich uchun barcha talablar bir joyda (auth, cheklovlar, RBAC, rasmlar, kesh teglari, maxfiylik vaʼdalari).
- README'lar yangilandi: imkoniyatlar, demo kirish, arxitektura, muhit oʻzgaruvchilari.
- Testlar: 200 unit, 221 E2E (3 ekran).

**Lighthouse** (telefon emulyatsiyasi, CPU 4× sekinlashtirilgan, production build, lokal server). Qavs ichida — optimizatsiyadan oldin:

| Sahifa          |  Tezlik | Accessibility | Best practices | SEO\* |         LCP |          TBT |  CLS |
| --------------- | ------: | ------------: | -------------: | ----: | ----------: | -----------: | ---: |
| Bosh sahifa     | 77 (60) |           100 |             96 |    58 | 3,7 s (5,1) | 490 ms (890) |    0 |
| Biznes profili  | 70 (62) |           100 |            100 |    58 | 4,1 s (4,9) | 680 ms (770) |    0 |
| Kategoriya (ru) | 72 (65) |      98 → 100 |            100 |    58 | 3,9 s (4,1) | 540 ms (750) |    0 |
| Xarita          |      39 |           100 |             96 |    58 |       8,3 s |        4,2 s | 0,02 |

\* SEO past — demo rejimdagi `noindex` va lokal portdagi canonical (`NEXT_PUBLIC_SITE_URL` boshqa port) sababli; production'da bu ikki band oʻtadi.

**Topilgan va tuzatilgan:**

- Shrift: `latin`, `latin-ext` va `cyrillic` toʻplamlari har sahifada oldindan yuklanardi. Oʻzbek lotin yozuvidagi ʻ ʼ `latin` da bor — endi faqat u oldindan yuklanadi, kirill kerak boʻlganda (`unicode-range`). Bu LCP va TBT'ni eng koʻp yaxshiladi.
- Mehmon foydalanuvchi uchun har sahifada `/api/v1/me` soʻrovi yuborilib, konsolda 401 xatosi chiqardi — endi `csrftoken` cookie boʻlmasa soʻrov yuborilmaydi.
- Sarlavhalar tartibi (`h1 → h3`) natijalar, sevimlilar va statistika sahifalarida buzilgan edi (Lighthouse `heading-order`).
- Akkaunt oʻchirilganda mock chop etilgan sharhlarni ham oʻchirardi — kontraktdagidek "Oʻchirilgan foydalanuvchi" nomi bilan qoladigan qilindi (maxfiylik siyosati shunga mos).
- Open Graph rasmi sahifalar oʻz openGraph'ini berganda meros qilinmasdi — har sahifaga aniq beriladi.

**Hali ishlamaydi / qoldi:**

- Xarita sahifasi ogʻir: MapLibre va WebGL; headless Chrome'da GPU yoʻqligi TBT'ni oshiradi. Keyinroq: xaritani foydalanuvchi harakatigacha kechiktirish yoki statik oldindan koʻrinish.
- Hydration (React) TBT'ning asosiy qismi — server komponentlariga koʻproq koʻchirish keyingi optimizatsiya.
- Soʻrov formasida spamga qarshi himoya (IP cheklovi, honeypot/captcha) — backend'da.
- "Oʻchirilgan foydalanuvchi" yorligʻi mock'da faqat oʻzbekcha (backend `lang` bilan beradi).
- Huquqiy matnlar huquqshunos tekshiruvidan oʻtmagan.

## 2-bosqich yakuni

Frontend toʻliq: ommaviy sayt, mijoz kabineti, admin panel (biznes qoʻshish, moderatsiya, ruxsatlar, audit, statistika), statik sahifalar va SEO — hammasi kontrakt va mock qatlam ustida. Keyingi qadam — **3-bosqich (Django backend)**, faqat tasdiqdan keyin. Boshlash nuqtasi: [docs/backend-handoff.md](backend-handoff.md).

## Maʼlum cheklovlar

- Docker kompyuterda oʻrnatilmagan — 3-bosqichda (PostgreSQL uchun) kerak boʻladi.
- Build'da maʼlum boʻlmagan kategoriya slug'i baʼzan 404 oʻrniga 200 + `noindex` qaytaradi (Next 16 oqimli render xususiyati); qidiruv tizimlari indekslamaydi.
- Partial Prefetching'ning bitta prefetch soʻrovi baʼzan ochiq qoladi (foydalanuvchiga taʼsiri yoʻq); kuzatib boriladi.
- Xarita yorliqlari OpenStreetMap maʼlumotlaridan (koʻpincha lotin/ingliz yozuvida) — tile provayderi bilan bogʻliq.
- Demo bizneslarda Telegram yoʻq (mavjud boʻlishi mumkin boʻlgan akkauntlarni ishlatmaslik uchun) — tugma maʼlumot boʻlganda chiqadi.
- Demo foydalanuvchilar, sevimlilar, sharhlar, xabarlar, rasmlar va admin oʻzgarishlari server xotirasida — qayta ishga tushganda oʻchadi. Next.js sahifa keshi esa diskda qoladi: qayta ishga tushirilgandan keyin keshlangan sahifa yoʻqolgan rasmga havola qilishi mumkin (404). Faqat demo'ga xos — backend maʼlumotni saqlaydi.
- Telegram/Google orqali kirish — backend bilan birga (4-bosqich).
