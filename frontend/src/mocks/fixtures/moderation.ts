import type { ComplaintReason, ComplaintStatus, Me, ReviewStatus } from "@/lib/api/types";
import { BASE_DATE, BUSINESSES } from "./businesses";
import { demoId } from "./ids";

// ⚠ To'qib chiqarilgan demo navbat: moderatsiya, shikoyatlar va so'rovlar sahifalari bo'sh
// bo'lmasligi uchun. Ismlar haqiqiy odamlarga tegishli emas; telefonlar mavjud bo'lmagan "00" kodida.

const hoursAgo = (hours: number) => new Date(BASE_DATE - hours * 3_600_000).toISOString();

function businessId(slug: string): string {
  const business = BUSINESSES.find((b) => b.slug === slug);
  if (!business) throw new Error(`Demo: biznes topilmadi — ${slug}`);
  return business.id;
}

const USER_ROWS: Array<[name: string, provider: Me["provider"], hours: number]> = [
  ["Aziz", "telegram", 400],
  ["Malika R.", "google", 350],
  ["Jasur", "telegram", 300],
  ["Dilnoza", "telegram", 200],
  ["Sardor", "google", 120],
  ["Nodira", "telegram", 60],
];

export const SEED_USERS: Me[] = USER_ROWS.map(([displayName, provider, hours]) => ({
  id: demoId(`user:${displayName}`),
  displayName,
  avatarUrl: null,
  provider,
  createdAt: hoursAgo(hours),
}));

const userId = (index: number) => SEED_USERS[index]?.id ?? "";

export type SeedReview = {
  id: string;
  userId: string;
  businessId: string;
  rating: number;
  text: string | null;
  status: ReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
  moderatedAt: string | null;
};

const REVIEW_ROWS: Array<
  [
    user: number,
    business: string,
    rating: number,
    text: string | null,
    status: ReviewStatus,
    hours: number,
  ]
> = [
  [
    0,
    "ustoz-sartaroshxonasi",
    5,
    "Usta juda tajribali, 20 daqiqada chiroyli qilib qoʻydi.",
    "pending",
    30,
  ],
  [1, "tandir-uyi", 4, "Somsasi zoʻr, lekin kechqurun joy topish qiyin.", "pending", 20],
  [
    2,
    "toza-moyka",
    2,
    "Navbat uzun boʻldi, aytilgan vaqtdan bir soat kech tugatishdi.",
    "pending",
    8,
  ],
  [3, "texno-markaz", 5, null, "pending", 3],
  [4, "atirgul-gul-dokoni", 1, "Arzon gullar shu yerda: t.me/boshqa_dokon", "rejected", 90],
];

export const SEED_REVIEWS: SeedReview[] = REVIEW_ROWS.map(
  ([user, slug, rating, text, status, hours], index) => ({
    id: demoId(`seed-review:${index}`),
    userId: userId(user),
    businessId: businessId(slug),
    rating,
    text,
    status,
    rejectionReason: status === "rejected" ? "Reklama va boshqa doʻkonga havola" : null,
    createdAt: hoursAgo(hours),
    moderatedAt: status === "pending" ? null : hoursAgo(hours - 2),
  }),
);

export type SeedComplaint = {
  id: string;
  userId: string;
  businessId: string;
  reason: ComplaintReason;
  text: string | null;
  status: ComplaintStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const COMPLAINT_ROWS: Array<
  [
    user: number,
    business: string,
    reason: ComplaintReason,
    text: string | null,
    status: ComplaintStatus,
    hours: number,
  ]
> = [
  [
    5,
    "tandir-uyi",
    "wrong_info",
    "Yakshanba kuni ham ochiq, saytda dam olish deb yozilgan.",
    "open",
    26,
  ],
  [2, "yangi-kun-mini-market", "closed_permanently", null, "open", 5],
  [
    3,
    "moda-kiyim-dokoni",
    "wrong_location",
    "Doʻkon bozorning ikkinchi qavatiga koʻchgan.",
    "in_review",
    50,
  ],
  [0, "texno-markaz", "wrong_info", "Telefon raqami oʻzgargan.", "resolved", 140],
];

export const SEED_COMPLAINTS: SeedComplaint[] = COMPLAINT_ROWS.map(
  ([user, slug, reason, text, status, hours], index) => ({
    id: demoId(`seed-complaint:${index}`),
    userId: userId(user),
    businessId: businessId(slug),
    reason,
    text,
    status,
    resolutionNote: status === "resolved" ? "Rahmat! Telefon raqami yangilandi." : null,
    createdAt: hoursAgo(hours),
    updatedAt: hoursAgo(status === "open" ? hours : hours - 4),
  }),
);

export type SeedBusinessRequest = {
  id: string;
  businessName: string;
  activity: string | null;
  districtSlug: string | null;
  address: string | null;
  contactName: string;
  phone: string;
  note: string | null;
  status: "new" | "contacted";
  adminNote: string | null;
  createdAt: string;
};

export const SEED_REQUESTS: SeedBusinessRequest[] = [
  {
    id: demoId("seed-request:0"),
    businessName: "Hunarmand duradgorlik ustaxonasi",
    activity: "Mebel yasash va taʼmirlash",
    districtSlug: "yashnobod",
    address: "Demo koʻchasi, 14-uy, hovli ichida",
    contactName: "Rustam aka",
    phone: "+998001110001",
    note: "Ertalab 10 dan keyin qoʻngʻiroq qiling.",
    status: "new",
    adminNote: null,
    createdAt: hoursAgo(4),
  },
  {
    id: demoId("seed-request:1"),
    businessName: "Shirin non",
    activity: "Tandir non va pishiriqlar",
    districtSlug: "olmazor",
    address: null,
    contactName: "Gulchehra",
    phone: "+998001110002",
    note: null,
    status: "new",
    adminNote: null,
    createdAt: hoursAgo(28),
  },
  {
    id: demoId("seed-request:2"),
    businessName: "Tez kalit",
    activity: "Kalit yasash, qulf ochish",
    districtSlug: "chilonzor",
    address: "Chilonzor bozori, 3-qator",
    contactName: "Bahodir",
    phone: "+998001110003",
    note: null,
    status: "contacted",
    adminNote: "Shanba kuni borib suratga olaman.",
    createdAt: hoursAgo(72),
  },
];
