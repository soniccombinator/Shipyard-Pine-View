import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { ConsentBanner, hidesConsentBanner } from "./consent-banner";

beforeEach(() => {
  vi.stubGlobal("React", React);
  // No choice recorded yet, so the banner would normally show.
  document.cookie = "connectable.consent=; Max-Age=0; Path=/";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("hidesConsentBanner", () => {
  it("hides on the public showcase routes and their children only", () => {
    expect(hidesConsentBanner("/nick")).toBe(true);
    expect(hidesConsentBanner("/nick/anything")).toBe(true);
    expect(hidesConsentBanner("/nickname")).toBe(false);
    expect(hidesConsentBanner("/")).toBe(false);
    expect(hidesConsentBanner("/onboarding")).toBe(false);
    expect(hidesConsentBanner(null)).toBe(false);
  });
});

describe("ConsentBanner", () => {
  it("asks on a page with forms when no choice has been made", () => {
    pathname = "/onboarding";
    render(<ConsentBanner />);
    expect(screen.getByRole("region", { name: "Save your progress on this device" })).toBeInTheDocument();
  });

  it("stays out of the way on Nick's passport, which has nothing to type", () => {
    pathname = "/nick";
    render(<ConsentBanner />);
    expect(screen.queryByRole("region", { name: "Save your progress on this device" })).toBeNull();
  });
});
