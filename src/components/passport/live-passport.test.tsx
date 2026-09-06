import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CHAPTERS, CLIPS, NICK } from "@/lib/passport/nick";
import { LivePassport } from "./live-passport";

type IOCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;
let observerCallback: IOCallback | null = null;
let play: ReturnType<typeof vi.fn>;
let pause: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // jsdom has no IntersectionObserver, matchMedia, dialog or media playback.
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IOCallback) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  HTMLMediaElement.prototype.play = play as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = pause as unknown as () => void;
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  observerCallback = null;
});

/** Pretend the chapters are laid out so that chapter `index` sits under the reading line. */
function scrollToChapter(index: number) {
  const sections = screen
    .getAllByRole("region")
    .filter((section) => section.getAttribute("aria-labelledby")?.startsWith("chapter-"));
  expect(sections).toHaveLength(CHAPTERS.length);
  sections.forEach((section, i) => {
    const top = (i - index) * 1000 - 100; // the active chapter spans -100..900; the reading line is 45% of 800 = 360
    section.getBoundingClientRect = () =>
      ({ top, bottom: top + 1000, left: 0, right: 390, width: 390, height: 1000, x: 0, y: top, toJSON() {} }) as DOMRect;
  });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  act(() => {
    observerCallback?.([], {} as IntersectionObserver);
  });
}

describe("LivePassport", () => {
  it("renders the passport: name, headline, three chapters, abilities, quotes, contact, QR", () => {
    render(<LivePassport />);
    expect(screen.getByRole("heading", { level: 1, name: NICK.fullName })).toBeInTheDocument();
    expect(screen.getByText(NICK.headline)).toBeInTheDocument();
    for (const chapter of CHAPTERS) {
      expect(screen.getByRole("heading", { level: 2, name: chapter.title })).toBeInTheDocument();
    }
    for (const ability of NICK.abilities) expect(screen.getByText(ability)).toBeInTheDocument();
    for (const quote of NICK.quotes) expect(screen.getByText(`“${quote.text}”`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: NICK.contact.email })).toHaveAttribute("href", `mailto:${NICK.contact.email}`);
    expect(screen.getByRole("img", { name: /QR code that opens/ })).toBeInTheDocument();
  });

  it("never shows accommodations or pay", () => {
    const { container } = render(<LivePassport />);
    expect(container.textContent).not.toMatch(/accommodation/i);
    expect(container.textContent).not.toMatch(/\$\s?\d/);
  });

  it("mounts all three muted loops, plays only the first, and labels the button with it", () => {
    const { container } = render(<LivePassport />);
    const loops = container.querySelectorAll("video[data-testid^='loop-']");
    expect(loops).toHaveLength(3);
    loops.forEach((video) => {
      expect(video).toHaveAttribute("loop");
      expect(video).toHaveAttribute("playsinline");
      expect((video as HTMLVideoElement).muted).toBe(true);
    });
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: `Watch the full clip: ${CLIPS[0].description}` })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Now showing" })).toHaveTextContent(CLIPS[0].title);
  });

  it("switches the pinned clip when a later chapter reaches the reading line", () => {
    render(<LivePassport />);
    scrollToChapter(1);
    const second = CLIPS.find((clip) => clip.id === CHAPTERS[1].clip)!;
    expect(screen.getByRole("button", { name: `Watch the full clip: ${second.description}` })).toBeInTheDocument();
    expect(screen.getByTestId(`loop-${second.id}`).className).toMatch(/loopActive/);
    expect(screen.getByTestId(`loop-${CLIPS[0].id}`).className).not.toMatch(/loopActive/);
    expect(pause).toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status", { name: "Now showing" })).toHaveTextContent(second.title);
  });

  it("opens the active clip full size in a dialog and restores focus on close", () => {
    const { container } = render(<LivePassport />);
    scrollToChapter(2);
    const third = CLIPS.find((clip) => clip.id === CHAPTERS[2].clip)!;
    const opener = screen.getByRole("button", { name: `Watch the full clip: ${third.description}` });
    opener.focus();
    expect(container.querySelector(`video[src="${third.fullSrc}"]`)).toBeNull();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2, name: third.title })).toBeInTheDocument();
    const player = container.querySelector(`video[src="${third.fullSrc}"]`);
    expect(player).toHaveAttribute("controls");
    expect(player?.querySelector("track")).toHaveAttribute("src", "/passport/nick/silent.vtt");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close video" }));
    expect(container.querySelector(`video[src="${third.fullSrc}"]`)).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(opener).toHaveFocus();
  });

  it("does not autoplay the loops when the reader prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<LivePassport />);
    expect(play).not.toHaveBeenCalled();
  });
});
