import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";

/**
 * Kesh teglarini yangilaydi (backend webhook'i va demo mock uchun umumiy).
 *
 * `business:*` va `category:*` teglarida tegishli marshrut ham yangilanadi: render notFound() bilan
 * tugaganda (masalan, admin qoralamani ochgan) natija kesh tegiga bog'lanmaydi — faqat
 * `revalidateTag` bo'lsa, biznes e'lon qilingandan keyin ham "Sahifa topilmadi" qolardi
 * (E2E: cache-revalidation.spec.ts; sinovda 15/15 → 0/15, ikkala tilda). Sahifa maʼlumotlari
 * biznes bo'yicha alohida keshda qoladi — qayta render arzon.
 *
 * Maʼlum cheklov: qoralama paytida ochilgan ichki sahifa (sharhlar) e'londan keyin bir necha
 * daqiqa 404 bo'lib qolishi mumkin (o'zi tuzaladi; aniq yo'l va qolip bilan yangilash yordam
 * bermadi — Next.js aniqlanmagan parametr uchun 404 natijasini alohida saqlaydi).
 */
const ROUTES: Record<string, string> = {
  business: "/[locale]/biznes/[slug]",
  category: "/[locale]/kategoriya/[slug]",
};

export function revalidateTags(tags: readonly string[]): void {
  const routes = new Set<string>();
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
    const [kind, slug] = tag.split(":");
    const route = kind && slug ? ROUTES[kind] : undefined;
    if (route) routes.add(route);
  }
  for (const route of routes) revalidatePath(route, "layout");
}

/** Qayta yangilash kechikishi — undan oldin boshlangan renderlar odatda shu vaqtda tugaydi */
export const REPEAT_AFTER_MS = 3000;

/**
 * Route handler'lar uchun: hozir yangilaydi va javobdan keyin yana bir marta takrorlaydi.
 *
 * Poyga holati: yangilanishdan oldin boshlangan render (masalan, brauzer sahifadagi havolalarni
 * oldindan yuklayotgan bo'lsa) yangilanishdan keyin tugab, eski maʼlumotni keshga qayta yozadi —
 * yashirilgan biznes soatlab ko'rinib qolishi mumkin edi (E2E'da 3 dan 2 marta). Takroriy
 * yangilash shu kechikkan yozuvni ham eskirtiradi.
 */
export function revalidateTagsTwice(tags: readonly string[]): void {
  revalidateTags(tags);
  const copy = [...tags];
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, REPEAT_AFTER_MS));
    revalidateTags(copy);
  });
}
