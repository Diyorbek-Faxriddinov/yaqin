import type { AdminAttribute, CategoryIconKey } from "@/lib/api/types";
import { demoId } from "./ids";

export type DemoCategory = {
  id: string;
  slug: string;
  name: { uz: string; ru: string };
  iconKey: CategoryIconKey | null;
  parentSlug: string | null;
};

type Leaf = [slug: string, uz: string, ru: string];
type Root = [slug: string, iconKey: CategoryIconKey, uz: string, ru: string, children: Leaf[]];

// 0-bosqichda kelishilgan 12 ta yuqori darajadagi kategoriya (ADR-0008)
const TREE: Root[] = [
  [
    "dokonlar",
    "shopping",
    "Doʻkonlar",
    "Магазины",
    [
      ["kiyim-kechak", "Kiyim-kechak", "Одежда"],
      ["poyabzal", "Poyabzal", "Обувь"],
      ["elektronika", "Elektronika va texnika", "Электроника и техника"],
      ["oziq-ovqat", "Oziq-ovqat", "Продукты"],
      ["uy-rozgor", "Uy-roʻzgʻor buyumlari", "Товары для дома"],
      ["qurilish-mollari", "Qurilish mollari", "Стройматериалы"],
      ["kosmetika", "Kosmetika", "Косметика"],
      ["oyinchoqlar", "Oʻyinchoqlar", "Игрушки"],
      ["gul-sovga", "Gullar va sovgʻalar", "Цветы и подарки"],
    ],
  ],
  [
    "ovqatlanish",
    "food",
    "Ovqatlanish",
    "Еда",
    [
      ["restoranlar", "Restoranlar", "Рестораны"],
      ["kafelar", "Kafelar", "Кафе"],
      ["choyxonalar", "Choyxonalar", "Чайханы"],
      ["fast-food", "Fast-food", "Фастфуд"],
      ["qandolatxonalar", "Qandolatxonalar", "Кондитерские"],
    ],
  ],
  [
    "gozallik",
    "beauty",
    "Goʻzallik va parvarish",
    "Красота и уход",
    [
      ["sartaroshxonalar", "Sartaroshxonalar", "Парикмахерские"],
      ["gozallik-salonlari", "Goʻzallik salonlari", "Салоны красоты"],
      ["manikyur", "Manikyur va pedikyur", "Маникюр и педикюр"],
      ["kosmetologiya", "Kosmetologiya", "Косметология"],
    ],
  ],
  [
    "maishiy-xizmatlar",
    "home-services",
    "Uy va maishiy xizmatlar",
    "Бытовые услуги",
    [
      ["santexnika", "Santexnika", "Сантехника"],
      ["elektrik", "Elektrik xizmatlari", "Электрики"],
      ["texnika-tamiri", "Maishiy texnika taʼmiri", "Ремонт бытовой техники"],
      ["telefon-tamiri", "Telefon va kompyuter taʼmiri", "Ремонт телефонов и компьютеров"],
      ["uy-tozalash", "Uy tozalash", "Уборка"],
      ["yuk-tashish", "Yuk tashish", "Грузоперевозки"],
      ["kimyoviy-tozalash", "Kimyoviy tozalash va kir yuvish", "Химчистка и прачечная"],
      ["atelye", "Atelye va tikuvchilik", "Ателье"],
    ],
  ],
  [
    "avto",
    "auto",
    "Avto",
    "Авто",
    [
      ["avtoservis", "Avtoservis", "Автосервис"],
      ["avtomoyka", "Avtomoyka", "Автомойка"],
      ["shinomontaj", "Shinomontaj", "Шиномонтаж"],
      ["ehtiyot-qismlar", "Ehtiyot qismlar", "Автозапчасти"],
    ],
  ],
  [
    "soglik",
    "health",
    "Sogʻliq",
    "Здоровье",
    [
      ["dorixonalar", "Dorixonalar", "Аптеки"],
      ["klinikalar", "Klinikalar", "Клиники"],
      ["stomatologiya", "Stomatologiya", "Стоматология"],
      ["diagnostika", "Diagnostika markazlari", "Диагностические центры"],
    ],
  ],
  [
    "talim",
    "education",
    "Taʼlim",
    "Образование",
    [
      ["oquv-markazlari", "Oʻquv markazlari", "Учебные центры"],
      ["til-kurslari", "Til kurslari", "Языковые курсы"],
      ["repetitorlar", "Repetitorlar", "Репетиторы"],
    ],
  ],
  [
    "sport-dam-olish",
    "sport",
    "Sport va dam olish",
    "Спорт и отдых",
    [
      ["fitnes", "Sport va fitnes", "Спорт и фитнес"],
      ["oyin-markazlari", "Oʻyin markazlari", "Игровые центры"],
      ["bolalar-maskanlari", "Bolalar uchun maskanlar", "Детские развлечения"],
    ],
  ],
  [
    "sayohat",
    "travel",
    "Sayohat va mehmonxonalar",
    "Путешествия и отели",
    [
      ["mehmonxonalar", "Mehmonxonalar", "Гостиницы"],
      ["turistik-xizmatlar", "Turistik xizmatlar", "Туристические услуги"],
    ],
  ],
  [
    "toy-tadbirlar",
    "events",
    "Toʻy va tadbirlar",
    "Свадьбы и мероприятия",
    [
      ["toyxonalar", "Toʻyxonalar", "Банкетные залы"],
      ["fotograflar", "Fotograf va videograflar", "Фото и видеосъёмка"],
    ],
  ],
  [
    "uy-hayvonlari",
    "pets",
    "Uy hayvonlari",
    "Домашние животные",
    [
      ["veterinariya", "Veterinariya", "Ветеринария"],
      ["zoodokonlar", "Zoodoʻkonlar", "Зоомагазины"],
    ],
  ],
  [
    "professional-xizmatlar",
    "professional",
    "Professional xizmatlar",
    "Профессиональные услуги",
    [
      ["notarius", "Notariuslar", "Нотариусы"],
      ["yuristlar", "Yuristlar", "Юристы"],
      ["buxgalteriya", "Buxgalteriya xizmatlari", "Бухгалтерские услуги"],
    ],
  ],
];

