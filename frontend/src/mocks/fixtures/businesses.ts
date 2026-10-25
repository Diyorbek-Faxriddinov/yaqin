import type { WeeklySchedule } from "@/lib/api/types";
import { DISTRICTS } from "./districts";
import { demoId, seededRandom } from "./ids";

// ⚠ To'qib chiqarilgan demo bizneslar. Haqiqiy tashkilotlarga o'xshashlik — tasodif.
// Telefon raqamlari mavjud bo'lmagan "00" kodi bilan — hech kimga tegishli emas.

export type DemoBusiness = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  districtSlug: string;
  location: { lat: number; lng: number };
  priceRange: { min: number; max: number } | null; // so'mda (API'da tiyinga aylantiriladi)
  schedule: WeeklySchedule | null;
  rating: { average: number | null; count: number };
  isVerified: boolean;
  createdAt: string;
  description: string | null;
  address: { text: string; landmark: string | null };
  phones: Array<{ number: string; label: string | null }>;
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function days(weekdays: number[], ...intervals: Array<[string, string]>): WeeklySchedule {
  return {
    is24x7: false,
    days: weekdays.map((weekday) => ({
      weekday,
      intervals: intervals.map(([open, close]) => ({ open, close })),
    })),
  };
}

const SCHEDULES = {
  daily: days(ALL_DAYS, ["09:00", "21:00"]),
  dailyLate: days(ALL_DAYS, ["10:00", "23:00"]),
  shop: days(ALL_DAYS, ["08:00", "22:00"]),
  weekdays: days([1, 2, 3, 4, 5, 6], ["09:00", "18:00"]),
  office: days([1, 2, 3, 4, 5], ["09:00", "13:00"], ["14:00", "18:00"]),
  night: days(ALL_DAYS, ["18:00", "02:00"]),
  clinic: days([1, 2, 3, 4, 5, 6], ["08:00", "20:00"]),
  always: { is24x7: true, days: [] } satisfies WeeklySchedule,
  unknown: null,
} as const;

type ScheduleKey = keyof typeof SCHEDULES;

type Row = [
  name: string,
  category: string,
  district: string,
  price: [number, number] | null,
  schedule: ScheduleKey,
  rating: [number, number] | null, // [o'rtacha, soni]
  daysAgo: number,
  verified: boolean,
  landmark: string | null,
];

