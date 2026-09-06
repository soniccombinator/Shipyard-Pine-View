import { describe, expect, it } from "vitest";
import { hasRealGuide, initialGuideMode } from "./guide-modes";

/**
 * Voice (ElevenLabs) and typing (Claude) are independent services. A missing
 * key for one must never hide the other behind the scripted demo -- that is
 * exactly what took the voice guide off production on 2026-09-06.
 */
describe("hasRealGuide", () => {
  it("renders the real guide when only voice is configured", () => {
    expect(hasRealGuide({ voice: true, text: false })).toBe(true);
  });
  it("renders the real guide when only typing is configured", () => {
    expect(hasRealGuide({ voice: false, text: true })).toBe(true);
  });
  it("falls back to the demo only when neither is configured", () => {
    expect(hasRealGuide({ voice: false, text: false })).toBe(false);
  });
});

describe("initialGuideMode", () => {
  it("offers the chooser when both ways of talking work", () => {
    expect(initialGuideMode({ voice: true, text: true })).toBeNull();
  });
  it("goes straight to voice when typing is not set up", () => {
    expect(initialGuideMode({ voice: true, text: false })).toBe("voice");
  });
  it("goes straight to typing when voice is not set up", () => {
    expect(initialGuideMode({ voice: false, text: true })).toBe("text");
  });
});
