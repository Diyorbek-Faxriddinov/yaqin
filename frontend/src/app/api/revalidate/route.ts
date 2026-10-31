import { timingSafeEqual } from "node:crypto";
import { revalidateTagsRepeated } from "@/lib/revalidate-tags";

/**
 * Backend webhook'i: maʼlumot o'zgarganda (admin biznesni tahrirladi, sharh tasdiqlandi...)
 * tegishli kesh teglarini yangilaydi.
 *
 *   POST /api/revalidate
 *   Authorization: Bearer <REVALIDATE_SECRET>
 *   { "tags": ["businesses", "business:ustoz-sartaroshxonasi"] }
 *
 * REVALIDATE_SECRET o'rnatilmagan bo'lsa endpoint o'chiq (404).
 */

const TAG = /^[a-z0-9:_-]{1,200}$/;
const MAX_TAGS = 50;

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  // Vaqtga bog'liq bo'lmagan solishtirish — kalitni vaqt farqi bo'yicha taxmin qilib bo'lmasin
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ code: "not_found" }, { status: 404 });
  if (!authorized(request, secret)) return Response.json({ code: "unauthorized" }, { status: 401 });

  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown }).tags;
  } catch {
    tags = null;
  }
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    !tags.every((tag) => typeof tag === "string" && TAG.test(tag))
  ) {
    return Response.json({ code: "validation_error" }, { status: 400 });
  }

  revalidateTagsRepeated(tags as string[]);
  return Response.json({ revalidated: tags.length });
}
