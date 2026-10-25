const NBSP = " ";

/**
 * E.164 dagi O'zbekiston raqamini o'qishga qulay ko'rinishga keltiradi:
 * "+998901234567" → "+998 90 123 45 67". Boshqa formatdagi raqam o'zgarishsiz qaytadi.
 */
export function formatPhone(e164: string): string {
  const match = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (!match) return e164;
  const [, operator, a, b, c] = match;
  return ["+998", operator, a, b, c].join(NBSP);
}

/** tel: havolasi uchun faqat raqamlar va boshidagi "+" qoladi */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
