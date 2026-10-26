import { createHmac } from "node:crypto";

/**
 * E2E rejimi: demo (mock) yoki haqiqiy backend (`npm run e2e:backend`). Backend rejimida testlar
 * Caddy orqali Django + Next.js bilan ishlaydi, baza har ishga tushirishda noldan seed qilinadi.
 */
export const isBackend = process.env.E2E_BACKEND === "1";

/**
 * ⚠ E2E demo administratorlari — backend `seed_demo --e2e-admins` dagi bilan bir xil (faqat
 * DEBUG va alohida `yaqin_e2e` bazasi). Demo rejimida mock har doim "123456" ni qabul qiladi.
 */
export const E2E_ADMINS = {
  root: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  moderator: "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU",
} as const;
export type E2EAdmin = keyof typeof E2E_ADMINS;
export const E2E_PASSWORD = "yaqin-demo";

export const authFile = (admin: E2EAdmin) => `e2e/.auth/${admin}.json`;

function base32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error(`Base32 emas: ${char}`);
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)));
}

/** RFC 6238 TOTP (SHA-1, 6 xona, 30 soniya) — autentifikator ilovalar bilan bir xil */
export function totpCode(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const hmac = createHmac("sha1", base32(secret)).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}
