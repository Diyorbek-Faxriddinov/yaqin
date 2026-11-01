import type { AdminPhoto, Item } from "@/lib/api/types";
import { definitionsOf, storedTyped, type StoredAttribute } from "../item-attributes";
import type { DemoBusiness } from "./businesses";
import { CATEGORY_ATTRIBUTES } from "./categories";
import { demoId, seededRandom } from "./ids";

// ⚠ Demo mahsulot va xizmatlar. Narxlar taxminiy, haqiqiy emas.

/** Mock'dagi mahsulot yozuvi: xususiyatlar saqlash ko'rinishida (item-attributes.ts), rasmlar ID bilan */
export type DemoItem = Omit<Item, "attributes" | "images"> & {
  attributes: StoredAttribute[];
  photos: AdminPhoto[];
};

type PriceType = Item["price"]["type"];

/**
 * [nomi, bo'lim, turi, narx turi, min (so'm), max (so'm), davomiylik (daq), atributlar].
 * Atribut: [kategoriya xususiyati kaliti, xom qiymat] yoki [null, nom, qiymat] — erkin.
 */
type Template = [
  name: string,
  group: string | null,
  kind: "product" | "service",
  priceType: PriceType,
  min: number | null,
  max: number | null,
  duration: number | null,
  attributes?: Array<[key: string, raw: string] | [key: null, name: string, value: string]>,
];

const s = (
  name: string,
  group: string | null,
  priceType: PriceType,
  min: number | null,
  max: number | null = null,
  duration: number | null = null,
): Template => [name, group, "service", priceType, min, max, duration];
const p = (
  name: string,
  group: string | null,
  priceType: PriceType,
  min: number | null,
  max: number | null = null,
  attributes?: Template[7],
): Template => [name, group, "product", priceType, min, max, null, attributes];

const MENU: Template[] = [
  p("Toshkent oshi", "Asosiy taomlar", "fixed", 45000),
  p("Lagʻmon", "Asosiy taomlar", "fixed", 38000),
  p("Manti (5 dona)", "Asosiy taomlar", "fixed", 35000),
  p("Shashlik (1 six)", "Asosiy taomlar", "fixed", 18000),
  p("Achchiq-chuchuk salat", "Salatlar", "fixed", 15000),
  p("Tandir somsa", "Pishiriqlar", "fixed", 10000),
  p("Koʻk choy (choynak)", "Ichimliklar", "fixed", 8000),
];

