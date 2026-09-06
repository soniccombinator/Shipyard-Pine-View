"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUpRight, Clock, GraduationCap, Mail, MapPin, Music, Phone, Play, Quote, X } from "lucide-react";
import { PassportShare } from "@/components/passport/passport-qr";
import { Wordmark } from "@/components/wordmark";
import { pickActiveChapter } from "@/lib/passport/active-chapter";
import { CHAPTERS, CLIPS, NICK, PASSPORT_URL, type Clip } from "@/lib/passport/nick";
import styles from "./live-passport.module.css";

/** Fraction of the viewport height where the "reading line" sits (just below the pinned clip on phones). */
const READING_LINE = 0.45;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** True when the reader has asked for reduced motion; false during server rendering. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(REDUCED_MOTION);
      media.addEventListener?.("change", onChange);
      return () => media.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Nick's live Ability Passport: three looping clips pinned on screen while the
 * resume scrolls past in three chapters; each clip opens full size in a dialog.
 */
export function LivePassport({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [openClip, setOpenClip] = useState<Clip | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const chapter = CHAPTERS[active];
  const activeClipIndex = Math.max(0, CLIPS.findIndex((clip) => clip.id === chapter.clip));
  const activeClip = CLIPS[activeClipIndex];

  // Which chapter is under the reading line? Re-measured whenever a chapter's
  // visibility changes or the window resizes. No scroll listener.
  useEffect(() => {
    const sections = chapterRefs.current.filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0 || !("IntersectionObserver" in window)) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const boxes = sections.map((section) => {
        const rect = section.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
      setActive(pickActiveChapter(boxes, window.innerHeight, READING_LINE));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const observer = new IntersectionObserver(schedule, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Play only the active loop, pause the rest. Reduced motion never autoplays.
  // A rejected play() (data saver, low-power mode) simply leaves the poster showing.
  useEffect(() => {
    const allowMotion = !reducedMotion && !window.matchMedia(REDUCED_MOTION).matches;
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeClipIndex && allowMotion) {
        const playing = video.play();
        if (playing) playing.catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeClipIndex, reducedMotion]);

  // The modal is a native <dialog>; lock body scroll while it is open.
  useEffect(() => {
    if (!openClip) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openClip]);

  function openModal(clip: Clip, button: HTMLButtonElement) {
    trigger.current = button;
    setOpenClip(clip);
  }

  function closeModal() {
    dialog.current?.close();
    setOpenClip(null);
    trigger.current?.focus();
  }

  const phoneDigits = NICK.contact.phone.replace(/\D/g, "");

  return (
    <div className={`${styles.page} ${className}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="ConnectAble home">
          <Wordmark />
        </Link>
        <Link href="/signup?role=employee" className={styles.headerCta}>
          Get your own Passport <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <main id="main">
        <section className={styles.intro} aria-labelledby="passport-name">
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" /> Ability Passport · Live
          </p>
          <h1 id="passport-name">{NICK.fullName}</h1>
          <p className={styles.headline}>{NICK.headline}</p>
          <p className={styles.meta}>
            <span>
              <MapPin size={16} aria-hidden="true" /> {NICK.city}, {NICK.state}
            </span>
            <span>{NICK.remote}</span>
          </p>
          <p className={styles.scrollHint}>
            Scroll to see Nick at work <ArrowDown size={16} aria-hidden="true" />
          </p>
        </section>

        <section className={styles.story} aria-label="Nick at work">
          <div className={styles.mediaPanel}>
            <button
              type="button"
              className={styles.mediaButton}
              aria-label={`Watch the full clip: ${activeClip.description}`}
              onClick={(event) => openModal(activeClip, event.currentTarget)}
            >
              {CLIPS.map((clip, index) => (
                <video
                  key={clip.id}
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  className={index === activeClipIndex ? `${styles.loop} ${styles.loopActive}` : styles.loop}
                  src={clip.loopSrc}
                  poster={clip.poster}
                  preload={index === activeClipIndex ? "auto" : index === activeClipIndex + 1 ? "metadata" : "none"}
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  tabIndex={-1}
                  data-testid={`loop-${clip.id}`}
                />
              ))}
              <span className={styles.mediaLabel}>
                <span>{chapter.number}</span>
                {activeClip.title}
              </span>
              <span className={styles.playBadge}>
                <Play size={16} fill="currentColor" aria-hidden="true" /> Watch clip
              </span>
            </button>
          </div>

          <div className={styles.chapters}>
            {CHAPTERS.map((item, index) => (
              <section
                key={item.id}
                ref={(element) => {
                  chapterRefs.current[index] = element;
                }}
                className={styles.chapter}
                aria-labelledby={`chapter-${item.id}`}
                aria-current={index === active ? "true" : undefined}
              >
                <p className={styles.sectionLabel}>
                  <span>{item.number}</span>
                  {item.name}
                </p>
                <h2 id={`chapter-${item.id}`}>{item.title}</h2>
                {item.id === "work" && <WorkChapter />}
                {item.id === "experience" && <ExperienceChapter />}
                {item.id === "beyond" && <BeyondChapter />}
              </section>
            ))}
          </div>
        </section>

        <section className={styles.contact} aria-labelledby="contact-title">
          <div>
            <p className={styles.sectionLabel}>Get in touch</p>
            <h2 id="contact-title">Talk to Nick.</h2>
            <ul className={styles.contactList}>
              <li>
                <Mail size={18} aria-hidden="true" /> <a href={`mailto:${NICK.contact.email}`}>{NICK.contact.email}</a>
              </li>
              <li>
                <Phone size={18} aria-hidden="true" /> <a href={`tel:+1${phoneDigits}`}>{NICK.contact.phone}</a>
              </li>
              <li>
                <MapPin size={18} aria-hidden="true" /> {NICK.city}, {NICK.state}
              </li>
            </ul>
          </div>
          <PassportShare url={PASSPORT_URL} />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          An Inclusion Revolution project. <Link href="/">Watch Nick’s full story on the ConnectAble homepage</Link>.
        </p>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>

      <p role="status" aria-live="polite" aria-label="Now showing" className={styles.srOnly}>
        {activeClip.title}
      </p>

      <dialog
        ref={dialog}
        className={styles.clipDialog}
        aria-labelledby="clip-title"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onClose={() => {
          setOpenClip(null);
          trigger.current?.focus();
        }}
      >
        {openClip && (
          <div className={styles.clipInner}>
            <div className={styles.clipHeader}>
              <div>
                <p className={styles.sectionLabel}>Nick at work</p>
                <h2 id="clip-title">{openClip.title}</h2>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close video">
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <video
              key={openClip.id}
              className={styles.clipPlayer}
              src={openClip.fullSrc}
              poster={openClip.poster}
              controls
              autoPlay
              playsInline
              loop
            >
              <track kind="captions" src="/passport/nick/silent.vtt" srcLang="en" label="English" />
              Your browser does not support video. <a href={openClip.fullSrc}>Open the clip</a>.
            </video>
            <p className={styles.clipNote}>{openClip.description}. This clip has no dialogue.</p>
          </div>
        )}
      </dialog>
    </div>
  );
}

function WorkChapter() {
  return (
    <>
      <ul className={styles.chips} aria-label="Abilities">
        {NICK.abilities.map((ability) => (
          <li key={ability}>{ability}</li>
        ))}
      </ul>
      <p className={styles.body}>{NICK.summary}</p>
      <blockquote className={styles.ownWords}>
        <p>“{NICK.ownWords}”</p>
        <footer>
          Nick, in the film <cite>The Drive to Include</cite>
        </footer>
      </blockquote>
    </>
  );
}

function ExperienceChapter() {
  return (
    <>
      <ol className={styles.timeline}>
        {NICK.experience.map((job) => (
          <li key={`${job.title}-${job.org}`}>
            <h3>
              {job.title} <span>· {job.org}</span>
            </h3>
            <p className={styles.period}>{job.period}</p>
            <ul>
              {job.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <h3 className={styles.subhead}>
        <Quote size={18} aria-hidden="true" /> What colleagues say
      </h3>
      <ul className={styles.quotes}>
        {NICK.quotes.map((quote) => (
          <li key={quote.name}>
            <blockquote>
              <p>“{quote.text}”</p>
              <footer>
                {quote.name} <span>· {quote.role}</span>
              </footer>
            </blockquote>
          </li>
        ))}
      </ul>
    </>
  );
}

function BeyondChapter() {
  return (
    <>
      <h3 className={styles.subhead}>
        <GraduationCap size={18} aria-hidden="true" /> Education and training
      </h3>
      <ul className={styles.plainList}>
        {NICK.education.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            {(item.org || item.year) && <span> · {[item.org, item.year].filter(Boolean).join(", ")}</span>}
          </li>
        ))}
      </ul>
      <h3 className={styles.subhead}>
        <Music size={18} aria-hidden="true" /> Off the clock
      </h3>
      <ul className={styles.chips} aria-label="Interests">
        {NICK.interests.map((interest) => (
          <li key={interest}>{interest}</li>
        ))}
      </ul>
      <h3 className={styles.subhead}>
        <Clock size={18} aria-hidden="true" /> Available
      </h3>
      <p className={styles.body}>{NICK.availability.join(", ")}</p>
    </>
  );
}
