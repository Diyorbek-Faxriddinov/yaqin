import type { AdminPhoto, PhotoRef } from "@/lib/api/types";

/** Taklifdagi rasm: mavjud (`photoId`) yoki taklif uchun yuklangan yangi (`uploadId`) */
export type DraftPhoto = { key: string; url: string; alt: string | null } & (
  { photoId: string } | { uploadId: string }
);

export function draftFromPhotos(photos: AdminPhoto[]): DraftPhoto[] {
  return photos.map((photo) => ({
    key: photo.id,
    photoId: photo.id,
    url: photo.url,
    alt: photo.alt ?? null,
  }));
}

/** API uchun ro'yxat; yangi rasmning tavsifi tartib raqamidan (1 dan) */
export function toPhotoRefs(draft: DraftPhoto[], altFor: (index: number) => string): PhotoRef[] {
  return draft.map((photo, index) =>
    "photoId" in photo
      ? { photoId: photo.photoId, alt: photo.alt }
      : { uploadId: photo.uploadId, alt: altFor(index + 1) },
  );
}

/** Ro'yxat joriy rasmlardan farq qiladimi (tartib ham hisobga olinadi) */
export function photosChanged(draft: DraftPhoto[], photos: AdminPhoto[]): boolean {
  return (
    draft.length !== photos.length ||
    draft.some((photo, index) => !("photoId" in photo) || photo.photoId !== photos[index]?.id)
  );
}
