import { describe, expect, it } from "vitest";
import { linkPlatform } from "./item-link";

describe("mahsulot havolasi", () => {
  it("ruxsat etilgan platformalar", () => {
    expect(linkPlatform("https://www.instagram.com/reel/abc/")).toBe("instagram");
    expect(linkPlatform("https://t.me/kanal/12")).toBe("telegram");
    expect(linkPlatform("https://youtu.be/x1")).toBe("youtube");
    expect(linkPlatform("https://vm.tiktok.com/Z/")).toBe("tiktok");
    expect(linkPlatform("https://fb.watch/abc")).toBe("facebook");
  });

  it("xavfli yoki begona havolalar rad etiladi (backend bilan bir xil)", () => {
    for (const url of [
      "",
      "http://instagram.com/p/a",
      "https://evil.example.com/pay",
      "https://instagram.com.evil.uz/p/a",
      "https://user:pass@instagram.com/p/a",
      "https://instagram.com:8443/p/a",
      "javascript:alert(1)",
      "https://instagram.com/p/a b",
      `https://instagram.com/p/${"a".repeat(500)}`,
    ]) {
      expect(linkPlatform(url), url).toBeNull();
    }
  });
});
