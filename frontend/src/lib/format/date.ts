const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

/** Toshkent vaqtidagi kun, oy (1–12) va yil */
function tashkentParts(iso: string): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { day: get("day"), month: get("month"), year: get("year") };
}

/**
 * Sana: "12-oktabr, 2026" / "12 октября 2026 г." (Toshkent vaqti).
 * O'zbekcha oy nomlari qo'lda: brauzerlarning ICU maʼlumotlarida `uz` ko'pincha to'liq emas
 * ("2026 M10 12" chiqadi). Ruscha — Intl orqali.
 */
export function formatDate(iso: string, locale: string): string {
  if (locale.startsWith("uz")) {
    const { day, month, year } = tashkentParts(iso);
    return `${day}-${UZ_MONTHS[month - 1] ?? ""}, ${year}`;
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(new Date(iso));
}

const UZ_MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

/** Kalendar kuni (YYYY-MM-DD, vaqt zonasisiz) qisqa ko'rinishda: "12-okt" / "12 окт." */
export function formatShortDay(day: string, locale: string): string {
  const [, month = "1", date = "1"] = day.split("-");
  if (locale.startsWith("uz")) return `${Number(date)}-${UZ_MONTHS_SHORT[Number(month) - 1] ?? ""}`;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
