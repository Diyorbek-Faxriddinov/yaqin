import type {
  AdminAttribute,
  AdminPermission,
  AdminPhoto,
  AuditTargetType,
  BusinessRequestStatus,
  BusinessStatus,
  Consent,
  Item,
  Me,
  PlatformSettings,
  StatsTotals,
} from "@/lib/api/types";
import type { GeoPoint } from "@/lib/geo";
import { BUSINESSES, type DemoBusiness } from "./fixtures/businesses";
import { CATEGORIES, CATEGORY_ATTRIBUTES, type DemoCategory } from "./fixtures/categories";
import { itemsFor } from "./fixtures/items";
import {
  SEED_COMPLAINTS,
  SEED_REQUESTS,
  SEED_REVIEWS,
  SEED_USERS,
  type SeedComplaint,
  type SeedReview,
} from "./fixtures/moderation";

/**
 * Demo rejimdagi o'zgaruvchan maʼlumotlar: bizneslar (admin tahrirlaydi), katalog, rasmlar,
 * foydalanuvchilar, admin sessiyalari.
 * - Xotirada: server qayta ishga tushsa — boshlang'ich demo holatiga qaytadi.
 * - globalThis'da: route handler va server komponentlari Next.js ichida alohida modul
 *   nusxalarida ishlashi mumkin — holat bitta bo'lishi uchun.
 */

export type DemoSession = { userId: string; csrfToken: string };

/** Biznes yozuvi: fixture + admin boshqaradigan maydonlar. Qoralamada joylashuv bo'lmasligi mumkin. */
export type DemoBusinessRecord = Omit<DemoBusiness, "location"> & {
  location: GeoPoint | null;
  status: BusinessStatus;
  consent: Consent | null;
  telegram: string | null;
  instagram: string | null;
  updatedAt: string;
  /** Birinchi marta e'lon qilingan vaqt; shundan keyin slug (sahifa manzili) o'zgarmaydi */
  publishedAt: string | null;
};

export type DemoAdmin = {
  id: string;
  username: string;
  /** ⚠ Demo: ochiq matnda. Backendda — Argon2 xeshi */
  password: string;
  /** ⚠ Demo: qat'iy kod. Backendda — har bir admin uchun TOTP maxfiy kaliti (shifrlangan) */
  totpCode: string;
  /** Vaqtinchalik parol berilgan (yangi admin yoki parol tiklangan) — birinchi kirishda almashtiriladi */
  mustChangePassword: boolean;
  /** 2FA sozlanganmi; yo'q bo'lsa kirishda `next: setup` */
  totpConfigured: boolean;
  displayName: string;
  isRoot: boolean;
  isActive: boolean;
  roleIds: string[];
  /** Roldan tashqari alohida berilgan ruxsatlar */
  extraPermissions: AdminPermission[];
  createdAt: string;
  lastLoginAt: string | null;
};

export type DemoChallenge = {
  adminId: string;
  next: "totp" | "setup";
  /** Sozlashda yangi parol shu yerda kutadi — 2FA kodi tasdiqlangach yoziladi */
  pendingPassword: string | null;
  setupStarted: boolean;
  expiresAt: number;
  attempts: number;
};

export type DemoRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: AdminPermission[];
  isBuiltIn: boolean;
};

export type AuditEntry = {
  id: string;
  at: string;
  /** null — tizim (masalan, muvaffaqiyatsiz kirish urinishi) */
  adminId: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  summary: string;
};

/** Hisobot havolasi: token o'zi saqlanmaydi, faqat SHA-256 xeshi (ADR-0007) */
export type ReportLink = {
  tokenHash: string;
  createdAt: string;
  lastViewedAt: string | null;
  viewCount: number;
};

/** Kategoriya: slug o'zgarmaydi (URL'lar barqaror), shuning uchun ota-kategoriya slug orqali */
export type DemoCategoryRecord = DemoCategory & { attributes: AdminAttribute[] };

/** Sharh va shikoyat biznesga ID orqali bog'lanadi — biznes nomi (slug) o'zgarsa ham uzilmaydi */
export type StoredReview = SeedReview;
export type StoredComplaint = SeedComplaint;

