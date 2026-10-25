import { getResponse } from "msw";
import { handlers } from "./handlers";

/**
 * So'rovni tarmoqsiz, MSW handler'lari orqali javoblaydi (ADR-0011).
 * Handler topilmasa — 404, haqiqiy tarmoqqa hech qachon chiqmaydi.
 */
export async function mockFetch(request: Request): Promise<Response> {
  const response = await getResponse(handlers, request);
  return (
    response ??
    Response.json(
      { code: "not_found", message: `Demo API: handler yoʻq — ${request.method} ${request.url}` },
      { status: 404 },
    )
  );
}