const TEMPLATES: Record<string, Template[]> = {
  sartaroshxonalar: [
    s("Erkaklar soch turmagi", "Soch turmagi", "fixed", 50000, null, 40),
    s("Bolalar soch turmagi", "Soch turmagi", "fixed", 35000, null, 30),
    s("Soqol olish va shakl berish", "Soqol", "fixed", 30000, null, 20),
    s("Soch va soqol — kompleks", "Kompleks", "fixed", 70000, null, 60),
    s("Soch boʻyash", "Qoʻshimcha", "from", 80000, null, 60),
  ],
  "gozallik-salonlari": [
    s("Ayollar soch turmagi", "Soch", "from", 100000, null, 60),
    s("Soch boʻyash", "Soch", "range", 250000, 600000, 120),
    s("Kelin turmagi", "Toʻy", "from", 600000, null, 180),
    s("Kunduzgi makiyaj", "Makiyaj", "fixed", 250000, null, 60),
    s("Qosh shakli", "Qosh va kiprik", "fixed", 60000, null, 30),
  ],
  manikyur: [
    s("Klassik manikyur", "Manikyur", "fixed", 90000, null, 60),
    s("Gel-lak qoplama", "Manikyur", "fixed", 150000, null, 90),
    s("Tirnoq uzaytirish", "Manikyur", "from", 250000, null, 150),
    s("Pedikyur", "Pedikyur", "fixed", 180000, null, 90),
  ],
  kosmetologiya: [
    s("Kosmetolog konsultatsiyasi", null, "fixed", 150000, null, 30),
    s("Yuzni tozalash", "Yuz parvarishi", "fixed", 300000, null, 60),
    s("Pilling", "Yuz parvarishi", "from", 400000, null, 45),
  ],
  restoranlar: MENU,
  kafelar: MENU,
  choyxonalar: MENU,
  "fast-food": [
    p("Lavash", "Taomlar", "fixed", 28000),
    p("Gamburger", "Taomlar", "fixed", 32000),
    p("Hot-dog", "Taomlar", "fixed", 18000),
    p("Kartoshka fri", "Gazaklar", "fixed", 15000),
    p("Gazli ichimlik 0,5 l", "Ichimliklar", "fixed", 9000),
  ],
  qandolatxonalar: [
    p("Napoleon torti (1 kg)", "Tortlar", "fixed", 180000),
    p("Medovik (1 kg)", "Tortlar", "fixed", 170000),
    p("Buyurtma tort", "Tortlar", "from", 350000),
    p("Ekler (dona)", "Pishiriqlar", "fixed", 12000),
  ],
  santexnika: [
    s("Usta chaqiruvi va koʻrik", null, "fixed", 50000),
    s("Kran almashtirish", "Taʼmir", "fixed", 100000, null, 40),
    s("Quvur taʼmiri", "Taʼmir", "from", 150000),
    s("Unitaz oʻrnatish", "Oʻrnatish", "from", 250000, null, 120),
  ],
  elektrik: [
    s("Rozetka oʻrnatish", "Oʻrnatish", "fixed", 60000, null, 30),
    s("Lyustra oʻrnatish", "Oʻrnatish", "fixed", 120000, null, 60),
    s("Elektr simlarini almashtirish", "Taʼmir", "on_request", null),
  ],
  "texnika-tamiri": [
    s("Diagnostika", null, "fixed", 80000),
    s("Kir yuvish mashinasi taʼmiri", "Taʼmir", "from", 200000),
    s("Muzlatgich taʼmiri", "Taʼmir", "from", 250000),
  ],
  "telefon-tamiri": [
    s("Ekran almashtirish", "Telefonlar", "range", 300000, 2500000, 60),
    s("Batareya almashtirish", "Telefonlar", "from", 200000, null, 40),
    s("Dasturiy taʼminot oʻrnatish", "Kompyuterlar", "fixed", 100000, null, 60),
  ],
  "uy-tozalash": [
    s("1 xonali kvartira tozalash", "Kvartira", "fixed", 400000, null, 180),
    s("Bosh tozalash (1 m²)", "Kvartira", "from", 15000),
    s("Gilam yuvish (1 m²)", "Gilam", "fixed", 18000),
  ],
  "yuk-tashish": [
    s("Shahar ichida (Damas)", "Transport", "from", 150000),
    s("Shahar ichida (Labo)", "Transport", "from", 200000),
    s("Yuklovchi (1 soat)", "Yuklovchilar", "fixed", 80000),
  ],
  "kimyoviy-tozalash": [
    s("Kostyum", "Kiyim", "fixed", 80000),
    s("Palto", "Kiyim", "fixed", 120000),
    s("Koʻylak", "Kiyim", "fixed", 40000),
  ],
  atelye: [
    s("Shim qisqartirish", "Taʼmir", "fixed", 40000),
    s("Zamok almashtirish", "Taʼmir", "fixed", 50000),
    s("Koʻylak tikish", "Tikish", "from", 300000),
  ],
  avtoservis: [
    s("Motor moyini almashtirish", "Texnik xizmat", "fixed", 150000, null, 60),
    s("Kompyuter diagnostikasi", "Diagnostika", "fixed", 200000, null, 45),
    s("Tormoz kolodkalarini almashtirish", "Taʼmir", "from", 250000, null, 90),
    s("Xodovoy qism taʼmiri", "Taʼmir", "on_request", null),
  ],
  avtomoyka: [
    s("Tashqi yuvish", null, "fixed", 40000, null, 20),
    s("Kompleks yuvish", null, "fixed", 80000, null, 40),
    s("Salon kimyoviy tozalash", null, "from", 400000, null, 180),
  ],
  shinomontaj: [
    s("4 ta gʻildirakni almashtirish", null, "fixed", 120000, null, 40),
    s("Balansirovka", null, "fixed", 80000, null, 30),
    s("Teshikni yamash", null, "fixed", 30000, null, 20),
  ],
  "ehtiyot-qismlar": [
    p("Moy filtri", "Filtrlar", "fixed", 45000),
    p("Tormoz kolodkalari (komplekt)", "Tormoz tizimi", "from", 180000),
    p("Akkumulyator 60 Ah", "Elektr", "fixed", 950000),
  ],
  dorixonalar: [
    p("Paratsetamol 500 mg", "Dori vositalari", "fixed", 6000),
    p("C vitamini", "Vitaminlar", "fixed", 25000),
    p("Tibbiy niqob (10 dona)", "Gigiyena", "fixed", 15000),
    p("Elektron termometr", "Tibbiy buyumlar", "fixed", 45000),
  ],
  klinikalar: [
    s("Terapevt qabuli", "Shifokor qabuli", "fixed", 150000, null, 30),
    s("Qorin boʻshligʻi UZI", "Diagnostika", "fixed", 200000, null, 30),
    s("Umumiy qon tahlili", "Tahlillar", "fixed", 60000),
  ],
  stomatologiya: [
    s("Koʻrik va maslahat", null, "fixed", 100000, null, 30),
    s("Tish plombasi", "Davolash", "from", 350000, null, 60),
    s("Professional tish tozalash", "Gigiyena", "fixed", 400000, null, 60),
    s("Implant oʻrnatish", "Jarrohlik", "from", 5000000),
  ],
  diagnostika: [
    s("MRT (bosh miya)", "Tomografiya", "fixed", 900000, null, 40),
    s("UZI", "Ultratovush", "fixed", 180000, null, 30),
    s("Rentgen", "Rentgen", "fixed", 120000, null, 15),
  ],
  "oquv-markazlari": [
    s("Ingliz tili (oyiga)", "Tillar", "fixed", 500000),
    s("Matematika (oyiga)", "Fanlar", "fixed", 450000),
    s("IT asoslari (oyiga)", "IT", "fixed", 700000),
  ],
  "til-kurslari": [
    s("Ingliz tili — umumiy kurs (oyiga)", "Ingliz tili", "fixed", 550000),
    s("IELTS tayyorlov (oyiga)", "Ingliz tili", "fixed", 800000),
    s("Rus tili (oyiga)", "Rus tili", "fixed", 450000),
  ],
  repetitorlar: [s("Individual dars (1 soat)", null, "fixed", 150000, null, 60)],
  fitnes: [
    s("Oylik abonement", "Abonementlar", "fixed", 400000),
    s("Bir martalik tashrif", "Abonementlar", "fixed", 50000),
    s("Shaxsiy murabbiy bilan mashgʻulot", "Murabbiy", "fixed", 150000, null, 60),
  ],
  "oyin-markazlari": [
    s("1 soat oʻyin", null, "fixed", 50000, null, 60),
    s("Tugʻilgan kun paketi", null, "from", 1500000),
  ],
  "bolalar-maskanlari": [
    s("1 soat oʻyin maydonchasi", null, "fixed", 40000, null, 60),
    s("Tugʻilgan kun paketi", null, "from", 1200000),
  ],
  mehmonxonalar: [
    s("Standart xona (1 kecha)", "Xonalar", "fixed", 600000),
    s("Lyuks xona (1 kecha)", "Xonalar", "from", 1200000),
  ],
  "turistik-xizmatlar": [
    s("Samarqandga 1 kunlik sayohat", "Ichki turizm", "from", 900000),
    s("Chorvoq dam olish turi", "Ichki turizm", "from", 600000),
  ],
  toyxonalar: [s("Menyu (1 kishi uchun)", null, "from", 120000)],
  fotograflar: [
    s("Fotosessiya (1 soat)", "Foto", "fixed", 500000, null, 60),
    s("Toʻy videosi", "Video", "from", 3000000),
  ],
  veterinariya: [
    s("Veterinar koʻrigi", null, "fixed", 100000, null, 30),
    s("Emlash", null, "fixed", 150000, null, 20),
    s("Sterilizatsiya", "Jarrohlik", "from", 500000),
  ],
  zoodokonlar: [
    p("Mushuk ozuqasi 2 kg", "Ozuqa", "fixed", 85000),
    p("It uchun boʻyinbogʻ", "Aksessuarlar", "fixed", 60000),
  ],
  notarius: [
    s("Ishonchnomani tasdiqlash", null, "on_request", null),
    s("Shartnomani tasdiqlash", null, "on_request", null),
  ],
  yuristlar: [
    s("Yuridik konsultatsiya", null, "fixed", 300000, null, 60),
    s("Sudda vakillik", null, "on_request", null),
  ],
  "kiyim-kechak": [
    p("Erkaklar koʻylagi", "Erkaklar", "fixed", 180000, null, [
      ["size", "s,m,l,xl,2xl"],
      [null, "Rang", "Oq, koʻk"],
      ["material", "cotton"],
    ]),
    p("Ayollar koʻylagi", "Ayollar", "fixed", 250000, null, [
      ["size", "s,m,l"],
      [null, "Rang", "Qora, bordo"],
    ]),
    // Shim o'lchami kategoriya variantlarida yo'q (XS–XXL) — erkin xususiyat
    p("Jinsi shim", "Erkaklar", "fixed", 300000, null, [[null, "Bel oʻlchami", "30–38"]]),
  ],
  poyabzal: [
    p("Erkaklar tuflisi", "Erkaklar", "fixed", 450000, null, [
      ["size", "39,40,41,42,43,44,45"],
      ["material", "leather"],
    ]),
    p("Krossovka", "Sport", "fixed", 380000, null, [
      ["size", "36,37,38,39,40,41,42,43,44,45"],
      ["material", "textile"],
    ]),
  ],
  elektronika: [
    p("Smartfon 128 GB", "Telefonlar", "from", 2500000, null, [
      ["condition", "new"],
      ["warranty", "12"],
    ]),
    p("Simsiz quloqchin", "Aksessuarlar", "fixed", 250000),
    p("Tez quvvatlovchi qurilma", "Aksessuarlar", "fixed", 80000),
  ],
  "oziq-ovqat": [
    p("Non", "Non mahsulotlari", "fixed", 4000),
    p("Sut 1 l", "Sut mahsulotlari", "fixed", 12000),
    p("Tuxum (10 dona)", "Boshqa", "fixed", 18000),
  ],
  "uy-rozgor": [
    p("Kostryulkalar toʻplami", "Oshxona", "fixed", 450000),
    p("Elektr choynak", "Oshxona", "fixed", 120000),
  ],
  "qurilish-mollari": [
    p("Sement (50 kg)", "Qurilish aralashmalari", "fixed", 75000),
    p("Gʻisht (dona)", "Gʻisht", "fixed", 1200),
  ],
  "gul-sovga": [
    p("Atirgul (dona)", "Gullar", "fixed", 15000),
    p("Guldasta", "Gullar", "from", 250000),
  ],
};

