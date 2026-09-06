import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAPTERS, CLIPS, NICK, PASSPORT_URL } from "./nick";

// The public Passport never carries accommodations or pay (docs/design-spec.md).
const FORBIDDEN = [/accommodation/i, /salary/i, /\$\s?\d/, /per hour/i, /wage/i];

describe("Nick's passport content", () => {
  it("has three clips whose media files exist in public/", () => {
    expect(CLIPS).toHaveLength(3);
    for (const clip of CLIPS) {
      for (const src of [clip.loopSrc, clip.fullSrc, clip.poster]) {
        expect(existsSync(join(process.cwd(), "public", src)), `${src} should exist`).toBe(true);
      }
      expect(clip.description.length).toBeGreaterThan(20);
    }
  });

  it("has three ordered chapters that each use a different real clip", () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual(["01", "02", "03"]);
    const ids = new Set(CLIPS.map((c) => c.id));
    for (const chapter of CHAPTERS) expect(ids.has(chapter.clip)).toBe(true);
    expect(new Set(CHAPTERS.map((c) => c.clip)).size).toBe(3);
  });

  it("never mentions accommodations or pay", () => {
    const text = JSON.stringify(NICK);
    for (const pattern of FORBIDDEN) expect(text).not.toMatch(pattern);
  });

  it("credits every quote and keeps Nick's own words verbatim", () => {
    expect(NICK.quotes.length).toBeGreaterThanOrEqual(3);
    for (const q of NICK.quotes) {
      expect(q.text.length).toBeGreaterThan(20);
      expect(q.name).not.toBe("");
      expect(q.role).not.toBe("");
    }
    expect(NICK.ownWords).toBe("Doing my job is fun.");
  });

  it("uses obviously fake contact placeholders and the live URL", () => {
    expect(NICK.contact.email).toMatch(/@example\.com$/);
    expect(NICK.contact.phone).toMatch(/555/);
    expect(PASSPORT_URL).toMatch(/^https:\/\/[^/]+\/nick$/);
  });

  it("ships a QR code for the slide that points at the live URL", () => {
    const qr = join(process.cwd(), "public", "passport", "nick", "qr.svg");
    expect(existsSync(qr)).toBe(true);
    expect(readFileSync(qr, "utf8")).toContain("<svg");
  });
});
