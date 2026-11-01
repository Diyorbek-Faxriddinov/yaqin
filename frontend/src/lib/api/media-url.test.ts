import { describe, expect, it } from "vitest";
import { mediaUpstreamUrl } from "./media-url";

const API = { API_URL: "http://backend:8000/api/v1" };

describe("mediaUpstreamUrl", () => {
  it("productionda — ichki fayl serveri (Caddy), ishlab chiqishda — API_URL/media", () => {
    expect(
      mediaUpstreamUrl("businesses/a/b.webp", { ...API, MEDIA_INTERNAL_URL: "http://caddy:8081/" }),
    ).toBe("http://caddy:8081/businesses/a/b.webp");
    expect(mediaUpstreamUrl("businesses/a/b.webp", API)).toBe(
      "http://backend:8000/api/v1/media/businesses/a/b.webp",
    );
  });

  it("boshqa manzilga chiqib bo'lmaydi", () => {
    for (const path of ["../etc/passwd", "a//b.webp", "http://evil/x", "a/../../b"]) {
      expect(mediaUpstreamUrl(path, API)).toBeNull();
    }
  });

  it("manzil sozlanmagan — null", () => {
    expect(mediaUpstreamUrl("a.webp", {})).toBeNull();
  });
});
