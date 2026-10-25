import { notFound } from "next/navigation";

// [locale] ichidagi mavjud bo'lmagan yo'llar tilga mos 404 sahifasini ko'rsatadi
export default function CatchAllPage() {
  notFound();
}