// Har bir biznes bitta qatorda — jadval sifatida o'qish oson
// prettier-ignore
const ROWS: Row[] = [
  ["Ustoz sartaroshxonasi", "sartaroshxonalar", "chilonzor", [40000, 80000], "daily", [4.8, 37], 3, true, "Chilonzor metrosi yonida"],
  ["Barber Bek", "sartaroshxonalar", "yunusobod", [60000, 120000], "dailyLate", [4.6, 54], 12, true, "Minor masjidi roʻparasida"],
  ["Navroʻz sartaroshxonasi", "sartaroshxonalar", "sergeli", [30000, 50000], "weekdays", [4.2, 9], 40, false, null],
  ["Guli goʻzallik saloni", "gozallik-salonlari", "mirzo-ulugbek", [80000, 600000], "daily", [4.9, 112], 7, true, "Buyuk Ipak Yoʻli metrosi"],
  ["Lola salon", "gozallik-salonlari", "yakkasaroy", [100000, 900000], "daily", [4.4, 23], 25, true, null],
  ["Nafis manikyur studiyasi", "manikyur", "mirobod", [90000, 250000], "dailyLate", [4.7, 41], 5, true, "Oybek metrosi yonida"],
  ["Ozoda kosmetologiya", "kosmetologiya", "yunusobod", [150000, 1200000], "clinic", [4.5, 18], 60, false, null],

  ["Baraka choyxonasi", "choyxonalar", "shayxontohur", [25000, 60000], "daily", [4.6, 88], 15, true, "Chorsu bozori yonida"],
  ["Lazzat kafe", "kafelar", "chilonzor", [30000, 90000], "dailyLate", [4.3, 64], 9, true, null],
  ["Somsa markazi", "fast-food", "olmazor", [8000, 25000], "shop", [4.5, 120], 30, true, "Olmazor dehqon bozori"],
  ["Tandir uyi", "restoranlar", "mirzo-ulugbek", [70000, 250000], "dailyLate", [4.7, 76], 2, true, null],
  ["Shirin qandolatxonasi", "qandolatxonalar", "yakkasaroy", [15000, 180000], "daily", [4.8, 45], 18, true, "Bobur bogʻi yonida"],
  ["Tungi lavash", "fast-food", "yunusobod", [20000, 45000], "night", [4.0, 31], 6, false, null],
  ["Oq tosh kafe", "kafelar", "yangihayot", [25000, 70000], "daily", null, 1, false, null],

  ["Mohir santexnik xizmati", "santexnika", "mirobod", [50000, 400000], "weekdays", [4.6, 27], 11, true, null],
  ["Quvur ustasi", "santexnika", "uchtepa", [40000, 300000], "unknown", [3.9, 8], 70, false, null],
  ["Chaqmoq elektrik", "elektrik", "chilonzor", [60000, 500000], "weekdays", [4.4, 14], 20, true, null],
  ["Sovutgich taʼmiri", "texnika-tamiri", "yashnobod", [100000, 800000], "weekdays", [4.3, 22], 35, true, null],
  ["Smart taʼmir", "telefon-tamiri", "shayxontohur", [50000, 1500000], "daily", [4.5, 67], 8, true, "Malika bozori, 2-qavat"],
  ["Pok uy tozalash", "uy-tozalash", "yunusobod", [300000, 1500000], "office", [4.7, 19], 14, true, null],
  ["Tez yuk tashish", "yuk-tashish", "bektemir", [150000, 900000], "always", [4.1, 12], 45, false, null],
  ["Oq libos kimyoviy tozalash", "kimyoviy-tozalash", "mirzo-ulugbek", [30000, 200000], "weekdays", [4.6, 33], 22, true, null],
  ["Nozik atelye", "atelye", "olmazor", [40000, 700000], "weekdays", [4.8, 29], 50, true, "Qoraqamish 2/1 mavzesi"],

  ["Usta Jamshid avtoservisi", "avtoservis", "sergeli", [100000, 3000000], "weekdays", [4.5, 46], 16, true, "Sergeli avtobozori yonida"],
  ["Toza moyka", "avtomoyka", "chilonzor", [40000, 120000], "dailyLate", [4.2, 58], 4, true, null],
  ["Gʻildirak shinomontaj", "shinomontaj", "yashnobod", [30000, 150000], "always", [4.4, 21], 28, false, null],
  ["Avto detal", "ehtiyot-qismlar", "bektemir", [20000, 5000000], "weekdays", [4.0, 15], 90, false, null],

  ["Shifo dorixonasi", "dorixonalar", "chilonzor", null, "always", [4.6, 52], 10, true, null],
  ["Salomatlik dorixonasi", "dorixonalar", "yunusobod", null, "shop", [4.3, 17], 33, true, null],
  ["Tabassum stomatologiyasi", "stomatologiya", "mirobod", [100000, 5000000], "clinic", [4.8, 93], 13, true, "Amir Temur xiyoboni yaqinida"],
  ["Oila klinikasi", "klinikalar", "uchtepa", [80000, 1000000], "clinic", [4.4, 38], 24, true, null],
  ["Aniq diagnostika", "diagnostika", "yakkasaroy", [150000, 1800000], "clinic", [4.6, 27], 55, true, null],

  ["Bilim oʻquv markazi", "oquv-markazlari", "chilonzor", [350000, 800000], "office", [4.7, 48], 21, true, null],
  ["Til olami", "til-kurslari", "mirzo-ulugbek", [400000, 900000], "office", [4.5, 36], 38, true, null],
  ["Matematika repetitori", "repetitorlar", "yunusobod", [150000, 300000], "unknown", null, 2, false, null],

  ["Kuch sport zali", "fitnes", "yashnobod", [250000, 600000], "dailyLate", [4.5, 44], 17, true, null],
  ["Quvnoq bolalar markazi", "bolalar-maskanlari", "sergeli", [30000, 120000], "daily", [4.6, 61], 27, true, null],
  ["Arena oʻyin markazi", "oyin-markazlari", "mirzo-ulugbek", [40000, 200000], "dailyLate", [4.3, 25], 42, false, null],

  ["Chorsu mehmonxonasi", "mehmonxonalar", "shayxontohur", [450000, 1200000], "always", [4.2, 19], 80, true, null],
  ["Ipak yoʻli sayohatlari", "turistik-xizmatlar", "mirobod", [500000, 15000000], "office", [4.7, 22], 36, true, null],

  ["Bahor toʻyxonasi", "toyxonalar", "olmazor", [80000, 250000], "unknown", [4.4, 16], 65, true, null],
  ["Lahza foto studiyasi", "fotograflar", "yakkasaroy", [300000, 6000000], "weekdays", [4.9, 31], 19, true, null],

  ["Doʻstim veterinariya klinikasi", "veterinariya", "yunusobod", [80000, 900000], "clinic", [4.7, 26], 23, true, null],
  ["Mushuk va kuchuk zoodoʻkoni", "zoodokonlar", "chilonzor", [10000, 600000], "shop", [4.4, 13], 48, false, null],

  ["Ishonch notarial idorasi", "notarius", "mirobod", null, "office", [4.1, 11], 75, true, null],
  ["Huquq yuridik xizmati", "yuristlar", "yakkasaroy", [300000, 3000000], "office", [4.5, 9], 52, false, null],

  ["Moda kiyim doʻkoni", "kiyim-kechak", "chilonzor", [80000, 900000], "shop", [4.2, 35], 9, true, "Chilonzor Buyum bozori"],
  ["Qadam poyabzal", "poyabzal", "olmazor", [150000, 1200000], "daily", [4.3, 19], 31, true, null],
  ["Texno markaz", "elektronika", "yunusobod", [50000, 25000000], "daily", [4.1, 47], 12, true, null],
  ["Yangi kun mini-market", "oziq-ovqat", "sergeli", [3000, 150000], "always", [4.0, 28], 6, false, null],
  ["Uy-joy buyumlari", "uy-rozgor", "uchtepa", [10000, 2000000], "shop", [4.4, 12], 44, true, null],
  ["Gʻisht va sement", "qurilish-mollari", "bektemir", [5000, 1500000], "weekdays", [4.2, 10], 58, false, null],
  ["Atirgul gul doʻkoni", "gul-sovga", "mirobod", [30000, 1500000], "dailyLate", [4.8, 39], 3, true, null],
];

