"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Clock, GraduationCap, MapPin } from "lucide-react";
import { PassportShare } from "@/components/passport/passport-qr";
import { Wordmark } from "@/components/wordmark";
import { pickActiveChapter } from "@/lib/passport/active-chapter";
import type { HistoryItem, RemotePreference } from "@/lib/domain";
import styles from "./live-passport.module.css";

const READING_LINE = 0.45;

const REMOTE_LABEL: Record<RemotePreference, string> = {
  remote: "Remote",
  in_person: "In person",
  either: "Remote or in person",
};

export type PassportStoryData = {
  fullName: string;
  headline: string;
  city: string;
  state: string;
  remotePreference: RemotePreference;
  about: string;
  aboutRaw: string;
  abilities: string[];
  awards: HistoryItem[];
  education: HistoryItem[];
  volunteer: HistoryItem[];
  availability: string[];
};

/**
 * The same scrollytelling look as Nick's produced demo (src/components/passport/
 * live-passport.tsx), generalized to any real employee's actual profile data --
 * built from EmployeeProfile fields rather than a hand-written content module.
 *
 * Deliberately has no pinned video/photo panel: a work photo/video (video_path)
 * is private by design (see src/components/profile/work-media-upload.tsx --
 * "Employers only see this if you're a match for their job -- it's never
 * public"), and this page is reachable by anyone with the link. Showing it
 * here would break that promise, so real Passports get the chapter/typography
 * treatment without the media column (see .storyNoMedia in the CSS module).
 */
export function PassportStory({ passport, url, className = "" }: { passport: PassportStoryData; url: string; className?: string }) {
  const [active, setActive] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  const chapters = buildChapters(passport);

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
  }, [chapters.length]);

  return (
    <div className={`${styles.page} ${className}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="ConnectAble home">
          <Wordmark />
        </Link>
        <Link href="/signup?role=employee" className={styles.headerCta}>
          Get your own Passport
        </Link>
      </header>

      <main id="main">
        <section className={styles.intro} aria-labelledby="passport-name">
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" /> Ability Passport
          </p>
          <h1 id="passport-name">{passport.fullName}</h1>
          {passport.headline && <p className={styles.headline}>{passport.headline}</p>}
          <p className={styles.meta}>
            {(passport.city || passport.state) && (
              <span>
                <MapPin size={16} aria-hidden="true" /> {[passport.city, passport.state].filter(Boolean).join(", ")}
              </span>
            )}
            <span>{REMOTE_LABEL[passport.remotePreference]}</span>
          </p>
        </section>

        <section className={`${styles.story} ${styles.storyNoMedia}`} aria-label={`${passport.fullName}'s Ability Passport`}>
          <div className={styles.chapters}>
            {chapters.map((item, index) => (
              <section
                key={item.id}
                ref={(element) => {
                  chapterRefs.current[index] = element;
                }}
                className={`${styles.chapter} ${styles.chapterCompact}`}
                aria-labelledby={`chapter-${item.id}`}
                aria-current={index === active ? "true" : undefined}
              >
                <p className={styles.sectionLabel}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.name}
                </p>
                <h2 id={`chapter-${item.id}`}>{item.title}</h2>
                {item.content}
              </section>
            ))}
          </div>
        </section>

        <section className={styles.contact} aria-labelledby="contact-title">
          <div>
            <p className={styles.sectionLabel}>Interested?</p>
            <h2 id="contact-title">Reach out through ConnectAble.</h2>
            <p className={styles.body}>
              We don&apos;t publish contact details here -- employers reach out through the platform once they&apos;re a match.
            </p>
          </div>
          <PassportShare url={url} />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>An Inclusion Revolution project.</p>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}

type StoryChapter = { id: string; name: string; title: string; content: React.ReactNode };

function buildChapters(passport: PassportStoryData): StoryChapter[] {
  const chapters: StoryChapter[] = [];

  if (passport.abilities.length > 0 || passport.about || passport.aboutRaw) {
    chapters.push({
      id: "work",
      name: "The work",
      title: passport.headline || "What I do",
      content: (
        <>
          {passport.abilities.length > 0 && (
            <ul className={styles.chips} aria-label="Abilities">
              {passport.abilities.map((ability) => (
                <li key={ability}>{ability}</li>
              ))}
            </ul>
          )}
          {passport.about && <p className={styles.body}>{passport.about}</p>}
          {passport.aboutRaw && (
            <blockquote className={styles.ownWords}>
              <p>“{passport.aboutRaw}”</p>
              <footer>{passport.fullName}, in their own words</footer>
            </blockquote>
          )}
        </>
      ),
    });
  }

  const history = [...passport.awards, ...passport.volunteer];
  if (history.length > 0) {
    chapters.push({
      id: "experience",
      name: "Experience",
      title: "What others have recognized.",
      content: (
        <ol className={styles.timeline}>
          {history.map((item, i) => (
            <li key={`${item.title}-${i}`}>
              <h3>
                {item.title}
                {item.org && <span> · {item.org}</span>}
              </h3>
              {item.year && <p className={styles.period}>{item.year}</p>}
              {item.details && <p className={styles.body}>{item.details}</p>}
            </li>
          ))}
        </ol>
      ),
    });
  }

  if (passport.education.length > 0 || passport.availability.length > 0) {
    chapters.push({
      id: "beyond",
      name: "Beyond the job",
      title: "Education and availability.",
      content: (
        <>
          {passport.education.length > 0 && (
            <>
              <h3 className={styles.subhead}>
                <GraduationCap size={18} aria-hidden="true" /> Education and training
              </h3>
              <ul className={styles.plainList}>
                {passport.education.map((item, i) => (
                  <li key={`${item.title}-${i}`}>
                    <strong>{item.title}</strong>
                    {(item.org || item.year) && <span> · {[item.org, item.year].filter(Boolean).join(", ")}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {passport.availability.length > 0 && (
            <>
              <h3 className={styles.subhead}>
                <Clock size={18} aria-hidden="true" /> Available
              </h3>
              <p className={styles.body}>{passport.availability.join(", ")}</p>
            </>
          )}
        </>
      ),
    });
  }

  return chapters;
}
