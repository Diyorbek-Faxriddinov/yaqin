import { requireUser } from "../server";

/**
 * Kirish talab qilinadigan sahifa qismi. Sessiyani serverda tekshiradi va kirilmagan bo'lsa
 * /kirish?next=... ga yo'naltiradi. Cookie o'qilgani uchun sahifada Suspense ichida bo'lishi kerak.
 */
export async function AuthGate({ path, children }: { path: string; children: React.ReactNode }) {
  await requireUser(path);
  return children;
}
