import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Kirish talab qilinadigan bo'limlar (tilsiz yo'l)
const PROTECTED = ["/profil"];
const SESSION_COOKIE = "sessionid";

/**
 * 1) Himoyalangan sahifaga sessiya cookie'siz kirilsa — /kirish?next=... ga yo'naltiradi.
 *    Bu faqat qulaylik (sahifa "miltillamasligi" uchun); sessiyaning haqiqiyligini server
 *    komponenti tekshiradi (requireUser).
 * 2) Qolganini next-intl hal qiladi (til prefikslari).
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const localePrefix = /^\/ru(?=\/|$)/.test(pathname) ? "/ru" : "";
  const path = pathname.slice(localePrefix.length) || "/";

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/kirish`;
    url.search = `?next=${encodeURIComponent(`${path}${search}`)}`;
    return NextResponse.redirect(url);
  }

  return intl(request);
}

export const config = {
  // API, Next.js ichki yo'llari va fayllar (nuqtali yo'llar) bundan mustasno
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
