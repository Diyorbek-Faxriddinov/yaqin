import { existsSync } from "node:fs";
import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * Ikki rejim:
 * - demo (standart, `npm run e2e`): Next.js production build'i mock API bilan;
 * - backend (`npm run e2e:backend`, E2E_BACKEND=1): Caddy → Django (`yaqin_e2e` bazasi) +
 *   Next.js (`.next-backend` build'i, demo o'chiq) — productiondagi tartib bilan bir xil.
 */
const isBackend = process.env.E2E_BACKEND === "1";

const PORT = Number(process.env.E2E_PORT ?? (isBackend ? 8091 : 3100));
const baseURL = `http://localhost:${PORT}`;
const BACKEND_PORT = 8001;
const FRONTEND_PORT = 3101;

const python =
  process.env.BACKEND_PYTHON ??
  [`../backend/.venv/Scripts/python.exe`, `../backend/.venv/bin/python`].find((p) =>
    existsSync(p),
  ) ??
  "python";
const caddy =
  process.env.CADDY_BIN ??
  (existsSync("D:/tools/caddy/caddy.exe") ? "D:/tools/caddy/caddy.exe" : "caddy");
const revalidateSecret = process.env.E2E_REVALIDATE_SECRET ?? "e2e-only-revalidate-secret";

// "Backend javob bermasa" sinovi: ulanishni qabul qilib, hech qachon javob qaytarmaydigan port
const HANGING_PORT = 8009;
const RESILIENCE_PORT = 3102;

const backendServers: PlaywrightTestConfig["webServer"] = [
  {
    command: `"${python}" -m waitress --listen=127.0.0.1:${BACKEND_PORT} --threads=16 config.wsgi:application`,
    cwd: "../backend",
    url: `http://127.0.0.1:${BACKEND_PORT}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_NAME: "yaqin_e2e",
      DJANGO_DEBUG: "true",
      DEMO_LOGIN_ENABLED: "true",
      // Barcha testlar bitta IP'dan — cheklovlar yumshatiladi (faqat DEBUG'da ruxsat etilgan)
      DJANGO_THROTTLE_OVERRIDES:
        "auth=1000/min,business_requests=1000/hour,events=10000/min,reviews=1000/hour,complaints=1000/hour,admin_auth=1000/min",
      DJANGO_ALLOWED_ORIGINS: baseURL,
      DJANGO_NUM_PROXIES: "1",
      FRONTEND_REVALIDATE_URL: `http://127.0.0.1:${FRONTEND_PORT}/api/revalidate`,
      REVALIDATE_SECRET: revalidateSecret,
      // ⚠ Faqat E2E: sinov bot tokeni va client ID (e2e/support/providers.ts bilan bir xil)
      TELEGRAM_BOT_TOKEN: "123456789:e2e-only-not-a-real-bot-token",
      GOOGLE_CLIENT_ID: "e2e-only.apps.googleusercontent.com",
    },
  },
  {
    command: `npx next start --port ${FRONTEND_PORT}`,
    url: `http://127.0.0.1:${FRONTEND_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: ".next-backend",
      API_URL: `http://127.0.0.1:${BACKEND_PORT}/api/v1`,
      REVALIDATE_SECRET: revalidateSecret,
    },
  },
  {
    command: `node -e "require('net').createServer(() => {}).listen(${HANGING_PORT}, '127.0.0.1')"`,
    port: HANGING_PORT,
    reuseExistingServer: false,
  },
  {
    command: `npx next start --port ${RESILIENCE_PORT}`,
    // Sahifa emas (u backendga murojaat qiladi) — statik javob
    url: `http://127.0.0.1:${RESILIENCE_PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: ".next-backend",
      API_URL: `http://127.0.0.1:${HANGING_PORT}/api/v1`,
      API_TIMEOUT_MS: "1500",
    },
  },
  {
    command: `"${caddy}" run --config ../scripts/local/Caddyfile`,
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      YAQIN_PORT: String(PORT),
      YAQIN_BACKEND: `127.0.0.1:${BACKEND_PORT}`,
      YAQIN_FRONTEND: `127.0.0.1:${FRONTEND_PORT}`,
    },
  },
];

const viewports = [
  {
    name: "mobile",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "tablet",
    use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
  },
  {
    name: "desktop",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
  },
];

// Uchta asosiy ekran kengligi: telefon (375), planshet (768), desktop (1280)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Parallel ishlaganda client navigatsiya sekinlashishi mumkin
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
  },
  projects: isBackend
    ? [
        // Admin sessiyalari haqiqiy TOTP bilan bir marta ochiladi (e2e/backend.setup.ts)
        { name: "setup", testMatch: /backend\.setup\.ts/ },
        // Javob bermaydigan backend bilan alohida Next.js server (e2e/resilience.spec.ts)
        {
          name: "resilience",
          testMatch: /resilience\.spec\.ts/,
          use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${RESILIENCE_PORT}` },
        },
        ...viewports.map((project) => ({
          ...project,
          dependencies: ["setup"],
          testIgnore: /resilience\.spec\.ts/,
        })),
      ]
    : viewports.map((project) => ({
        ...project,
        testIgnore: [/backend\.setup\.ts/, /resilience\.spec\.ts/],
      })),
  // Testlar production build ustida ishlaydi — dev rejimdagi farqlar natijaga ta'sir qilmaydi
  webServer: isBackend
    ? backendServers
    : {
        command: `npm run start -- --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
