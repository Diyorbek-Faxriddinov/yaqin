import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import uz from "../../../messages/uz.json";
import { MediaGallery } from "./media-gallery";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="uz" messages={uz}>
    {children}
  </NextIntlClientProvider>
);

const image = (n: number, width = 1500, height = 1600) => ({
  url: `/api/v1/media/rasm-${n}.webp`,
  width,
  height,
  alt: `Doʻkon — ${n}-rasm`,
});

afterEach(cleanup);

describe("MediaGallery", () => {
  it("rasm bo'lmasa — joy egallovchi", () => {
    render(<MediaGallery images={[]} name="Doʻkon" placeholder={<span>ikonka</span>} />, {
      wrapper,
    });
    expect(screen.getByText("ikonka")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("rasm kesilmaydi (contain), bir nechta rasmda — kichik rasmlar va hisoblagich", () => {
    render(
      <MediaGallery images={[image(1), image(2), image(3)]} name="Doʻkon" placeholder={null} />,
      { wrapper },
    );
    const region = screen.getByRole("region", { name: "Doʻkon — rasmlar" });
    const main = screen.getByRole("img", { name: "Doʻkon — 1-rasm" });
    expect(region).toContainElement(main);
    expect(main).toHaveClass("object-contain");
    expect(screen.getAllByRole("button", { name: /-rasmni koʻrsatish$/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "1-rasmni koʻrsatish" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("bosilganda — to'liq ekranda, strelka bilan keyingisi", () => {
    render(<MediaGallery images={[image(1), image(2)]} name="Doʻkon" placeholder={null} />, {
      wrapper,
    });
    fireEvent.click(screen.getByRole("button", { name: "Rasmni kattalashtirish, 1/2" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Doʻkon1 / 2");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(dialog).toHaveTextContent("Doʻkon2 / 2");
  });

  it("bitta rasmda — kichik rasmlar va tugmalar yo'q", () => {
    render(<MediaGallery images={[image(1)]} name="Doʻkon" placeholder={null} />, { wrapper });
    expect(screen.queryByRole("button", { name: /-rasmni koʻrsatish$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keyingi rasm" })).not.toBeInTheDocument();
  });
});
