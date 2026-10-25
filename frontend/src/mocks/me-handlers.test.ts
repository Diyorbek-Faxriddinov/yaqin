// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type { Me, MyReview } from "@/lib/api/types";
import { mockFetch } from "./fetch";
import { BUSINESSES } from "./fixtures/businesses";

const BASE = "http://demo.test/api/v1";

type Session = { cookie: string; csrf: string };

/** Demo kirish: Set-Cookie sarlavhalaridan sessiya va CSRF tokenni oladi */
async function login(): Promise<Session & { user: Me }> {
  const response = await mockFetch(new Request(`${BASE}/auth/demo`, { method: "POST" }));
  const setCookies = response.headers.getSetCookie();
  const session = setCookies.find((c) => c.startsWith("sessionid="));
  const csrf = setCookies.find((c) => c.startsWith("csrftoken="));
  expect(session).toContain("HttpOnly");
  expect(session).toContain("SameSite=Lax");
  expect(csrf).not.toContain("HttpOnly");
  const value = (cookie?: string) => cookie?.split(";")[0]?.split("=")[1] ?? "";
  return {
    cookie: `sessionid=${value(session)}; csrftoken=${value(csrf)}`,
    csrf: value(csrf),
    user: (await response.json()) as Me,
  };
}

function call(path: string, session: Session | null, init: RequestInit & { csrf?: boolean } = {}) {
  const headers = new Headers(init.headers);
  if (session) headers.set("cookie", session.cookie);
  if (session && init.csrf !== false && init.method && init.method !== "GET") {
    headers.set("x-csrftoken", session.csrf);
  }
  if (init.body) headers.set("content-type", "application/json");
  return mockFetch(new Request(`${BASE}${path}`, { ...init, headers }));
}

const business = BUSINESSES[0]!;

describe("demo autentifikatsiya va sessiya", () => {
  it("kirmasdan /me — 401", async () => {
    expect((await call("/me", null)).status).toBe(401);
  });

  it("demo kirish → /me foydalanuvchini qaytaradi", async () => {
    const session = await login();
    const response = await call("/me", session);
    expect(response.status).toBe(200);
    expect(((await response.json()) as Me).id).toBe(session.user.id);
  });

  it("CSRF tokensiz o'zgartiruvchi so'rov — 403", async () => {
    const session = await login();
    const response = await call(`/me/favorites/${business.id}`, session, {
      method: "PUT",
      csrf: false,
    });
    expect(response.status).toBe(403);
    expect(((await response.json()) as { code: string }).code).toBe("csrf_failed");
  });

  it("chiqishdan keyin sessiya yaroqsiz", async () => {
    const session = await login();
    expect((await call("/auth/logout", session, { method: "POST" })).status).toBe(204);
    expect((await call("/me", session)).status).toBe(401);
  });

  it("Telegram/Google demo rejimida halol rad etiladi", async () => {
    const response = await call("/auth/telegram", null, { method: "POST", body: "{}" });
    expect(response.status).toBe(401);
  });

  it("profil ismini o'zgartirish va validatsiya", async () => {
    const session = await login();
    const bad = await call("/me", session, {
      method: "PATCH",
      body: JSON.stringify({ displayName: "A" }),
    });
    expect(bad.status).toBe(400);
    const ok = await call("/me", session, {
      method: "PATCH",
      body: JSON.stringify({ displayName: "Aziz" }),
    });
    expect(((await ok.json()) as Me).displayName).toBe("Aziz");
  });
});

describe("sevimlilar", () => {
  it("qo'shish idempotent, ro'yxat va olib tashlash", async () => {
    const session = await login();
    await call(`/me/favorites/${business.id}`, session, { method: "PUT" });
    await call(`/me/favorites/${business.id}`, session, { method: "PUT" });
    expect(await (await call("/me/favorites/ids", session)).json()).toEqual([business.id]);

    const list = (await (await call("/me/favorites", session)).json()) as Array<{ id: string }>;
    expect(list.map((b) => b.id)).toEqual([business.id]);

    await call(`/me/favorites/${business.id}`, session, { method: "DELETE" });
    expect(await (await call("/me/favorites/ids", session)).json()).toEqual([]);
  });

  it("foydalanuvchilar sevimlilari aralashmaydi", async () => {
    const a = await login();
    const b = await login();
    await call(`/me/favorites/${business.id}`, a, { method: "PUT" });
    expect(await (await call("/me/favorites/ids", b)).json()).toEqual([]);
  });
});

describe("sharhlar", () => {
  it("sharh moderatsiyaga tushadi; takroriy — 409", async () => {
    const session = await login();
    const created = await call(`/businesses/${business.slug}/reviews`, session, {
      method: "POST",
      body: JSON.stringify({ rating: 5, text: "Zo'r" }),
    });
    expect(created.status).toBe(201);
    expect(((await created.json()) as MyReview).status).toBe("pending");

    const again = await call(`/businesses/${business.slug}/reviews`, session, {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    expect(again.status).toBe(409);
  });

  it("noto'g'ri baho — 400", async () => {
    const session = await login();
    const response = await call(`/businesses/${business.slug}/reviews`, session, {
      method: "POST",
      body: JSON.stringify({ rating: 7 }),
    });
    expect(response.status).toBe(400);
  });

  it("boshqa foydalanuvchining sharhini o'chirib bo'lmaydi", async () => {
    const owner = await login();
    const other = await login();
    const created = (await (
      await call(`/businesses/${business.slug}/reviews`, owner, {
        method: "POST",
        body: JSON.stringify({ rating: 3 }),
      })
    ).json()) as MyReview;
    expect((await call(`/me/reviews/${created.id}`, other, { method: "DELETE" })).status).toBe(404);
    expect((await call(`/me/reviews/${created.id}`, owner, { method: "DELETE" })).status).toBe(204);
  });
});

describe("shikoyatlar", () => {
  it("'other' sababi uchun izoh majburiy", async () => {
    const session = await login();
    const bad = await call("/complaints", session, {
      method: "POST",
      body: JSON.stringify({ businessId: business.id, reason: "other", text: "qisqa" }),
    });
    expect(bad.status).toBe(400);
    const ok = await call("/complaints", session, {
      method: "POST",
      body: JSON.stringify({ businessId: business.id, reason: "wrong_info" }),
    });
    expect(ok.status).toBe(201);
    const mine = (await (await call("/me/complaints", session)).json()) as Array<{
      status: string;
    }>;
    expect(mine[0]?.status).toBe("open");
  });
});
