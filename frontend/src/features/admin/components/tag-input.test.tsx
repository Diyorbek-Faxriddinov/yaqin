import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/uz.json";
import { MAX_TAGS, TagInput } from "./tag-input";

function Harness({
  initial = [],
  suggestions = [],
  onSubmit = () => undefined,
}: {
  initial?: string[];
  suggestions?: string[];
  onSubmit?: () => void;
}) {
  const [tags, setTags] = useState(initial);
  return (
    <NextIntlClientProvider locale="uz" messages={messages}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <TagInput value={tags} onChange={setTags} suggestions={suggestions} />
      </form>
      <output data-testid="tags">{tags.join("|")}</output>
    </NextIntlClientProvider>
  );
}

const input = () => screen.getByLabelText("Qidiruv teglari (ixtiyoriy)");
const tags = () => screen.getByTestId("tags").textContent;

afterEach(cleanup);

describe("TagInput", () => {
  it("Enter teg qo'shadi va formani yubormaydi", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(input(), { target: { value: "stirjka" } });
    const allowed = fireEvent.keyDown(input(), { key: "Enter" });
    expect(allowed).toBe(false);
    expect(tags()).toBe("stirjka");
    expect(input()).toHaveValue("");
  });

  it("vergul bilan yozilgan yoki joylangan matn bo'linadi (Android klaviaturasi)", () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "stirjka, barber,fade" } });
    expect(tags()).toBe("stirjka|barber|fade");
  });

  it("maydondan chiqqanda yozilgan matn yo'qolmaydi", () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "barber" } });
    fireEvent.blur(input());
    expect(tags()).toBe("barber");
  });

  it("bir xil teg yozilishidan qat'i nazar takrorlanmaydi", () => {
    render(<Harness initial={["Stirjka"]} />);
    fireEvent.change(input(), { target: { value: "стиржка, STIRJKA," } });
    expect(tags()).toBe("Stirjka");
  });

  it("chegaralar: qisqa teg va ko'pi bilan 15 ta — xabar bilan", () => {
    const full = Array.from({ length: MAX_TAGS }, (_, index) => `teg${index}`);
    render(<Harness initial={full} />);
    fireEvent.change(input(), { target: { value: "ortiqcha," } });
    expect(tags()?.split("|")).toHaveLength(MAX_TAGS);
    expect(screen.getByRole("alert")).toHaveTextContent("Koʻpi bilan 15 ta teg");

    fireEvent.change(input(), { target: { value: "a," } });
    expect(screen.getByRole("alert")).toHaveTextContent("Teg 2–40 belgi boʻlsin");
  });

  it("taklif bosilsa qo'shiladi va ro'yxatdan yo'qoladi; Backspace oxirgisini o'chiradi", () => {
    render(<Harness initial={["birinchi"]} suggestions={["birinchi", "barber"]} />);
    expect(screen.queryByRole("button", { name: "birinchi" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "barber" }));
    expect(tags()).toBe("birinchi|barber");
    expect(screen.queryByRole("button", { name: "barber" })).toBeNull();

    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(tags()).toBe("birinchi");
  });
});
