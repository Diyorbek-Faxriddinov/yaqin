import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);
const server = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock("next/server", () => server);

import { REPEAT_AFTER_MS, revalidateTags, revalidateTagsRepeated } from "./revalidate-tags";

beforeEach(() => {
  cache.revalidateTag.mockClear();
  cache.revalidatePath.mockClear();
});

describe("revalidateTags", () => {
  it("har bir tegni darhol eskirtiradi", () => {
    revalidateTags(["businesses", "settings"]);
    expect(cache.revalidateTag.mock.calls).toEqual([
      ["businesses", { expire: 0 }],
      ["settings", { expire: 0 }],
    ]);
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it("biznes va kategoriya teglarida marshrut ham — har biri bir marta", () => {
    revalidateTags(["businesses", "business:ustoz", "business:tandir", "category:sartarosh"]);
    expect(cache.revalidatePath.mock.calls).toEqual([
      ["/[locale]/biznes/[slug]", "layout"],
      ["/[locale]/kategoriya/[slug]", "layout"],
    ]);
  });
});

describe("revalidateTagsRepeated", () => {
  it("hozir va javobdan keyin belgilangan vaqtlarda takror (kechikkan renderlarga qarshi)", async () => {
    vi.useFakeTimers();
    revalidateTagsRepeated(["business:ustoz"]);
    expect(cache.revalidateTag).toHaveBeenCalledTimes(1);
    const callback = server.after.mock.calls[0]?.[0] as () => Promise<void>;
    const done = callback();
    let elapsed = 0;
    for (const [index, at] of REPEAT_AFTER_MS.entries()) {
      await vi.advanceTimersByTimeAsync(at - elapsed - 1);
      expect(cache.revalidateTag).toHaveBeenCalledTimes(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(cache.revalidateTag).toHaveBeenCalledTimes(index + 2);
      elapsed = at;
    }
    await done;
    expect(cache.revalidatePath).toHaveBeenCalledTimes(REPEAT_AFTER_MS.length + 1);
    vi.useRealTimers();
  });
});
