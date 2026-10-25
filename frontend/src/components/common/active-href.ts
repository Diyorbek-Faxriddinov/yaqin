/** Eng uzun mos keluvchi yo'l faol hisoblanadi: /profil/sevimlilar → "Sevimlilar", "Profil" emas */
export function findActiveHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
  );
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}
