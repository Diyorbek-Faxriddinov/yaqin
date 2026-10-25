import { describe, expect, it } from "vitest";
import { distanceMeters, isValidPoint, roundCoordinate } from "./geo";

describe("distanceMeters", () => {
  it("bir nuqta — 0", () => {
    expect(distanceMeters({ lat: 41.3, lng: 69.2 }, { lat: 41.3, lng: 69.2 })).toBe(0);
  });

  it("Chorsu → Amir Temur xiyoboni ≈ 3.4 km", () => {
    const chorsu = { lat: 41.3265, lng: 69.2347 };
    const amirTemur = { lat: 41.3111, lng: 69.2797 };
    const d = distanceMeters(chorsu, amirTemur);
    expect(d).toBeGreaterThan(3300);
    expect(d).toBeLessThan(4300);
  });
});

describe("roundCoordinate", () => {
  it("3 kasrgacha yaxlitlaydi", () => {
    expect(roundCoordinate(41.311081)).toBe(41.311);
    expect(roundCoordinate(69.27975)).toBe(69.28);
  });
});

describe("isValidPoint", () => {
  it.each([
    [{ lat: 41.3, lng: 69.2 }, true],
    [{ lat: 91, lng: 69.2 }, false],
    [{ lat: Number.NaN, lng: 69.2 }, false],
    [{ lat: 41.3 }, false],
  ])("%o → %s", (point, expected) => {
    expect(isValidPoint(point)).toBe(expected);
  });
});