/** Namunaviy atributlar — katalog formasida tayyor maydon sifatida taklif qilinadi (admin o'zgartiradi) */
export const CATEGORY_ATTRIBUTES: Record<string, AdminAttribute[]> = {
  "kiyim-kechak": [
    {
      key: "size",
      name: { uz: "Oʻlcham", ru: "Размер" },
      type: "multiselect",
      unit: null,
      options: ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({
        value: size.toLowerCase(),
        label: { uz: size, ru: size },
      })),
      filterable: true,
    },
    {
      key: "material",
      name: { uz: "Mato", ru: "Материал" },
      type: "text",
      unit: null,
      options: [],
      filterable: false,
    },
  ],
  elektronika: [
    {
      key: "warranty",
      name: { uz: "Kafolat", ru: "Гарантия" },
      type: "number",
      unit: "oy",
      options: [],
      filterable: false,
    },
    {
      key: "condition",
      name: { uz: "Holati", ru: "Состояние" },
      type: "select",
      unit: null,
      options: [
        { value: "new", label: { uz: "Yangi", ru: "Новый" } },
        { value: "used", label: { uz: "Ishlatilgan", ru: "Б/у" } },
      ],
      filterable: true,
    },
  ],
  avtomoyka: [
    {
      key: "car_type",
      name: { uz: "Mashina turi", ru: "Тип автомобиля" },
      type: "select",
      unit: null,
      options: [
        { value: "sedan", label: { uz: "Yengil", ru: "Легковой" } },
        { value: "suv", label: { uz: "Krossover", ru: "Кроссовер" } },
        { value: "minivan", label: { uz: "Miniven", ru: "Минивэн" } },
      ],
      filterable: true,
    },
  ],
  kafelar: [
    {
      key: "portion",
      name: { uz: "Porsiya", ru: "Порция" },
      type: "number",
      unit: "g",
      options: [],
      filterable: false,
    },
    {
      key: "halal",
      name: { uz: "Halol", ru: "Халяль" },
      type: "boolean",
      unit: null,
      options: [],
      filterable: true,
    },
  ],
};

export const CATEGORIES: DemoCategory[] = TREE.flatMap(([slug, iconKey, uz, ru, children]) => [
  { id: demoId(`category:${slug}`), slug, name: { uz, ru }, iconKey, parentSlug: null },
  ...children.map(([childSlug, childUz, childRu]) => ({
    id: demoId(`category:${childSlug}`),
    slug: childSlug,
    name: { uz: childUz, ru: childRu },
    iconKey,
    parentSlug: slug,
  })),
]);
