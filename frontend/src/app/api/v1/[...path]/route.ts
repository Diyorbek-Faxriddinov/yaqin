import { createBackendFetch, DEFAULT_API_TIMEOUT_MS } from "@/lib/api/backend-fetch";
import { mediaUpstreamUrl } from "@/lib/api/media-url";
import { isDemoMode } from "@/lib/env";
import { revalidateTagsRepeated } from "@/lib/revalidate-tags";

const REVALIDATE_HEADER = "x-demo-revalidate";

const MEDIA_PREFIX = "/api/v1/media/";

/**
 * Brauzerdan keladigan API so'rovlari (/api/v1/*).
 * - Demo rejim: mock handler'lar javob beradi (ADR-0011). Admin o'zgarishlaridan keyin mock
 *   `x-demo-revalidate` sarlavhasida keshning qaysi teglari eskirganini aytadi — shu yerda
 *   yangilanadi (productionda buni backend /api/revalidate orqali qiladi).
 * - Production: bu yo'l reverse proxy (Caddy/Nginx) orqali backendga yo'naltiriladi va
 *   Next.js'ga yetib kelmaydi. Istisno — rasmlar: `next/image` optimizatori ularni proksisiz,
 *   Next.js'ning o'zidan so'raydi, shuning uchun fayl serveridan olib beriladi (media-url.ts).
 *   Boshqasi — 404.
 */
async function handle(request: Request): Promise<Response> {
  if (!isDemoMode) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname.startsWith(MEDIA_PREFIX)) {
      return proxyMedia(pathname.slice(MEDIA_PREFIX.length));
    }
    return Response.json({ code: "not_found", message: "Not found" }, { status: 404 });
  }
  const { mockFetch } = await import("@/mocks/fetch");
  const response = await mockFetch(request);

  const tags = response.headers.get(REVALIDATE_HEADER);
  if (!tags) return response;

  // Admin o'zgarishni darhol ko'rishi kerak — eskirgan kontent berilmaydi
  revalidateTagsRepeated(tags.split(",").filter(Boolean));
  const headers = new Headers(response.headers);
  headers.delete(REVALIDATE_HEADER);
  return new Response(response.body, { status: response.status, headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };

/** Rasm faylini fayl serveridan (productionda Caddy, ishlab chiqishda Django) oqim sifatida qaytaradi */
async function proxyMedia(path: string): Promise<Response> {
  const url = mediaUpstreamUrl(path);
  if (!url) return Response.json({ code: "not_found", message: "Not found" }, { status: 404 });
  // Server so'rovlari bilan bir xil vaqt chegarasi: backend javob bermasa, sahifadagi rasmlar
  // (va `load` hodisasi) osilib qolmasin
  const backendFetch = createBackendFetch(
    Number(process.env.API_TIMEOUT_MS) || DEFAULT_API_TIMEOUT_MS,
  );
  let upstream: Response;
  try {
    upstream = await backendFetch(new Request(url, { cache: "no-store" }));
  } catch {
    return Response.json(
      { code: "backend_unavailable", message: "Backend javob bermadi" },
      { status: 503 },
    );
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ code: "not_found", message: "Not found" }, { status: 404 });
  }
  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    // Fayl nomi rasm ID'si — mazmuni o'zgarmaydi
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  return new Response(upstream.body, { status: 200, headers });
}
