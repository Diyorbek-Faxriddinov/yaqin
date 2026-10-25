import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Kirish talab qilinadigan bo'limlar (tilsiz yo'l) va ularning sessiya cookie'si
const PROTECTED: Array<{ prefix: string; cookie: string; login: string }> = [
  { prefix: "/profil", cookie: "sessionid", login: "/kirish" },
  // Admin sessiyasi mijoz sessiyasidan alohida (ADR-0012)
  { prefix: "/admin", cookie: "adminsessionid", login: "/admin/kirish" },
];

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

  const area = PROTECTED.find(
    ({ prefix, login }) => (path === prefix || path.startsWith(`${prefix}/`)) && path !== login,
  );
  if (area && !request.cookies.has(area.cookie)) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}${area.login}`;
    url.search = `?next=${encodeURIComponent(`${path}${search}`)}`;
    return NextResponse.redirect(url);
  }

  return intl(request);
}

export const config = {
  // API, Next.js ichki yo'llari va fayllar (nuqtali yo'llar) bundan mustasno
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
