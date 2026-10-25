import type { Complaint, Me, MyReview } from "@/lib/api/types";

/**
 * Demo rejimdagi foydalanuvchi maʼlumotlari (sessiyalar, sevimlilar, sharhlar, shikoyatlar).
 * - Xotirada: server qayta ishga tushsa — tozalanadi (bu demo, haqiqiy saqlash backendda).
 * - globalThis'da: route handler va server komponentlari Next.js ichida alohida modul
 *   nusxalarida ishlashi mumkin — holat bitta bo'lishi uchun.
 */

export type DemoSession = { userId: string; csrfToken: string };

type StoredReview = MyReview & { userId: string };
type StoredComplaint = Complaint & { userId: string; businessId: string };

type DemoState = {
  sessions: Map<string, DemoSession>;
  users: Map<string, Me>;
  favorites: Map<string, string[]>;
  reviews: StoredReview[];
  complaints: StoredComplaint[];
};

const globalStore = globalThis as typeof globalThis & { __yaqinDemoState?: DemoState };

export const demoState: DemoState = (globalStore.__yaqinDemoState ??= {
  sessions: new Map(),
  users: new Map(),
  favorites: new Map(),
  reviews: [],
  complaints: [],
});

export const SESSION_COOKIE = "sessionid";
export const CSRF_COOKIE = "csrftoken";
export const CSRF_HEADER = "x-csrftoken";

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
