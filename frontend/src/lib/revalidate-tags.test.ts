import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);
const server = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock("next/server", () => server);

import { REPEAT_AFTER_MS, revalidateTags, revalidateTagsTwice } from "./revalidate-tags";

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

describe("revalidateTagsTwice", () => {
  it("hozir va javobdan keyin yana bir marta (kechikkan renderlarga qarshi)", async () => {
    vi.useFakeTimers();
    revalidateTagsTwice(["business:ustoz"]);
    expect(cache.revalidateTag).toHaveBeenCalledTimes(1);
    const callback = server.after.mock.calls[0]?.[0] as () => Promise<void>;
    const done = callback();
    await vi.advanceTimersByTimeAsync(REPEAT_AFTER_MS);
    await done;
    expect(cache.revalidateTag).toHaveBeenCalledTimes(2);
    expect(cache.revalidatePath).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