export type StoredBusinessRequest = {
  id: string;
  businessName: string;
  activity: string | null;
  districtSlug: string | null;
  address: string | null;
  contactName: string;
  phone: string;
  note: string | null;
  status: BusinessRequestStatus;
  adminNote: string | null;
  businessId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoState = {
  sessions: Map<string, DemoSession>;
  users: Map<string, Me>;
  favorites: Map<string, string[]>;
  /** Bloklangan foydalanuvchilar: userId → sabab */
  blockedUsers: Map<string, { reason: string; at: string }>;
  reviews: StoredReview[];
  complaints: StoredComplaint[];
  requests: StoredBusinessRequest[];
  categories: DemoCategoryRecord[];
  businesses: DemoBusinessRecord[];
  items: Map<string, Item[]>;
  photos: Map<string, AdminPhoto[]>;
  media: Map<string, { contentType: string; bytes: Uint8Array }>;
  admins: DemoAdmin[];
  roles: DemoRole[];
  adminSessions: Map<string, { adminId: string; csrfToken: string; expiresAt: number }>;
  adminChallenges: Map<string, DemoChallenge>;
  loginFailures: Map<string, { count: number; blockedUntil: number }>;
  /** Faqat qo'shiladi (append-only) — ADR-0009 */
  audit: AuditEntry[];
  settings: PlatformSettings;
  /** businessId → havola */
  reportLinks: Map<string, ReportLink>;
  /** "businessId|YYYY-MM-DD" → haqiqiy hodisalar soni (demo asosiy qiymatlarga qo'shiladi) */
  statsEvents: Map<string, StatsTotals>;
};

export const ALL_PERMISSIONS: AdminPermission[] = [
  "business.view",
  "business.edit",
  "business.publish",
  "category.manage",
  "review.moderate",
  "complaint.manage",
  "user.view",
  "user.manage",
  "staff.manage",
  "audit.view",
  "settings.manage",
  "stats.view",
];

const ROLE_IDS = {
  moderator: "00000000-0000-4000-a000-0000000000b1",
  content: "00000000-0000-4000-a000-0000000000b2",
  analyst: "00000000-0000-4000-a000-0000000000b3",
};

/** Tizim rollari — o'chirilmaydi, ruxsatlarini Root o'zgartira oladi */
const BUILT_IN_ROLES: DemoRole[] = [
  {
    id: ROLE_IDS.moderator,
    name: "Moderator",
    description: "Sharhlar va shikoyatlar, foydalanuvchilarni koʻrish",
    permissions: ["review.moderate", "complaint.manage", "user.view"],
    isBuiltIn: true,
  },
  {
    id: ROLE_IDS.content,
    name: "Kontent menejeri",
    description: "Bizneslarni qoʻshish, tahrirlash va eʼlon qilish, kategoriyalar",
    permissions: ["business.view", "business.edit", "business.publish", "category.manage"],
    isBuiltIn: true,
  },
  {
    id: ROLE_IDS.analyst,
    name: "Tahlilchi",
    description: "Statistika va audit jurnali (faqat koʻrish)",
    permissions: ["business.view", "stats.view", "audit.view"],
    isBuiltIn: true,
  },
];

// ⚠ Faqat demo uchun: kirish maʼlumotlari kirish sahifasida ochiq ko'rsatiladi.
// Haqiqiy backendda parol Argon2 bilan xeshlanadi, TOTP — har bir admin uchun alohida maxfiy kalit.
const DEMO_ADMINS: DemoAdmin[] = [
  {
    id: "00000000-0000-4000-a000-0000000000a1",
    username: "root",
    password: "yaqin-demo",
    totpCode: "123456",
    mustChangePassword: false,
    totpConfigured: true,
    displayName: "Root (demo)",
    isRoot: true,
    isActive: true,
    roleIds: [],
    extraPermissions: [],
    createdAt: "2026-10-01T05:00:00.000Z",
    lastLoginAt: null,
  },
  {
    id: "00000000-0000-4000-a000-0000000000a2",
    username: "moderator",
    password: "yaqin-demo",
    totpCode: "123456",
    mustChangePassword: false,
    totpConfigured: true,
    displayName: "Moderator (demo)",
    isRoot: false,
    isActive: true,
    roleIds: [ROLE_IDS.moderator],
    // Rolda yo'q, alohida berilgan — "amaldagi ruxsatlar"da manbasi ko'rinadi
    extraPermissions: ["business.view"],
    createdAt: "2026-10-05T05:00:00.000Z",
    lastLoginAt: null,
  },
];

const DEFAULT_SETTINGS: PlatformSettings = {
  reviewsPremoderation: true,
  businessRequestsOpen: true,
  contacts: { telegram: null, email: null, phone: null },
};

function seedBusinesses(): DemoBusinessRecord[] {
  return BUSINESSES.map((business) => ({
    ...business,
    status: "published",
    consent: { givenBy: "Demo egasi", givenAt: business.createdAt, note: null },
    telegram: null,
    instagram: null,
    updatedAt: business.createdAt,
    publishedAt: business.createdAt,
  }));
}

function createState(): DemoState {
  return {
    sessions: new Map(),
    users: new Map(SEED_USERS.map((user) => [user.id, { ...user }])),
    favorites: new Map(),
    blockedUsers: new Map(),
    reviews: SEED_REVIEWS.map((review) => ({ ...review })),
    complaints: SEED_COMPLAINTS.map((complaint) => ({ ...complaint })),
    requests: SEED_REQUESTS.map((request) => ({
      ...request,
      businessId: null,
      updatedAt: request.createdAt,
    })),
    categories: CATEGORIES.map((category) => ({
      ...category,
      attributes: structuredClone(CATEGORY_ATTRIBUTES[category.slug] ?? []),
    })),
    businesses: seedBusinesses(),
    items: new Map(),
    photos: new Map(),
    media: new Map(),
    admins: structuredClone(DEMO_ADMINS),
    roles: structuredClone(BUILT_IN_ROLES),
    adminSessions: new Map(),
    adminChallenges: new Map(),
    loginFailures: new Map(),
    audit: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    reportLinks: new Map(),
    statsEvents: new Map(),
  };
}

/** Amaldagi ruxsatlar: rollar + alohida ruxsatlar (Root — hammasi) */
export function permissionsOf(admin: DemoAdmin): AdminPermission[] {
  if (admin.isRoot) return ALL_PERMISSIONS;
  const fromRoles = demoState.roles
    .filter((role) => admin.roleIds.includes(role.id))
    .flatMap((role) => role.permissions);
  return ALL_PERMISSIONS.filter((p) => fromRoles.includes(p) || admin.extraPermissions.includes(p));
}

const globalStore = globalThis as typeof globalThis & { __yaqinDemoState?: DemoState };

// Eski shakldagi holat (dev rejimida kod o'zgarganda) bo'lsa — qayta yaratamiz
if (!globalStore.__yaqinDemoState?.roles) globalStore.__yaqinDemoState = createState();

export const demoState: DemoState = globalStore.__yaqinDemoState;

/** Testlar uchun: boshlang'ich demo holatiga qaytarish */
export function resetDemoState() {
  Object.assign(demoState, createState());
}

export const SESSION_COOKIE = "sessionid";
export const ADMIN_SESSION_COOKIE = "adminsessionid";
export const CSRF_COOKIE = "csrftoken";
export const CSRF_HEADER = "x-csrftoken";

/** Katalog: fixture bizneslar uchun shablondan bir marta yaratiladi, keyin admin tahrirlaydi */
export function itemsOf(business: DemoBusinessRecord): Item[] {
  let items = demoState.items.get(business.id);
  if (!items) {
    items = itemsFor({ ...business, location: business.location ?? { lat: 0, lng: 0 } });
    demoState.items.set(business.id, items);
  }
  return items;
}

export function findCategory(slug: string): DemoCategoryRecord | undefined {
  return demoState.categories.find((c) => c.slug === slug);
}

export function findBusinessRecord(id: string): DemoBusinessRecord | undefined {
  return demoState.businesses.find((b) => b.id === id);
}

export function isUserBlocked(userId: string): boolean {
  return demoState.blockedUsers.has(userId);
}

export function photosOf(businessId: string): AdminPhoto[] {
  return demoState.photos.get(businessId) ?? [];
}

/** Ommaviy saytda ko'rinadigan bizneslar: e'lon qilingan va joylashuvi bor */
export function publicBusinesses(): Array<DemoBusinessRecord & { location: GeoPoint }> {
  return demoState.businesses.filter(
    (b): b is DemoBusinessRecord & { location: GeoPoint } =>
      b.status === "published" && b.location !== null,
  );
}

export function createDemoUser(): { sessionToken: string; session: DemoSession; user: Me } {
  const user: Me = {
    id: crypto.randomUUID(),
    displayName: "Demo foydalanuvchi",
    avatarUrl: null,
    provider: "demo",
    createdAt: new Date().toISOString(),
  };
  const sessionToken = crypto.randomUUID();
  const session = { userId: user.id, csrfToken: crypto.randomUUID() };
  demoState.users.set(user.id, user);
  demoState.sessions.set(sessionToken, session);
  return { sessionToken, session, user };
}

export function deleteDemoUser(userId: string) {
  demoState.users.delete(userId);
  demoState.favorites.delete(userId);
  for (const [token, session] of demoState.sessions) {
    if (session.userId === userId) demoState.sessions.delete(token);
  }
  // Kontraktdagi DELETE /me: chop etilgan sharhlar "O'chirilgan foydalanuvchi" nomi bilan qoladi,
  // qolgan shaxsiy yozuvlar (moderatsiyadagi sharhlar, shikoyatlar) o'chiriladi
  demoState.complaints = demoState.complaints.filter((c) => c.userId !== userId);
  demoState.reviews = demoState.reviews
    .filter((r) => r.userId !== userId || r.status === "published")
    .map((r) => (r.userId === userId ? { ...r, userId: DELETED_USER_ID } : r));
}

/** Akkaunti o'chirilgan muallif (ommaviy sharhlarda) */
export const DELETED_USER_ID = "deleted";
