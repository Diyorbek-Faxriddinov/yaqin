import { expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { authFile, E2E_PASSWORD, isBackend } from "./backend";

/**
 * Biznes egasi taklif havolasini admin API orqali yaratadi (admin interfeysi — 6.4-qadam).
 * Alohida so'rov konteksti: brauzerdagi mijoz sessiyasi va uning CSRF cookie'si buzilmaydi.
 * - Demo: admin mock'ga kiradi (kod — 123456).
 * - Backend: setup project saqlagan root sessiyasi (backend.setup.ts).
 */
async function adminApi(baseURL: string): Promise<{ api: APIRequestContext; csrf: string }> {
  const api = await playwrightRequest.newContext({
    baseURL,
    storageState: isBackend ? authFile("root") : undefined,
  });
  if (!isBackend) {
    const login = await api.post("/api/v1/admin/auth/login", {
      data: { username: "root", password: E2E_PASSWORD },
    });
    const { challengeToken } = (await login.json()) as { challengeToken: string };
    const verify = await api.post("/api/v1/admin/auth/2fa", {
      data: { challengeToken, code: "123456" },
    });
    expect(verify.status(), await verify.text()).toBe(200);
  }
  const { cookies } = await api.storageState();
  return { api, csrf: cookies.find((c) => c.name === "csrftoken")?.value ?? "" };
}

export type OwnerInvite = { token: string; businessId: string; name: string };

export async function createOwnerInvite(baseURL: string, slug: string): Promise<OwnerInvite> {
  const { api, csrf } = await adminApi(baseURL);
  try {
    const business = (await (await api.get(`/api/v1/businesses/${slug}`)).json()) as {
      id: string;
      name: string;
    };
    const response = await api.post(`/api/v1/admin/businesses/${business.id}/owner-invite`, {
      headers: { "X-CSRFToken": csrf, Origin: baseURL },
    });
    expect(response.status(), await response.text()).toBe(201);
    const { url } = (await response.json()) as { url: string };
    return { token: url.split("#")[1] ?? "", businessId: business.id, name: business.name };
  } finally {
    await api.dispose();
  }
}
