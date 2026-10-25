import type { Metadata } from "next";
import Link from "next/link";
import { inter } from "./fonts";
import "./globals.css";

// Hech qaysi marshrutga mos kelmagan so'rovlar uchun (layout'siz render qilinadi).
// Bu yerda til aniqlanmaydi, shuning uchun matn asosiy tilda.
export const metadata: Metadata = {
  title: "Sahifa topilmadi — Yaqin",
};

export default function GlobalNotFound() {
  return (
    <html lang="uz" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
          <p className="text-sm font-medium text-neutral-500">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sahifa topilmadi</h1>
          <Link href="/" className="mt-8 font-medium underline underline-offset-4">
            Bosh sahifaga qaytish
          </Link>
        </main>
      </body>
    </html>
  );
}
