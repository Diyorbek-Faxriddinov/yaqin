import { notFound } from "next/navigation";

// Bu segment faqat 404 ko'rsatish uchun — "instant navigation" tekshiruvidan chiqariladi,
// aks holda dev rejimida har bir noma'lum yo'lda validatsiya xatosi chiqadi
export const instant = false;

// [locale] ichidagi mavjud bo'lmagan yo'llar tilga mos 404 sahifasini ko'rsatadi
export default function CatchAllPage() {
  notFound();
}
