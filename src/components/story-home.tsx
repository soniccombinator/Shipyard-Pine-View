"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Menu, MessageCircle, Play, Plus, X } from "lucide-react";
import styles from "./story-home.module.css";
import { FAQ } from "./story-home-faq";
import { Wordmark } from "./wordmark";

const films = {
  nick: { title: "Nick’s story: The Drive to Include", file: "nick", portrait: false },
  adam: { title: "A conversation with Adam", file: "adam", portrait: true },
  cards: { title: "A moment at the card table", file: "cards", portrait: true },
};
type FilmId = keyof typeof films;

const chapters = [
  {
    name: "The work", title: "Care in every detail.",
    text: "Keys to collect. Cars to prepare. A job done with care. At Sarasota Ford, Nick’s abilities are part of the everyday work.",
    image: "/stories/nick-detailing.jpg", alt: "Nick carefully vacuuming the inside of a vehicle", time: 45, locator: "00:45",
  },
  {
    name: "The people", title: "Someone to share the day with.",
    text: "Music in the car. Lunch together. Getting to know what each other likes. Listen to Nick’s colleagues describe the moments that make a team.",
    image: "/stories/nick-team.jpg", alt: "Nick and his colleague sharing a smile at Sarasota Ford", time: 102, locator: "01:42",
  },
  {
    name: "His own words", title: "“Doing my job is fun.”",
    text: "After the work and the words from his colleagues, Nick tells us what it means to him. Sometimes, a few words say enough.",
    image: "/stories/nick-driving.jpg", alt: "Nick at the wheel of a vehicle in the film", time: 158, locator: "02:38",
  },
];

