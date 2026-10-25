import type {
  AdminPermission,
  AdminPhoto,
  BusinessStatus,
  Complaint,
  Consent,
  Item,
  Me,
  MyReview,
} from "@/lib/api/types";
import type { GeoPoint } from "@/lib/geo";
import { BUSINESSES, type DemoBusiness } from "./fixtures/businesses";
import { itemsFor } from "./fixtures/items";

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
};

export type DemoAdmin = {
  id: string;
  username: string;
  password: string;
  totpCode: string;
  displayName: string;
  isRoot: boolean;
  permissions: AdminPermission[];
};

export type AuditEntry = {
  id: string;
  at: string;
  adminId: string;
  action: string;
  targetType: "business" | "item" | "photo" | "review" | "complaint" | "category" | "admin";
  targetId: string;
  summary: string;
};

type StoredReview = MyReview & { userId: string };
type StoredComplaint = Complaint & { userId: string; businessId: string };

type DemoState = {
  sessions: Map<string, DemoSession>;
  users: Map<string, Me>;
  favorites: Map<string, string[]>;
  reviews: StoredReview[];
  complaints: StoredComplaint[];
  businesses: DemoBusinessRecord[];
  items: Map<string, Item[]>;
  photos: Map<string, AdminPhoto[]>;
  media: Map<string, { contentType: string; bytes: Uint8Array }>;
  admins: DemoAdmin[];
  adminSessions: Map<string, { adminId: string; csrfToken: string; expiresAt: number }>;
  adminChallenges: Map<string, { adminId: string; expiresAt: number; attempts: number }>;
  loginFailures: Map<string, { count: number; blockedUntil: number }>;
  /** Faqat qo'shiladi (append-only) — ADR-0009 */
  audit: AuditEntry[];
};

export const ALL_PERMISSIONS: AdminPermission[] = [
  "business.view",
  "business.edit",
  "business.publish",
  "category.manage",
  "review.moderate",
  "complaint.manage",
  "user.view",
  "staff.manage",
  "audit.view",
  "settings.manage",
];

// ⚠ Faqat demo uchun: kirish maʼlumotlari kirish sahifasida ochiq ko'rsatiladi.
// Haqiqiy backendda parol Argon2 bilan xeshlanadi, TOTP — har bir admin uchun alohida maxfiy kalit.
export const DEMO_ADMINS: DemoAdmin[] = [
  {
    id: "00000000-0000-4000-a000-0000000000a1",
    username: "root",
    password: "yaqin-demo",
    totpCode: "123456",
    displayName: "Root (demo)",
    isRoot: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: "00000000-0000-4000-a000-0000000000a2",
    username: "moderator",
    password: "yaqin-demo",
    totpCode: "123456",
    displayName: "Moderator (demo)",
    isRoot: false,
    permissions: ["business.view", "review.moderate", "complaint.manage"],
  },
];

function seedBusinesses(): DemoBusinessRecord[] {
  return BUSINESSES.map((business) => ({
    ...business,
    status: "published",
    consent: { givenBy: "Demo egasi", givenAt: business.createdAt, note: null },
    telegram: null,
    instagram: null,
    updatedAt: business.createdAt,
  }));
}

function createState(): DemoState {
  return {
    sessions: new Map(),
    users: new Map(),
    favorites: new Map(),
    reviews: [],
    complaints: [],
    businesses: seedBusinesses(),
    items: new Map(),
    photos: new Map(),
    media: new Map(),
    admins: DEMO_ADMINS,
    adminSessions: new Map(),
    adminChallenges: new Map(),
    loginFailures: new Map(),
    audit: [],
  };
}

const globalStore = globalThis as typeof globalThis & { __yaqinDemoState?: DemoState };

// Eski shakldagi holat (dev rejimida kod o'zgarganda) bo'lsa — qayta yaratamiz
if (!globalStore.__yaqinDemoState?.businesses) globalStore.__yaqinDemoState = createState();

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
  // Sharhlar anonimlashtiriladi (kontraktdagi DELETE /me tavsifiga mos)
  demoState.complaints = demoState.complaints.filter((c) => c.userId !== userId);
  demoState.reviews = demoState.reviews.filter((r) => r.userId !== userId);
}
