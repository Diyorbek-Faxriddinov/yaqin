import { describe, expect, it } from "vitest";
import ru from "../messages/ru.json";
import uz from "../messages/uz.json";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("tarjimalar", () => {
  it("uz va ru fayllarida kalitlar bir xil", () => {
    expect(keys(ru).sort()).toEqual(keys(uz).sort());
  });

  it("bo'sh tarjima yo'q", () => {
    const empty = (obj: unknown): string[] =>
      keys(obj).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj);
        return typeof value === "string" && value.trim() === "";
      });
    expect(empty(uz)).toEqual([]);
    expect(empty(ru)).toEqual([]);
  });
});
