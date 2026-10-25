"use client";

import { fitWithin } from "./fit";

export type CompressedImage = { blob: Blob; width: number; height: number };

/**
 * Brauzerda rasmni kichraytiradi va qayta kodlaydi (WebP, bo'lmasa JPEG).
 * - Mobil internetda yuklash tezlashadi (5–10 MB → ~200–400 KB).
 * - Qayta kodlash EXIF maʼlumotlarini, jumladan GPS koordinatalarini olib tashlaydi.
 *   Backend baribir o'zi ham qayta kodlaydi (ishonchli himoya serverda).
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.82,
): Promise<CompressedImage> {
  // EXIF bo'yicha burilishni hisobga oladi (telefonda olingan rasmlar yonboshlab qolmasin)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas mavjud emas");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Ba'zi brauzerlar WebP kodlay olmaydi — PNG qaytaradi; shunda JPEG
  let blob = await encode("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new Error("Rasmni kodlab bo'lmadi");
  return { blob, width, height };
}
