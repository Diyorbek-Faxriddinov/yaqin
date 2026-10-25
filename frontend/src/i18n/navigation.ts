import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Ilova ichida next/link o'rniga shu Link ishlatiladi — u joriy tilni URL'ga o'zi qo'shadi
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
