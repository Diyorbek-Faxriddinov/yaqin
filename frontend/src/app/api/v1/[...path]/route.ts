import { isDemoMode } from "@/lib/env";

/**
 * Brauzerdan keladigan API so'rovlari (/api/v1/*).
 * - Demo rejim: mock handler'lar javob beradi (ADR-0011).
 * - Production: bu yo'l reverse proxy (Caddy/Nginx) orqali backendga yo'naltiriladi va
 *   Next.js'ga yetib kelmaydi; yetib kelsa — 404.
 */
async function handle(request: Request): Promise<Response> {
  if (!isDemoMode) {
    return Response.json({ code: "not_found", message: "Not found" }, { status: 404 });
  }
  const { mockFetch } = await import("@/mocks/fetch");
  return mockFetch(request);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
