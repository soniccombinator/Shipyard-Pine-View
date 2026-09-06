import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Wordmark } from "./wordmark";

beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Wordmark", () => {
  it("reads as one image named ConnectAble.work to assistive tech", () => {
    render(<Wordmark />);
    const logo = screen.getByRole("img", { name: "ConnectAble.work" });
    // The visual pieces are decoration; only the accessible name should be announced.
    expect(logo.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
    expect(logo.textContent).toBe("ConnectAble.work");
  });

  it("splits the name into the two brand-coloured parts from the logo sheet", () => {
    const { container } = render(<Wordmark />);
    const parts = container.querySelectorAll("[data-part]");
    expect(Array.from(parts, (p) => p.getAttribute("data-part"))).toEqual(["connect", "able", "work"]);
    expect(parts[0].textContent).toBe("Connect");
    expect(parts[1].textContent).toBe("Able");
    expect(parts[2].textContent).toBe(".work");
  });

  it("lets callers size and position it through className", () => {
    render(<Wordmark className="hero" />);
    expect(screen.getByRole("img", { name: "ConnectAble.work" })).toHaveClass("hero");
  });
});