/** Lotin nomidan URL uchun slug: "Ustoz sartaroshxonasi" → "ustoz-sartaroshxonasi" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Demo yaratilgan sanalar uchun qat'iy boshlang'ich nuqta — testlar sanaga bog'liq bo'lmasligi uchun
export const BASE_DATE = Date.UTC(2026, 9, 25, 7, 0, 0);

export const BUSINESSES: DemoBusiness[] = ROWS.map(
  (
    [name, categorySlug, districtSlug, price, scheduleKey, rating, daysAgo, verified, landmark],
    index,
  ) => {
    const district = DISTRICTS.find((d) => d.slug === districtSlug);
    if (!district) throw new Error(`Demo: tuman topilmadi — ${districtSlug}`);
    const random = seededRandom(name);
    const slug = slugify(name);

    return {
      id: demoId(`business:${slug}`),
      slug,
      name,
      categorySlug,
      districtSlug,
      // Tuman markazidan ~0–2 km atrofida
      location: {
        lat: Number((district.center.lat + (random() - 0.5) * 0.03).toFixed(6)),
        lng: Number((district.center.lng + (random() - 0.5) * 0.04).toFixed(6)),
      },
      priceRange: price ? { min: price[0], max: price[1] } : null,
      schedule: SCHEDULES[scheduleKey],
      rating: rating ? { average: rating[0], count: rating[1] } : { average: null, count: 0 },
      isVerified: verified,
      createdAt: new Date(BASE_DATE - daysAgo * 86_400_000).toISOString(),
      description: `${name} — demo maʼlumot. Haqiqiy biznes emas.`,
      address: {
        text: `Toshkent sh., ${district.name.uz} tumani, demo koʻchasi, ${index + 1}-uy`,
        landmark,
      },
      phones: [{ number: `+99800000${String(index + 1).padStart(4, "0")}`, label: null }],
    };
  },
);
