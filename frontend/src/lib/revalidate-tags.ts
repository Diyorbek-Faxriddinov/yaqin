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

/**
 * Takroriy yangilash vaqtlari (javobdan keyin, ms). Oxirgisi yangilanishdan oldin boshlangan eng
 * sekin to'ldirish va uning ustidagi render tugashidan keyin bo'lishi kerak: backend so'rovi
 * `API_TIMEOUT_MS` (10 s) bilan cheklangan, yuklama ostida render 7 s gacha kuzatildi
 */
export const REPEAT_AFTER_MS = [3000, 10_000, 30_000] as const;

/**
 * Route handler'lar uchun: hozir yangilaydi va javobdan keyin bir necha marta takrorlaydi.
 *
 * Poyga holati (Next 16.4): `use cache` to'ldirishi so'rovlararo bo'lishiladi — yangilanishdan
 * keyin boshlangan render undan oldin boshlangan, hali tugamagan to'ldirishga qo'shilib, eski
 * maʼlumot oladi. Sahifa keshi natijani yangi vaqt bilan yozadi, shuning uchun teg yangilanishi
 * uni eskirgan deb bilmaydi — yashirilgan biznes soatlab (cacheLife "hours") ko'rinib qolardi.
 * Eski yozuvlar faqat oldingi to'ldirishlar tugaguncha paydo bo'ladi; takroriy yangilash ularni
 * eskirtiradi. E2E (cache-revalidation.spec.ts) yuklama ostida ~2 aylanadan birida ushlagan.
 */
export function revalidateTagsRepeated(tags: readonly string[]): void {
  revalidateTags(tags);
  const copy = [...tags];
  after(async () => {
    let elapsed = 0;
    for (const at of REPEAT_AFTER_MS) {
      await new Promise((resolve) => setTimeout(resolve, at - elapsed));
      elapsed = at;
      revalidateTags(copy);
    }
  });
}
