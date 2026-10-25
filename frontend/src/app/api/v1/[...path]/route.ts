import { revalidateTag } from "next/cache";
import { isDemoMode } from "@/lib/env";

const REVALIDATE_HEADER = "x-demo-revalidate";

/**
 * Brauzerdan keladigan API so'rovlari (/api/v1/*).
 * - Demo rejim: mock handler'lar javob beradi (ADR-0011). Admin o'zgarishlaridan keyin mock
 *   `x-demo-revalidate` sarlavhasida keshning qaysi teglari eskirganini aytadi — shu yerda
 *   yangilanadi (productionda buni backend /api/revalidate orqali qiladi).
 * - Production: bu yo'l reverse proxy (Caddy/Nginx) orqali backendga yo'naltiriladi va
 *   Next.js'ga yetib kelmaydi; yetib kelsa — 404.
 */
async function handle(request: Request): Promise<Response> {
  if (!isDemoMode) {
    return Response.json({ code: "not_found", message: "Not found" }, { status: 404 });
  }
  const { mockFetch } = await import("@/mocks/fetch");
  const response = await mockFetch(request);

  const tags = response.headers.get(REVALIDATE_HEADER);
  if (!tags) return response;

  for (const tag of tags.split(",").filter(Boolean)) {
    // Admin o'zgarishni darhol ko'rishi kerak — eskirgan kontent berilmaydi
    revalidateTag(tag, { expire: 0 });
  }
  const headers = new Headers(response.headers);
  headers.delete(REVALIDATE_HEADER);
  return new Response(response.body, { status: response.status, headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
