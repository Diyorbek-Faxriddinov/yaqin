import { expect } from "vitest";
import type { OwnerInviteCreated } from "@/lib/api/types";
import { mockFetch } from "./fetch";

/** Kabinet va takliflar mock testlari uchun umumiy yordamchilar (faqat testlarda) */

const BASE = "http://demo.test/api/v1";
export type Session = { cookie: string; csrf: string };

const value = (cookies: string[], name: string) =>
  cookies
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0]
    ?.split("=")[1] ?? "";

export function call(path: string, session: Session | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session) headers.set("cookie", session.cookie);
  if (session && init.method && init.method !== "GET") headers.set("x-csrftoken", session.csrf);
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  return mockFetch(new Request(`${BASE}${path}`, { ...init, headers }));
}

export const post = (path: string, session: Session | null, body?: unknown) =>
  call(path, session, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function userLogin(): Promise<Session> {
  const response = await mockFetch(new Request(`${BASE}/auth/demo`, { method: "POST" }));
  const cookies = response.headers.getSetCookie();
  return {
    cookie: `sessionid=${value(cookies, "sessionid")}; csrftoken=${value(cookies, "csrftoken")}`,
    csrf: value(cookies, "csrftoken"),
  };
}

export async function adminLogin(username = "root"): Promise<Session> {
  const step1 = await post("/admin/auth/login", null, { username, password: "yaqin-demo" });
  const { challengeToken } = (await step1.json()) as { challengeToken: string };
  const step2 = await post("/admin/auth/2fa", null, { challengeToken, code: "123456" });
  const cookies = step2.headers.getSetCookie();
  return {
    cookie: `adminsessionid=${value(cookies, "adminsessionid")}; csrftoken=${value(cookies, "csrftoken")}`,
    csrf: value(cookies, "csrftoken"),
  };
}

/** Admin taklif havolasini yaratadi; token — URL fragmentidan */
export async function invite(businessId: string): Promise<string> {
  const admin = await adminLogin();
  const response = await post(`/admin/businesses/${businessId}/owner-invite`, admin);
  expect(response.status).toBe(201);
  const { url, qrDataUri } = (await response.json()) as OwnerInviteCreated;
  expect(qrDataUri).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(url).toMatch(/\/kabinet\/qoshilish#[A-Za-z0-9_-]{32,64}$/);
  return url.split("#")[1]!;
}

/** Yangi foydalanuvchi biznes egasi bo'ladi */
export async function owner(businessId: string): Promise<Session> {
  const session = await userLogin();
  const response = await post("/cabinet/invites/accept", session, {
    token: await invite(businessId),
  });
  expect(response.status).toBe(200);
  return session;
}

export function photoUpload(session: Session, businessId: string, type = "image/webp") {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array([1, 2, 3])], { type }), "photo.webp");
  return call(`/cabinet/businesses/${businessId}/uploads`, session, { method: "POST", body: form });
}
