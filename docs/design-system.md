# Dizayn tizimi

Jonli koʻrinish: `npm run dev` → <http://localhost:3000/dev/ui> (production'da faqat `ENABLE_DEV_PAGES=true` bilan ochiladi).

## Tamoyillar

1. **Telefon birinchi.** Asosiy foydalanuvchilar — telefonda; admin panelda maʼlumot doʻkonning oʻzida, telefondan kiritiladi.
2. **Oʻqiladigan va bosiladigan.** Matn kontrasti ≥ 4.5:1, forma chegaralari ≥ 3:1, tugmalar balandligi 40–44px.
3. **Rang yagona belgi emas.** Holatlar (ochiq/yopiq, xato) har doim matn bilan ham yoziladi.
4. **Halol maʼlumot.** Mock rejimida har bir sahifada "Demo rejim" ogohlantirishi.

## Ranglar

Tokenlar: `src/app/globals.css` (`:root`). Tailwind'da `bg-primary`, `text-muted-foreground` va hokazo.

| Token              | Qiymat                | Ishlatilishi                              |
| ------------------ | --------------------- | ----------------------------------------- |
| `primary`          | `#0F766E`             | Asosiy tugmalar, havolalar, faol holat    |
| `primary-hover`    | `#115E59`             | Asosiy tugma hover (shaffoflik emas)      |
| `primary-soft`     | `#F0FDFA`             | Yumshoq fon: kategoriya, rasm yoʻq holati |
| `highlight`        | `#F59E0B`             | Reyting yulduzlari — **matn uchun emas**  |
| `success`          | `#047857`             | "Ochiq"                                   |
| `warning`          | `#B45309`             | "Tez orada yopiladi", demo ogohlantirish  |
| `destructive`      | `#B91C1C`             | Xatolar, oʻchirish                        |
| `foreground`       | `#1C1917`             | Asosiy matn                               |
| `muted-foreground` | `#57534E`             | Ikkinchi darajali matn (7:1)              |
| `border` / `input` | `#E7E5E4` / `#928B86` | Ajratgichlar / forma chegaralari          |

MVP'da faqat yorugʻ tema. Qorongʻi tema uchun `.dark` blokini qoʻshish kifoya — komponentlar tayyor.

## Tipografiya

Inter (latin, latin-ext, kirill). Asosiy matn 16px; sarlavhalar `font-semibold tracking-tight`. Oʻzbekcha matnda `ʻ` (U+02BB) va `ʼ` (U+02BC).

## Komponentlar

| Qatlam                | Joyi                         | Misollar                                                           |
| --------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Asosiy (shadcn/Radix) | `src/components/ui/`         | Button, Input, Select, Dialog, Sheet, Tabs, Skeleton               |
| Umumiy                | `src/components/common/`     | PublicShell, SiteHeader, BottomNav, LanguageSwitcher, EmptyState   |
| Soha                  | `src/features/*/components/` | BusinessCard, OpenStatusBadge, RatingStars, PriceTag, CategoryTile |

shadcn komponentlariga kiritilgan oʻzgarishlar (yangilashda yoʻqotmaslik kerak):

- Oʻlchamlar kattalashtirilgan: tugma va input 40px (`lg` — 44px), tab 40px.
- `primary` hover — shaffoflik oʻrniga `primary-hover` (oq matn kontrasti saqlanadi).
- Faol boʻlmagan tab matni — `text-muted-foreground`.
- Skeleton foni — `bg-border` (oq fonda koʻrinadi).
- Dialog/Sheet "Yopish" matni tarjima qilingan; Sonner `next-themes`siz.

## Layout

- Kenglik: `max-w-6xl`, chetlar `px-4`.
- Telefonda pastki navigatsiya (`--bottom-nav-height: 4rem`) + `safe-area-inset-bottom`; uning joyi footer ichida qoldiriladi.
- `usePathname` ishlatadigan komponentlar `Suspense` ichida (cacheComponents talabi).
