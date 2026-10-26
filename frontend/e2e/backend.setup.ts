import { expect, test as setup } from "@playwright/test";
import { authFile, E2E_ADMINS, E2E_PASSWORD, totpCode, type E2EAdmin } from "./support/backend";

/**
 * Backend rejimi: demo administratorlar haqiqiy TOTP bilan bir marta kiradi, sessiya cookie'lari
 * faylga saqlanadi (`e2e/.auth/`, Git'ga tushmaydi) — testlar ularni ulaydi (support/admin.ts).
 */
for (const admin of Object.keys(E2E_ADMINS) as E2EAdmin[]) {
  setup(`admin sessiyasi: ${admin}`, async ({ request }) => {
    const login = await request.post("/api/v1/admin/auth/login", {
      data: { username: admin, password: E2E_PASSWORD },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { challengeToken, next } = (await login.json()) as {
      challengeToken: string;
      next: string;
    };
    expect(next).toBe("totp");

    const verify = await request.post("/api/v1/admin/auth/2fa", {
      data: { challengeToken, code: totpCode(E2E_ADMINS[admin]) },
    });
    expect(verify.status(), await verify.text()).toBe(200);
    await request.storageState({ path: authFile(admin) });
  });
}
