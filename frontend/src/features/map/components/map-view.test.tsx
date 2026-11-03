import { act, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Activity, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// MapLibre'ning soxta nusxasi: haqiqiy kutubxona kabi uslub yuklanmaguncha setFilter xato beradi
const maps: FakeMap[] = [];

class FakeMap {
  styleLoaded = false;
  handlers = new Map<string, Array<() => void>>();
  setFilter = vi.fn(() => {
    if (!this.styleLoaded) throw new Error("Style is not done loading.");
  });
  constructor() {
    maps.push(this);
  }
  on(event: string, layerOrHandler: unknown, handler?: () => void) {
    const callback = (handler ?? layerOrHandler) as () => void;
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
  }
  fire(event: string) {
    if (event === "load") this.styleLoaded = true;
    for (const handler of this.handlers.get(event) ?? []) handler();
  }
  addControl() {}
  addSource() {}
  addLayer() {}
  getSource() {
    return { setData: vi.fn() };
  }
  getCanvas() {
    return { style: {} };
  }
  getZoom() {
    return 11;
  }
  easeTo() {}
  isStyleLoaded() {
    return this.styleLoaded;
  }
  remove() {}
}

vi.mock("maplibre-gl", () => ({
  Map: FakeMap,
  AttributionControl: class {},
  NavigationControl: class {},
  GeolocateControl: class {},
  getVersion: () => "test",
  setWorkerUrl: () => {},
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const { MapView } = await import("./map-view");

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider
    locale="uz"
    messages={{ MapPage: { loading: "Yuklanmoqda", error: "Xato", controls: {} } }}
    onError={() => {}}
  >
    {children}
  </NextIntlClientProvider>
);

const points = [{ slug: "sandal", name: "Sandal", lat: 41.3, lng: 69.2 }];

afterEach(() => {
  maps.length = 0;
});

function Page({ visible }: { visible: boolean }) {
  // Next.js 16 orqaga qaytishda sahifani shunday tiklaydi: holat saqlanadi, effektlar qayta ishlaydi
  return (
    <Activity mode={visible ? "visible" : "hidden"}>
      <MapView points={points} selectedSlug="sandal" label="Xarita" />
    </Activity>
  );
}

describe("MapView", () => {
  it("keshdan tiklanganda yangi xarita yuklanmaguncha unga filtr qo'ymaydi", () => {
    const { rerender } = render(<Page visible />, { wrapper });
    act(() => maps[0]?.fire("load"));
    expect(maps[0]?.setFilter).toHaveBeenCalled();

    // Boshqa sahifaga o'tish va orqaga qaytish: eski xarita o'chadi, yangisi yaratiladi
    rerender(<Page visible={false} />);
    expect(() => rerender(<Page visible />)).not.toThrow();
    const fresh = maps[1];
    expect(fresh).toBeDefined();
    expect(fresh?.setFilter).not.toHaveBeenCalled();

    // Yangi xarita yuklangach — tanlangan nuqta yana ajratiladi
    act(() => fresh?.fire("load"));
    expect(fresh?.setFilter).toHaveBeenCalled();
  });
});
