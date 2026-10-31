// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Til prefikslari next-intl'niki — bu yerda faqat himoya qismi tekshiriladi
vi.mock("next-intl/middleware", () => ({ default: () => () => NextResponse.next() }));

import proxy from "./proxy";

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:3000"), { headers });

describe("proxy: himoyalangan bo'limlar", () => {
  it("sessiyasiz — kirish sahifasiga, qaytish manzili va til bilan", () => {
    const response = proxy(request("/ru/profil/sevimlilar?tab=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/ru/kirish?next=%2Fprofil%2Fsevimlilar%3Ftab%3D1",
    );
  });

  it("admin — o'z kirish sahifasiga", () => {
    const response = proxy(request("/admin/bizneslar"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin/kirish?next=%2Fadmin%2Fbizneslar",
    );
  });

  it("sessiya cookie'si bor — sahifa ochiladi", () => {
    const response = proxy(request("/profil", { cookie: "sessionid=abc" }));
    expect(response.headers.get("location")).toBeNull();
  });
});
