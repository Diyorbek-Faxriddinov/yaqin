import type { MetadataRoute } from "next";
import { isDemoMode } from "@/lib/env";
import { siteUrl } from "@/lib/seo";

const PRIVATE = ["/admin", "/profil", "/kirish", "/hisobot"];

export default function robots(): MetadataRoute.Robots {
  // Demo maʼlumotlar to'qib chiqarilgan — demo sayt butunlay indekslanmaydi
  if (isDemoMode) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Har ikki tilda: /admin va /ru/admin; API va qidiruv natijalari (?q=) ham
      disallow: [...PRIVATE, ...PRIVATE.map((path) => `/ru${path}`), "/api/", "/*?q="],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
