"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUpRight, Clock, GraduationCap, Mail, MapPin, Music, Phone, Play, Quote, X } from "lucide-react";
import { PassportShare } from "@/components/passport/passport-qr";
import { Wordmark } from "@/components/wordmark";
import { pickActiveChapter } from "@/lib/passport/active-chapter";
import { CHAPTERS, CLIPS, FILM, NICK, PASSPORT_URL, type Clip } from "@/lib/passport/nick";
import styles from "./live-passport.module.css";

/** Fraction of the viewport height where the "reading line" sits (just below the pinned clip on phones). */
const READING_LINE = 0.45;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** What the dialog is showing: one of the short work clips, or the full film. */
type Playing = { kind: "clip"; clip: Clip } | { kind: "film" };

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
 * Nick's live Ability Passport. His story first: his own introduction, the
 * full film on request, then three chapters that follow the film's arc (the
 * work, the people, his own words) with a work clip pinned beside each. The
 * resume facts come after, at a glance.
 */
export function LivePassport({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<Playing | null>(null);
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
        const started = video.play();
        if (started) started.catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeClipIndex, reducedMotion]);

  // The modal is a native <dialog>; lock body scroll while it is open.
  useEffect(() => {
    if (!playing) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [playing]);

  function openModal(what: Playing, button: HTMLButtonElement) {
    trigger.current = button;
    setPlaying(what);
  }

  function closeModal() {
    dialog.current?.close();
    setPlaying(null);
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
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.liveDot} aria-hidden="true" /> Ability Passport · Live
            </p>
            <h1 id="passport-name">{NICK.fullName}</h1>
            <blockquote className={styles.ownIntro}>
              <p>“{NICK.ownIntro}”</p>
            </blockquote>
            <p className={styles.meta}>
              <span>
                <MapPin size={16} aria-hidden="true" /> {NICK.city}, {NICK.state}
              </span>
              <span>{NICK.remote}</span>
            </p>
          </div>

          <button
            type="button"
            className={styles.filmButton}
            aria-label={`Watch Nick’s story, ${FILM.duration}`}
            onClick={(event) => openModal({ kind: "film" }, event.currentTarget)}
          >
            <Image src={FILM.poster} alt="" fill sizes="(max-width: 900px) 100vw, 44vw" className={styles.filmPoster} />
            <span className={styles.filmShade} aria-hidden="true" />
            <span className={styles.filmMeta}>
              <span className={styles.playCircle}>
                <Play size={20} fill="currentColor" aria-hidden="true" />
              </span>
              <span>
                <strong>Watch Nick’s story</strong>
                <small>The Drive to Include · {FILM.duration}</small>
              </span>
            </span>
          </button>

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
              onClick={(event) => openModal({ kind: "clip", clip: activeClip }, event.currentTarget)}
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
                {item.id === "people" && <PeopleChapter />}
                {item.id === "words" && <WordsChapter />}
              </section>
            ))}
          </div>
        </section>

        <section className={styles.glance} aria-labelledby="glance-title">
          <p className={styles.sectionLabel}>The facts</p>
          <h2 id="glance-title">At a glance</h2>
          <div className={styles.glanceGrid}>
            <div>
              <h3 className={styles.subhead}>Experience</h3>
              <ol className={styles.timeline}>
                {NICK.experience.map((job) => (
                  <li key={`${job.title}-${job.org}`}>
                    <h4>
                      {job.title} <span>· {job.org}</span>
                    </h4>
                    <p className={styles.period}>{job.period}</p>
                    <ul>
                      {job.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
            <div>
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
            </div>
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
          An Inclusion Revolution project. <Link href="/">More stories on the ConnectAble homepage</Link>.
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
          setPlaying(null);
          trigger.current?.focus();
        }}
      >
        {playing && (
          <div className={styles.clipInner}>
            <div className={styles.clipHeader}>
              <div>
                <p className={styles.sectionLabel}>{playing.kind === "film" ? "Stories from our community" : "Nick at work"}</p>
                <h2 id="clip-title">{playing.kind === "film" ? FILM.title : playing.clip.title}</h2>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close video">
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            {playing.kind === "film" ? (
              <video key="film" className={styles.clipPlayer} src={FILM.src} poster={FILM.poster} controls autoPlay playsInline preload="metadata">
                <track kind="captions" src={FILM.captions} srcLang="en" label="English (auto-generated)" />
                Your browser does not support video. <a href={FILM.src}>Open the video</a>.
              </video>
            ) : (
              <video
                key={playing.clip.id}
                className={styles.clipPlayer}
                src={playing.clip.fullSrc}
                poster={playing.clip.poster}
                controls
                autoPlay
                playsInline
                loop
              >
                <track kind="captions" src="/passport/nick/silent.vtt" srcLang="en" label="English" />
                Your browser does not support video. <a href={playing.clip.fullSrc}>Open the clip</a>.
              </video>
            )}
            <p className={styles.clipNote}>
              {playing.kind === "film"
                ? "English captions are auto-generated and may contain errors. Use the player’s caption control to turn them on."
                : `${playing.clip.description}. This clip has no dialogue.`}
            </p>
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
      <blockquote className={styles.voice}>
        <p>“{NICK.referral.text}”</p>
        <footer>
          {NICK.referral.name} <span>· {NICK.referral.role}</span>
        </footer>
      </blockquote>
    </>
  );
}

function PeopleChapter() {
  return (
    <>
      <figure className={styles.teamPhoto}>
        <div>
          <Image src={NICK.teamPhoto.src} alt={NICK.teamPhoto.alt} fill sizes="(max-width: 900px) 100vw, 50vw" />
        </div>
        <figcaption>{NICK.teamPhoto.caption}</figcaption>
      </figure>
      <h3 className={styles.subhead}>
        <Quote size={18} aria-hidden="true" /> The team, in their words
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

function WordsChapter() {
  return (
    <>
      <blockquote className={styles.ownWords}>
        <p>“{NICK.ownWords}”</p>
        <footer>
          Nick, in the film <cite>The Drive to Include</cite>
        </footer>
      </blockquote>
      <blockquote className={`${styles.voice} ${styles.familyVoice}`}>
        <p>“{NICK.family.text}”</p>
        <footer>
          {NICK.family.name} <span>· {NICK.family.role}</span>
        </footer>
      </blockquote>
    </>
  );
}
