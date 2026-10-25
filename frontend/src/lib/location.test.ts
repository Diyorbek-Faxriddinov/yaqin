import { describe, expect, it } from "vitest";
import { parseLocation, serializeLocation } from "./location";

describe("joylashuv cookie", () => {
  it("~110 m aniqlikkacha yaxlitlab saqlaydi", () => {
    expect(serializeLocation({ lat: 41.311081, lng: 69.279752 })).toBe("41.311,69.28");
  });

  it("o'qiydi", () => {
    expect(parseLocation("41.311,69.28")).toEqual({ lat: 41.311, lng: 69.28 });
  });

  it.each([undefined, "", "abc", "41.3", "91,69", "41.3,69.2,1x"])(
    "noto'g'ri qiymat — null: %s",
    (value) => {
      expect(parseLocation(value)).toBeNull();
    },
  );
});
