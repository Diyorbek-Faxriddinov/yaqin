import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((part) => {
      const [name = "", ...values] = part.split(" ");
      return [name, values];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("production: eval va WebSocket yo'q, tashqi manbalar aniq ro'yxatda", () => {
    const csp = directives(contentSecurityPolicy({ dev: false }));
    expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
    expect(csp.get("script-src")).toEqual(
      expect.arrayContaining(["https://telegram.org", "https://accounts.google.com/gsi/client"]),
    );
    expect(csp.get("connect-src")).toEqual([
      "'self'",
      "https://tiles.openfreemap.org",
      "https://accounts.google.com/gsi/",
    ]);
    expect(csp.get("frame-src")).toEqual([
      "https://oauth.telegram.org",
      "https://accounts.google.com/gsi/",
    ]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("default-src")).toEqual(["'self'"]);
  });

  it("dev: HMR uchun eval va WebSocket", () => {
    const csp = directives(contentSecurityPolicy({ dev: true }));
    expect(csp.get("script-src")).toContain("'unsafe-eval'");
    expect(csp.get("connect-src")).toEqual(expect.arrayContaining(["ws:", "wss:"]));
  });

  it("xarita provayderi o'zgarsa — CSP ham o'zgaradi", () => {
    const csp = directives(
      contentSecurityPolicy({ dev: false, mapStyleUrl: "https://maps.example.uz/style.json" }),
    );
    expect(csp.get("connect-src")).toContain("https://maps.example.uz");
    expect(csp.get("connect-src")).not.toContain("https://tiles.openfreemap.org");
  });
});

describe("securityHeaders", () => {
  it("joylashuv faqat o'z saytimizga, kamera va mikrofon yopiq", () => {
    const headers = new Map(securityHeaders({ dev: false }).map((h) => [h.key, h.value]));
    expect(headers.get("Permissions-Policy")).toContain("geolocation=(self)");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });
});
