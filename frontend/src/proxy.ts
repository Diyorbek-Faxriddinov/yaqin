import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // API, Next.js ichki yo'llari va fayllar (nuqtali yo'llar) bundan mustasno
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
