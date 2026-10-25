import { Inter } from "next/font/google";

// latin-ext — oʻ, gʻ va ʼ belgilari uchun, cyrillic — rus va oʻzbek kirill yozuvi uchun
export const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});