export function StoryHome({ className = "" }: { className?: string }) {
  const [activeFilm, setActiveFilm] = useState<FilmId | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const startTime = useRef(0);
  const film = activeFilm ? films[activeFilm] : null;
  const chapter = chapters[activeChapter];

  useEffect(() => {
    if (!activeFilm) return;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [activeFilm]);

  useEffect(() => {
    const elements = page.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!elements || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.visible);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach((element) => {
      element.classList.add(styles.reveal);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuTrigger.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function openFilm(id: FilmId, button: HTMLButtonElement, time = 0) {
    trigger.current = button;
    startTime.current = time;
    setActiveFilm(id);
  }

  function closeFilm() {
    dialog.current?.close();
    setActiveFilm(null);
    trigger.current?.focus();
  }

  return (
    <div className={`${styles.site} ${className}`} ref={page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="ConnectAble.work home"><Wordmark /></Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <a href="#stories">Our stories</a><a href="#how-it-works">Your Ability Passport</a><a href="#our-purpose">Our purpose</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.login}>Log in</Link>
          <Link href="/signup" className={styles.navCta}>Get started <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <button ref={menuTrigger} className={styles.menuToggle} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className={styles.mobileNavigation}>
          <a href="#stories" onClick={() => setMenuOpen(false)}>Our stories <ArrowUpRight size={18} /></a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>Your Ability Passport <ArrowUpRight size={18} /></a><a href="#our-purpose" onClick={() => setMenuOpen(false)}>Our purpose <ArrowUpRight size={18} /></a><Link href="/login" onClick={() => setMenuOpen(false)}>Log in <ArrowUpRight size={18} /></Link>
        </nav>}
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <Image src="/stories/nick-team.jpg" alt="Nick and a colleague sharing a moment at Sarasota Ford" fill priority sizes="100vw" className={styles.heroImage} />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}><span /> Every ability. A place to belong.</p>
            <h1 id="hero-title" aria-label="ConnectAble.work"><Wordmark className={styles.heroWordmark} /></h1>
            <p className={styles.heroPromise}>A job is a beginning.<br />Belonging is what comes next.</p>
            <p className={styles.heroDescription}>Real people. Meaningful work.<br />And the connections that change an ordinary day.</p>
            <button className={styles.watchButton} onClick={(event) => openFilm("nick", event.currentTarget)} aria-label="Meet Nick, watch his story, 3 minutes"><span className={styles.playCircle}><Play size={18} fill="currentColor" aria-hidden="true" /></span><span>Meet Nick <small>Watch his story · 3:08</small></span><ArrowUpRight size={21} className={styles.watchArrow} aria-hidden="true" /></button>
          </div>
          <div className={styles.heroCredit}><span className={styles.liveDot} /> NICK’S STORY<span>Sarasota Ford · Florida</span></div>
          <a href="#stories" className={styles.heroScroll}>There’s a person behind every possibility <ArrowDown size={18} aria-hidden="true" /></a>
        </section>
        <div className={styles.chapterBar}><span>An Inclusion Revolution project</span><a href="#stories"><span>01</span> The stories</a><a href="#how-it-works"><span>02</span> Your next chapter</a><a href="#get-started"><span>03</span> A place for you <ArrowDown size={14} aria-hidden="true" /></a></div>

        <section id="stories" className={styles.storySection} aria-labelledby="stories-title">
          <div className={styles.sectionIntro} data-reveal><p className={styles.sectionLabel}><span>01</span> Start with a story</p><div><h2 id="stories-title">More than a job.<br /><span>A place in each other’s lives.</span></h2><p>A routine. A paycheck. Someone to have lunch with.<br className={styles.desktopBreak} /> The little things are the big things. Just ask Nick.</p></div></div>
          <div className={styles.nickStory} data-reveal>
            <div className={styles.chapterPhoto}><Image key={chapter.image} src={chapter.image} alt={chapter.alt} fill sizes="(max-width: 800px) 100vw, 58vw" /><div className={styles.photoCaption}><span>NICK AT SARASOTA FORD</span><span>Inclusion Revolution</span></div></div>
            <div className={styles.chapterCopy}>
              <p className={styles.sectionLabel}>The drive to include</p>
              <div className={styles.chapterTabs} role="tablist" aria-label="Chapters of Nick’s story">
                {chapters.map((item, index) => <button key={item.name} id={`chapter-tab-${index}`} type="button" role="tab" aria-selected={activeChapter === index} aria-controls="nick-chapter-panel" tabIndex={activeChapter === index ? 0 : -1} onClick={() => setActiveChapter(index)} onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight") next = (index + 1) % chapters.length;
                  else if (event.key === "ArrowLeft") next = (index + chapters.length - 1) % chapters.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = chapters.length - 1;
                  else return;
                  event.preventDefault(); setActiveChapter(next); document.getElementById(`chapter-tab-${next}`)?.focus();
                }}><span>0{index + 1}</span>{item.name}</button>)}
              </div>
              <div id="nick-chapter-panel" role="tabpanel" aria-labelledby={`chapter-tab-${activeChapter}`} className={styles.chapterPanel}>
                <div key={chapter.name} className={styles.chapterText}><h3>{chapter.title}</h3><p>{chapter.text}</p></div>
                <button className={styles.textButton} onClick={(event) => openFilm("nick", event.currentTarget, chapter.time)}><Play size={15} fill="currentColor" aria-hidden="true" /> Watch this moment <span>{chapter.locator}</span><ArrowUpRight size={18} aria-hidden="true" /></button>{" "}
                <Link href="/nick" className={styles.textButton}>See Nick’s live Ability Passport <ArrowUpRight size={18} aria-hidden="true" /></Link>
              </div><span className={styles.storyByline}>One person. A whole new chapter.</span>
            </div>
          </div>
        </section>

        <section className={styles.smallStories} aria-labelledby="small-stories-title">
          <div className={styles.storiesHeading} data-reveal><div><p className={styles.sectionLabel}>In their own words. In their own world.</p><h2 id="small-stories-title">Everyone has<br />something to share.</h2></div><p>What you enjoy. What makes you laugh.<br />What gets your full attention.<br />There’s a whole person beyond the profile.</p></div>
          <div className={styles.portraitStories}>
            <article data-reveal><button className={`${styles.portraitButton} ${styles.adamPhoto}`} aria-label="Watch a conversation with Adam, 30 seconds" onClick={(event) => openFilm("adam", event.currentTarget)}><Image src="/stories/adam.jpg" alt="Adam sharing a conversation about his work" fill sizes="(max-width: 650px) 100vw, 46vw" /><span className={styles.imagePlay}><Play size={22} fill="currentColor" aria-hidden="true" /></span><span className={styles.filmTag}>MEET ADAM <span>0:30</span></span></button><div className={styles.storyCaption}><span>THE EVERYDAY PERKS</span><ArrowUpRight size={20} aria-hidden="true" /></div><h3>Good people.<br />And 25% off cheesecake.</h3><p>Adam talks about his work at The Cheesecake Factory, earning his own money, and the details that make him smile.</p></article>
            <article data-reveal><button className={`${styles.portraitButton} ${styles.cardsPhoto}`} aria-label="Watch a moment at the card table, 11 seconds" onClick={(event) => openFilm("cards", event.currentTarget)}><Image src="/stories/cards.jpg" alt="A person taking a close look at trading cards and protective sleeves" fill sizes="(max-width: 650px) 100vw, 46vw" /><span className={styles.imagePlay}><Play size={22} fill="currentColor" aria-hidden="true" /></span><span className={styles.filmTag}>A MOMENT AT THE CARD TABLE <span>0:11</span></span></button><div className={styles.storyCaption}><span>THE THINGS WE LOVE</span><ArrowUpRight size={20} aria-hidden="true" /></div><h3>A little interest.<br />A whole world of possibility.</h3><p>A quiet moment with a collection of cards. Getting to know someone starts with making room for what matters to them.</p></article>
          </div>
        </section>

        <section id="how-it-works" className={styles.passportSection} aria-labelledby="passport-title">
          <div className={styles.passportCopy} data-reveal><p className={styles.sectionLabel}><span>02</span> Now, your next chapter</p><h2 id="passport-title">Your story.<br />Your strengths.<br /><span>Your Ability Passport.</span></h2><p>There’s more to you than a résumé. Bring your abilities, experience, and the things that help you do your best work into one shareable profile.</p><Link href="/signup?role=employee" className={styles.darkButton}>Create my Ability Passport <ArrowUpRight size={20} aria-hidden="true" /></Link><span className={styles.passportHint}><MessageCircle size={16} aria-hidden="true" /> Talk or type. One question at a time.</span></div>
          <div className={styles.passportDetail} data-reveal><div className={styles.passportSheet}><div className={styles.passportSheetTop}><Wordmark className={styles.sheetWordmark} /><span>ABILITY<br />PASSPORT</span></div><h3>A little more about you.</h3><p>A place for what makes you, you.</p>{[
            ["Your abilities", "The things you’re good at"], ["Your experience", "Work, learning, and proud moments"], ["Your accommodations", "What helps you do your best work"], ["Your own words", "The story only you can tell"],
          ].map(([label, text]) => <div className={styles.passportField} key={label}><Check size={18} aria-hidden="true" /><div><strong>{label}</strong><span>{text}</span></div></div>)}<div className={styles.passportSheetFooter}>Made to share. Made to grow with you.<ArrowUpRight size={20} aria-hidden="true" /></div></div><p className={styles.guideNote}>Your Passport Guide helps you find the words.<br />You decide if they sound right.</p></div>
        </section>

        <section id="our-purpose" className={styles.purpose} aria-labelledby="purpose-title">
          <div className={styles.purposeTop} data-reveal><p className={styles.sectionLabel}>Rooted in real connection</p><div><h2 id="purpose-title">Inclusion is something<br /><span>we build together.</span></h2><p>ConnectAble is an Inclusion Revolution project, connecting people with intellectual and developmental disabilities to meaningful work in Sarasota and Manatee counties.</p><Link href="/about" className={styles.textButton}>Get to know our purpose <ArrowUpRight size={19} aria-hidden="true" /></Link></div></div>
          <div className={styles.communityPhotos} data-reveal>
            <figure><div><Image src="/stories/community-flowers.jpg" alt="Three Inclusion Revolution community members holding colorful flowers" fill sizes="(max-width: 650px) 90vw, 38vw" /></div><figcaption>Room to grow.</figcaption></figure>
            <figure><div><Image src="/stories/community-coffee.jpg" alt="Two people smiling together while working at a coffee counter" fill sizes="(max-width: 650px) 44vw, 28vw" /></div><figcaption>People to connect with.</figcaption></figure>
            <figure><div><Image src="/stories/community-team.jpg" alt="Four colleagues in aprons gathered in a kitchen" fill sizes="(max-width: 650px) 44vw, 28vw" /></div><figcaption>A place on the team.</figcaption></figure>
          </div>
          <div className={styles.purposeFoot}><p>Inclusion. Jobs. Dignity.</p><span>From the Inclusion Revolution community<br />Sarasota–Manatee, Florida</span></div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title" data-reveal><div><p className={styles.sectionLabel}>A few helpful answers</p><h2 id="faq-title">A new beginning<br />can start with a question.</h2></div><div>{FAQ.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>

        <section id="get-started" className={styles.finalCta} aria-labelledby="start-title"><div data-reveal><p className={styles.sectionLabel}><span>03</span> There’s a place for you here</p><h2 id="start-title">The next story<br />could be <span>yours.</span></h2></div><div className={styles.roleLinks} data-reveal><Link href="/signup?role=employee"><span><small>FOR JOB SEEKERS</small>I’m ready for my next step</span><ArrowUpRight aria-hidden="true" /></Link><Link href="/signup?role=employer"><span><small>FOR EMPLOYERS</small>I want to build an inclusive team</span><ArrowUpRight aria-hidden="true" /></Link><Link href="/signup?role=mentor"><span><small>FOR MENTORS</small>I’m here to help someone grow</span><ArrowUpRight aria-hidden="true" /></Link></div></section>
      </main>

      <footer className={styles.footer}>
        <div><Link href="/" className={styles.logoLink} aria-label="ConnectAble.work home"><Wordmark /></Link><p>Every ability. Every possibility.<br />An Inclusion Revolution project.</p></div>
        <address className={styles.footerContact} aria-label="Company contact information">
          <span className={styles.sectionLabel}>Get in touch</span>
          <a href="tel:+19412394045">+1 941-239-4045</a>
          <a href="mailto:info@connectable.work">info@connectable.work</a>
        </address>
        <nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#main" aria-label="Back to top"><ArrowRight size={19} className={styles.backToTop} /></a></nav>
      </footer>

      <dialog ref={dialog} className={styles.filmDialog} onCancel={(event) => { event.preventDefault(); closeFilm(); }} onClose={() => { setActiveFilm(null); trigger.current?.focus(); }} aria-labelledby="film-title">
        {film && <div className={styles.filmInner}><div className={styles.filmHeader}><div><p className={styles.sectionLabel}>Stories from our community</p><h2 id="film-title">{film.title}</h2></div><button onClick={closeFilm} aria-label="Close video"><X size={24} /></button></div><video key={film.file} className={film.portrait ? styles.portraitPlayer : styles.landscapePlayer} src={`/stories/${film.file}.mp4`} onLoadedMetadata={(event) => { if (startTime.current) event.currentTarget.currentTime = startTime.current; }} controls autoPlay playsInline preload="metadata"><track kind="captions" src={`/stories/${film.file}.vtt`} srcLang="en" label="English (auto-generated)" />Your browser does not support video. <a href={`/stories/${film.file}.mp4`}>Open the video</a>.</video><p className={styles.captionNote}>English captions are auto-generated and may contain errors. Use the player’s caption control to turn them on.</p></div>}
      </dialog>
    </div>
  );
}