const FALLBACK: Template[] = [s("Xizmat koʻrsatish", null, "on_request", null)];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Narxni 1 000 so'mgacha yaxlitlaydi (kichik narxlar — 100 so'mgacha) */
function roundSom(value: number): number {
  const step = value < 10000 ? 100 : 1000;
  return Math.max(step, Math.round(value / step) * step);
}

const toMoney = (som: number | null) =>
  som === null ? null : { amount: som * 100, currency: "UZS" as const };

/** Biznes uchun mahsulot/xizmatlar: kategoriya shabloni + biznesga xos narx farqi (±20%) */
export function itemsFor(business: DemoBusiness): DemoItem[] {
  const random = seededRandom(`items:${business.slug}`);
  const factor = 0.85 + random() * 0.4;
  const templates = TEMPLATES[business.categorySlug] ?? FALLBACK;
  const known = definitionsOf(CATEGORY_ATTRIBUTES[business.categorySlug] ?? []);

  return templates.map(([name, group, kind, priceType, min, max, duration, attributes]) => {
    const slug = slugify(name);
    return {
      id: demoId(`item:${business.slug}:${slug}`),
      slug,
      kind,
      name,
      group,
      description: null,
      price: {
        type: priceType,
        min: toMoney(min === null ? null : roundSom(min * factor)),
        max: toMoney(max === null ? null : roundSom(max * factor)),
      },
      durationMinutes: duration,
      attributes: (attributes ?? []).map((attribute): StoredAttribute => {
        if (attribute[0] === null) {
          return { key: slugify(attribute[1]), name: attribute[1], value: attribute[2] };
        }
        const definition = known.get(attribute[0]);
        if (!definition) throw new Error(`Kategoriyada xususiyat yo'q: ${attribute[0]}`);
        return storedTyped(definition, attribute[1]);
      }),
      photos: [],
      isAvailable: random() > 0.1,
    };
  });
}
