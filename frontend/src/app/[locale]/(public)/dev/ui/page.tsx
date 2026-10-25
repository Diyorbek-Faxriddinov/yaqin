import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Loader2, Plus, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BusinessCard, BusinessCardSkeleton } from "@/features/business/components/business-card";
import { OpenStatusBadge } from "@/features/business/components/open-status-badge";
import { PriceTag } from "@/features/business/components/price-tag";
import { RatingInline, RatingStars } from "@/features/business/components/rating";
import { CategoryTile } from "@/features/category/components/category-tile";
import { COLOR_TOKENS, DEMO_BUSINESSES, DEMO_CATEGORIES } from "./_demo";
import { FormControlsDemo, OverlaysDemo, TabsDemo } from "./_interactive";

// Ishlab chiqish sahifasi: production'da faqat ENABLE_DEV_PAGES=true bo'lsa ochiladi
const devPagesEnabled =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_PAGES === "true";

export const metadata: Metadata = {
  title: "Dizayn tizimi",
  robots: { index: false, follow: false },
};

const som = (value: number) => ({ amount: value * 100, currency: "UZS" as const });

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-4">
      <h2 id={`${id}-title`} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  if (!devPagesEnabled) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      <header className="space-y-2">
        <Badge variant="outline">Faqat ishlab chiqish uchun</Badge>
        <h1 className="text-3xl font-semibold sm:text-4xl">Yaqin dizayn tizimi</h1>
        <p className="max-w-2xl text-muted-foreground">
          Ranglar, tipografiya va umumiy komponentlar. Barcha maʼlumotlar namunaviy.
        </p>
      </header>

      <Section id="ranglar" title="Ranglar">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map(({ token, hex, use }) => (
            <li key={token} className="flex items-center gap-3 rounded-xl border p-3">
              <span
                aria-hidden="true"
                className="size-12 shrink-0 rounded-lg border"
                style={{ background: `var(--${token})` }}
              />
              <span className="min-w-0">
                <span className="block font-mono text-sm font-medium">{token}</span>
                <span className="block font-mono text-xs text-muted-foreground">{hex}</span>
                <span className="block text-xs text-muted-foreground">{use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tipografiya" title="Tipografiya">
        <div className="space-y-3 rounded-xl border p-5">
          <p className="text-4xl font-semibold tracking-tight">Sarlavha 1 — 36px</p>
          <p className="text-2xl font-semibold tracking-tight">Sarlavha 2 — 24px</p>
          <p className="text-xl font-semibold tracking-tight">Sarlavha 3 — 20px</p>
          <p className="text-base">
            Asosiy matn — 16px. Oʻzbekcha harflar: oʻ, gʻ, sh, ch, tutuq belgisi — maʼlumot.
          </p>
          <p className="text-base">Кириллица: Ўзбекистон, Тошкент, ғ, қ, ҳ.</p>
          <p className="text-sm text-muted-foreground">Ikkinchi darajali matn — 14px</p>
          <p className="text-xs text-muted-foreground">Kichik izoh — 12px</p>
        </div>
      </Section>

      <Section id="tugmalar" title="Tugmalar">
        <div className="space-y-4 rounded-xl border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Asosiy</Button>
            <Button variant="secondary">Ikkinchi darajali</Button>
            <Button variant="outline">Chegarali</Button>
            <Button variant="ghost">Shaffof</Button>
            <Button variant="destructive">Oʻchirish</Button>
            <Button variant="link">Havola</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Kichik</Button>
            <Button>Standart</Button>
            <Button size="lg">Katta (telefon uchun)</Button>
            <Button size="icon" aria-label="Qoʻshish">
              <Plus aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Davom etish
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
            <Button disabled>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Saqlanmoqda…
            </Button>
            <Button disabled variant="outline">
              Faol emas
            </Button>
          </div>
        </div>
      </Section>

      <Section id="formalar" title="Forma elementlari">
        <div className="space-y-6 rounded-xl border p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="demo-name">Biznes nomi</Label>
              <Input id="demo-name" placeholder="Masalan: Baraka sartaroshxonasi" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-phone">Telefon raqami</Label>
              <Input
                id="demo-phone"
                type="tel"
                inputMode="tel"
                defaultValue="+998 90 12"
                aria-invalid="true"
                aria-describedby="demo-phone-error"
              />
              <p id="demo-phone-error" className="text-sm text-destructive">
                Telefon raqami toʻliq emas. Namuna: +998 90 123 45 67
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-description">Tavsif</Label>
            <Textarea id="demo-description" placeholder="Biznes haqida qisqacha…" />
          </div>
          <FormControlsDemo />
        </div>
      </Section>

      <Section id="belgilar" title="Belgilar va holatlar">
        <div className="space-y-4 rounded-xl border p-5">
          <div className="flex flex-wrap gap-2">
            <OpenStatusBadge status={{ state: "open", detail: "21:00 gacha" }} />
            <OpenStatusBadge status={{ state: "closingSoon", detail: "22:00 gacha" }} />
            <OpenStatusBadge status={{ state: "closed", detail: "ertaga 09:00 da" }} />
            <OpenStatusBadge status={{ state: "unknown" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Tasdiqlangan</Badge>
            <Badge variant="secondary">Platforma boshqaruvida</Badge>
            <Badge variant="outline">Qoralama</Badge>
            <Badge variant="destructive">Bloklangan</Badge>
          </div>
        </div>
      </Section>

      <Section id="reyting" title="Reyting, narx, masofa">
        <div className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <RatingStars value={4.6} size="lg" />
            <RatingStars value={3.2} />
            <div>
              <RatingInline rating={{ average: 4.8, count: 37 }} />
            </div>
            <div>
              <RatingInline rating={{ average: 4.0, count: 1 }} />
            </div>
            <div>
              <RatingInline rating={null} />
            </div>
          </div>
          <div className="space-y-2">
            <p>
              <PriceTag price={som(45000)} />
            </p>
            <p>
              <PriceTag price={{ min: som(50000), max: som(1250000) }} />
            </p>
          </div>
        </div>
      </Section>

      <Section id="kategoriyalar" title="Kategoriyalar">
        <div className="grid grid-cols-3 gap-2 rounded-xl border p-3 sm:grid-cols-4 lg:grid-cols-6">
          {DEMO_CATEGORIES.map((category) => (
            <CategoryTile
              key={category.iconKey}
              href="/dev/ui#kategoriyalar"
              name={category.name}
              iconKey={category.iconKey}
            />
          ))}
        </div>
      </Section>

      <Section id="kartalar" title="Biznes kartalari">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_BUSINESSES.map((business) => (
            <BusinessCard key={business.name} {...business} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Yuklanish holati:</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BusinessCardSkeleton />
          <BusinessCardSkeleton />
        </div>
      </Section>

      <Section id="holatlar" title="Boʻsh natija, xato, ogohlantirish">
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title="Hech narsa topilmadi"
            description="Boshqa soʻz bilan qidirib koʻring yoki filtrlarni oʻzgartiring."
            action={<Button variant="outline">Filtrlarni tozalash</Button>}
          />
          <ErrorState
            title="Nimadir xato ketdi"
            description="Maʼlumotlarni yuklab boʻlmadi. Internet aloqasini tekshiring."
            action={
              <Button variant="outline">
                <RefreshCw aria-hidden="true" />
                Qayta urinish
              </Button>
            }
          />
        </div>
        <Alert>
          <AlertTitle>Rozilik qayd etilmagan</AlertTitle>
          <AlertDescription>
            Biznesni eʼlon qilishdan oldin egasining roziligini belgilang.
          </AlertDescription>
        </Alert>
      </Section>

      <Section id="interaktiv" title="Oynalar, menyular, tablar">
        <div className="space-y-6 rounded-xl border p-5">
          <OverlaysDemo />
          <TabsDemo />
        </div>
      </Section>
    </div>
  );
}
