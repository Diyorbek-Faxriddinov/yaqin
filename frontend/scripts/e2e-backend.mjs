/**
 * E2E haqiqiy backend bilan: `npm run e2e:backend [-- playwright parametrlari]`
 *
 * 1. `yaqin_e2e` bazasi noldan: migratsiyalar + demo maʼlumot + E2E administratorlari.
 * 2. Next.js build'i demo rejimsiz (`.next-backend`) — build vaqtida backend kerak
 *    (generateStaticParams biznes va kategoriya ro'yxatini API'dan oladi).
 * 3. Playwright: Caddy (8091) → Django (8001) + Next.js (3101); playwright.config.ts.
 *    "Backend javob bermasa" testlari — build nusxasidan (`.next-resilience`, 3102).
 *
 * Talablar: PostgreSQL + PostGIS, backend muhiti (`backend/.venv` yoki BACKEND_PYTHON), Caddy
 * (`D:\tools\caddy\caddy.exe` yoki CADDY_BIN).
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { relative, sep } from "node:path";

const python =
  process.env.BACKEND_PYTHON ??
  ["../backend/.venv/Scripts/python.exe", "../backend/.venv/bin/python"].find((p) =>
    existsSync(p),
  ) ??
  "python";
const BACKEND_PORT = 8001;
const SITE = "http://localhost:8091";
const backendEnv = { ...process.env, DATABASE_NAME: "yaqin_e2e", DJANGO_DEBUG: "true" };
const shell = process.platform === "win32";

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitFor(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // hali ishga tushmagan
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Javob yo'q: ${url}`);
}

// 1. Baza
run(python, ["manage.py", "e2e_prepare"], { cwd: "../backend", env: backendEnv, shell: false });

// 2. Build (vaqtinchalik backend bilan)
const backend = spawn(
  python,
  ["-m", "waitress", `--listen=127.0.0.1:${BACKEND_PORT}`, "config.wsgi:application"],
  { cwd: "../backend", env: backendEnv, stdio: "ignore" },
);
try {
  await waitFor(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`);
  run("npm", ["run", "build"], {
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-backend",
      NEXT_PUBLIC_DEMO_MODE: "false",
      NEXT_PUBLIC_DEMO_LOGIN: "true",
      // ⚠ Faqat E2E (e2e/support/providers.ts bilan bir xil) — haqiqiy bot va client ID emas
      NEXT_PUBLIC_TELEGRAM_BOT: "yaqin_e2e_bot",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "e2e-only.apps.googleusercontent.com",
      NEXT_PUBLIC_SITE_URL: SITE,
      API_URL: `http://127.0.0.1:${BACKEND_PORT}/api/v1`,
    },
  });
} finally {
  backend.kill();
}

// "Backend javob bermasa" serveri uchun build nusxasi (ish vaqti keshi umumiy bo'lmasin —
// playwright.config.ts, resilience). `cache` — ish vaqtida yig'iladi, nusxalanmaydi
rmSync(".next-resilience", { recursive: true, force: true });
cpSync(".next-backend", ".next-resilience", {
  recursive: true,
  filter: (source) => relative(".next-backend", source).split(sep)[0] !== "cache",
});

// 3. Testlar
run("npx", ["playwright", "test", ...process.argv.slice(2)], {
  env: {
    ...process.env,
    E2E_BACKEND: "1",
    E2E_REVALIDATE_SECRET: randomBytes(24).toString("base64url"),
  },
});
