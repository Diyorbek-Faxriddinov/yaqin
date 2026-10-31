import { z } from "zod";

/**
 * Zod 4 sxemalarni tezlashtirish uchun `new Function` (eval) bilan kod yaratishga urinadi. CSP
 * eval'ni taqiqlaydi (ADR-0013) — urinish bloklanib, brauzer har safar buzilishni qayd etardi.
 * `jitless` — eval'siz rejim; formalarimiz kichik, tezlikka taʼsiri sezilmaydi.
 */
z.config({ jitless: true });
