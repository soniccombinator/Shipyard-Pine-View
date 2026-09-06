import { describe, expect, it } from "vitest";
import { pickActiveChapter } from "./active-chapter";

const vh = 800; // default reading line at 45% = 360px from the top

describe("pickActiveChapter", () => {
  it("returns 0 when nothing has been measured", () => {
    expect(pickActiveChapter([], vh)).toBe(0);
  });

  it("picks the first chapter before any scrolling", () => {
    const boxes = [{ top: 300, bottom: 1100 }, { top: 1100, bottom: 1900 }, { top: 1900, bottom: 2700 }];
    expect(pickActiveChapter(boxes, vh)).toBe(0);
  });

  it("picks the chapter whose box contains the reading line", () => {
    const boxes = [{ top: -900, bottom: -100 }, { top: -100, bottom: 700 }, { top: 700, bottom: 1500 }];
    expect(pickActiveChapter(boxes, vh)).toBe(1);
  });

  it("switches exactly when the next chapter's top crosses the line", () => {
    const at = (scrolled: number) =>
      pickActiveChapter(
        [{ top: -500 - scrolled, bottom: 361 - scrolled }, { top: 361 - scrolled, bottom: 1200 - scrolled }],
        vh,
      );
    expect(at(0)).toBe(0); // second chapter starts at 361, line is at 360
    expect(at(2)).toBe(1); // two pixels later it starts at 359
  });

  it("falls back to the nearest chapter when the line is in a gap", () => {
    expect(pickActiveChapter([{ top: -800, bottom: 300 }, { top: 500, bottom: 1300 }], vh)).toBe(0); // 60px vs 140px
    expect(pickActiveChapter([{ top: -800, bottom: 200 }, { top: 450, bottom: 1300 }], vh)).toBe(1); // 160px vs 90px
  });

  it("keeps the last chapter active once everything has scrolled past", () => {
    const boxes = [{ top: -3000, bottom: -2200 }, { top: -2200, bottom: -1400 }, { top: -1400, bottom: -600 }];
    expect(pickActiveChapter(boxes, vh)).toBe(2);
  });

  it("honours a custom reading line", () => {
    expect(pickActiveChapter([{ top: 0, bottom: 500 }, { top: 500, bottom: 1000 }], 1000, 0.6)).toBe(1);
  });
});
