import { describe, expect, it } from "vitest";
import type { AdminPhoto } from "@/lib/api/types";
import { draftFromPhotos, photosChanged, toPhotoRefs, type DraftPhoto } from "./photo-refs";

const photos: AdminPhoto[] = [
  { id: "a", url: "/api/v1/media/a", width: 800, height: 600, alt: "Do'kon" },
  { id: "b", url: "/api/v1/media/b", width: 800, height: 600, alt: null },
];

describe("taklif rasmlari ro'yxati", () => {
  it("joriy rasmlardan — o'zgarmagan; tartib almashsa — o'zgargan", () => {
    const draft = draftFromPhotos(photos);
    expect(photosChanged(draft, photos)).toBe(false);
    expect(photosChanged([...draft].reverse(), photos)).toBe(true);
    expect(photosChanged(draft.slice(0, 1), photos)).toBe(true);
  });

  it("API ro'yxati: mavjud rasm tavsifi saqlanadi, yangisiga tartib raqami bilan", () => {
    const upload: DraftPhoto = { key: "u", uploadId: "u", url: "/preview/u", alt: null };
    const draft = [upload, ...draftFromPhotos(photos)];
    expect(photosChanged(draft, photos)).toBe(true);
    expect(toPhotoRefs(draft, (index) => `Rasm ${index}`)).toEqual([
      { uploadId: "u", alt: "Rasm 1" },
      { photoId: "a", alt: "Do'kon" },
      { photoId: "b", alt: null },
    ]);
  });
});
