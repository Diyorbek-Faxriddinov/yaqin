import { Inter } from "next/font/google";

// subsets — faqat OLDINDAN yuklanadiganlar. Oʻzbek lotin yozuvidagi ʻ va ʼ (U+02BB–02BC) "latin"
// toʻplamida bor. Kirill va boshqa toʻplamlar @font-face unicode-range orqali sahifada shunday
// belgi uchrasagina yuklanadi — oʻzbekcha sahifalar ortiqcha shrift yuklamaydi.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
