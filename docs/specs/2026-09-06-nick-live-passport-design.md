# Nick's Live Ability Passport — Design

**Date:** 2026-09-06
**Owner:** Istiqlal
**Status:** approved in conversation, pending written review

## 1. Goal

A public scrollytelling page that is Nick's Ability Passport: three short looping
clips of Nick at work, pinned on screen while his resume scrolls past in three
chapters. Tapping a clip opens it full size in a modal.

**Primary audience and device:** people in the demo audience who scan a QR code
on a slide. They arrive on a phone, on cellular. The phone layout is the primary
design; desktop is the secondary one.

## 2. Content rules

- Source of truth for facts is the film *Nick's Story: The Drive to Include*
  (`public/stories/nick.mp4`, captions in `public/stories/nick.vtt`) and the
  editorial notes in `docs/video-analysis/`. Facts the film establishes: name
  (Nick Lapinski, spelling confirmed by the team on 2026-09-06; the badge reading
  in `docs/video-analysis/` is wrong), age 25, service porter at Sarasota Ford,
  tasks shown on camera (detailing, decal removal, mounting plates, refueling,
  loaner check-in and keys, vehicle logs, driving and parking, vacuuming), what
  colleagues and his manager said, and his own words ("Doing my job is fun").
- Quotes are verbatim from the film and credited with the speaker's name and role
  as shown in the film's lower thirds.
- Anything the film does not establish (dates, earlier employer, education,
  availability, contact details) is a **placeholder**: plausible made-up text,
  marked in code with `// PLACEHOLDER` and listed once at the top of the content
  file. Contact details are obviously fake (`example.com` email, 555 number).
- The public Passport never shows accommodations or pay (existing rule from
  `docs/design-spec.md`).
- Language: "abilities" for what he does well; no deficit language; no charity
  framing. Nick is presented as a skilled colleague, not a beneficiary.

## 3. Route and files

| Path | Purpose |
|---|---|
| `src/app/nick/page.tsx` | Server component. Metadata (title, description, Open Graph poster). Renders the client component. Route is `/nick`. |
| `src/components/passport/live-passport.tsx` | Client component: header, intro, sticky media panel, chapters, contact, share, footer, modal. |
| `src/components/passport/live-passport.module.css` | Styles. Editorial look shared with the homepage: paper `#f8f7f5`, ink `#292d29`, orange `#f67e5a`, mint `#7fcda9`, Montserrat headings via `--font-editorial`. No blue. |
| `src/lib/passport/nick.ts` | Typed content object plus clip and chapter definitions. |
| `src/lib/passport/active-chapter.ts` | Pure function that picks the active chapter from measured chapter boxes. |
| `src/lib/passport/active-chapter.test.ts` | Unit tests for the picker. |
| `src/components/passport/live-passport.test.tsx` | Component tests (vitest + testing-library, jsdom). |
| `public/passport/nick/{detailing,drill,vacuuming}.mp4` | 720p muted loops, H.264, ~0.5 MB each. |
| `public/passport/nick/{detailing,drill,vacuuming}-full.mp4` | 1080p versions for the modal, loaded only when a modal opens. |
| `public/passport/nick/{detailing,drill,vacuuming}.jpg` | Posters, 1280 px wide. |
| `public/passport/nick/qr.svg` | QR code for `https://www.connectable.work/nick`, for the presentation slide. |
| `scripts/encode-clips.sh` | The ffmpeg commands that produce the media above from the raw 4K exports. |
| `.gitignore` | Add `/Clips of Nick Working*/` (raw 4K, never committed). |

Optional, one line: a text link "See Nick's live Ability Passport" in the Nick
section of `src/components/story-home.tsx`.

## 4. Page structure

**Header:** ConnectAble wordmark linking home; "Get your own Passport" button to
`/signup`. Same pattern as `src/app/p/[slug]/page.tsx`.

**Intro (not sticky), revised 2026-09-06 after review ("the page had no
emotion"):** eyebrow "Ability Passport · Live"; name; Nick's own introduction
from the film as a quotation ("My job at Sarasota Ford is a service porter where
I prep cars and get them ready to sell."); Sarasota, FL · In person; then a
large "Watch Nick's story · 3:08" button on the still of Nick and a colleague
smiling, which opens the full film (`/stories/nick.mp4`, captions
`/stories/nick.vtt`) in the modal. The film is fetched only when tapped. One
line inviting the reader to scroll.

**Scrolly section.**

Phone (primary): the media panel is `position: sticky; top: 0` and about 40svh
tall, full width. The resume scrolls under it. The chapter label and a "Watch
clip" badge sit on the panel. Tap anywhere on the panel to open the modal.

Desktop (min-width 900px): two columns. Media panel sticky in the left column,
vertically centered in the viewport; chapters in the right column.

Three chapters, each tied to one clip:

| # | Name | Clip | Content |
|---|---|---|---|
| 01 | The work | Detailing | "Care in every detail." Abilities as chips (vehicle detailing, interior cleaning, decal and sticker removal, mounting license plates, refueling, loaner check-in and keys, vehicle logs, driving and parking). Short professional summary. Beaver Shriver, verbatim: "I learned that Nick was the best detail guy they ever had, so I thought, well, I know exactly who I'm going to call." |
| 02 | The people | Using drill | "Someone to share the day with." The team photo from the film, then the team in the film's order, verbatim and credited: Veronica Izzo (in the car together, lunch together), Jordan Cardenas (music, "can't wait to have another person like him on the team"), Sebastian Mattos ("learned faster than I did"), Kevin ("every dealership needs somebody like Nick"). |
| 03 | In his own words | Vacuuming | "More than a job." Nick, large: "Doing my job is fun. A big thank you to Beaver for getting my job at Sarasota Ford." Then his mother, Sara Brooks, on the job he loves and no longer needing a job coach. |

The chapters follow the film's own arc (work, people, Nick) so the story carries
the page. The resume facts come after in an **"At a glance"** block: experience
(Service Porter, Sarasota Ford, start date PLACEHOLDER; earlier detailing role,
employer and dates PLACEHOLDER), education (PLACEHOLDER), interests from the film,
availability (PLACEHOLDER).

**Contact:** name, email and phone (PLACEHOLDER, obviously fake), city.
**Share:** reuse `PassportShare` from `src/components/passport/passport-qr.tsx`
with the URL `https://www.connectable.work/nick` (QR, copy link, print).
**Footer:** compact: "An Inclusion Revolution project", link to the homepage
where the full 3:08 film lives, privacy and terms links.

## 5. Interaction

**Chapter switching.** Each chapter section is observed with an
IntersectionObserver using thresholds at 0, 0.25, 0.5, 0.75, 1. On every
callback the component measures each chapter's `getBoundingClientRect()` and
calls `pickActiveChapter(boxes, viewportHeight)`, which returns the index of the
chapter whose box contains the line at 45% of the viewport height (below the
sticky band on phones), or, if none does, the chapter nearest to that line.
The first chapter is active before any scrolling. No scroll listeners.

**Playback policy.** All three loop `<video>` elements are mounted in the
panel, absolutely stacked. Attributes: `muted`, `loop`, `playsInline`,
`autoPlay` only on the active one, `poster`, `aria-hidden` on the videos (the
panel button carries the label). The active video plays; the others pause and
fade to opacity 0 over 350 ms. Preload: active clip `auto`, the next chapter's
clip `metadata`, the rest `none`. If `video.play()` rejects (low-power mode,
data saver) the poster stays visible and nothing errors.

**Modal.** A native `<dialog>` (the homepage pattern). Contents: eyebrow
"Nick at work", clip title, close button, `<video controls autoPlay playsInline>`
of the 1080p file, one line "This clip has no dialogue." Opening: remember the
trigger, `showModal()`, lock body scroll. Closing: Escape, the close button, or
clicking the backdrop; focus returns to the trigger. Only the open modal's video
element is mounted, so the 1080p file downloads on demand.

**Reduced motion.** `prefers-reduced-motion: reduce`: loops do not autoplay,
posters show with a play badge, cross-fades are instant, the modal still works.

## 6. Media pipeline

Source: three 4K (3840x2160) 24 fps H.264 exports, each a split-screen of two
camera angles. Detailing 2.58 s, drill 2.25 s, vacuuming 80.75 s of which the
first 79.5 s are black and only the final ~1.25 s have picture (export error).

`scripts/encode-clips.sh` (run from the repo root, source folder as argument):

```sh
# loop, 720p, silent
ffmpeg -y -i "$SRC/Clip of Nick Detailing.mp4" -an -vf "scale=1280:-2" \
  -c:v libx264 -profile:v high -preset slow -crf 23 -pix_fmt yuv420p \
  -movflags +faststart public/passport/nick/detailing.mp4
# modal, 1080p, silent
ffmpeg -y -i "$SRC/Clip of Nick Detailing.mp4" -an -vf "scale=1920:-2" \
  -c:v libx264 -profile:v high -preset slow -crf 20 -pix_fmt yuv420p \
  -movflags +faststart public/passport/nick/detailing-full.mp4
# poster
ffmpeg -y -ss 1 -i "$SRC/Clip of Nick Detailing.mp4" -frames:v 1 \
  -vf "scale=1280:-2" -q:v 4 public/passport/nick/detailing.jpg
```

Same for the drill clip. The vacuuming clip is trimmed to its last 1.25 s and
slowed to half speed with motion interpolation so it becomes a ~2.5 s
slow-motion loop that matches the others:

```sh
-vf "trim=start=79.5,setpts=2*(PTS-STARTPTS),scale=1280:-2,minterpolate=fps=24:mi_mode=mci"
```

Audio is dropped everywhere; the sources carry ~1.4 kbps of silence. When a
re-exported vacuuming clip arrives, drop it in the source folder and re-run the
script; the page needs no change.

Budget: three loops ~1.5 MB total on first load, posters ~0.3 MB, 1080p files
only on demand.

## 7. Data model

```ts
export type ClipId = "detailing" | "drill" | "vacuuming";
export type Clip = {
  id: ClipId;
  title: string;
  description: string; // what the viewer sees; used for the aria-label
  loopSrc: string;
  fullSrc: string;
  poster: string;
  seconds: number;
};
export type Chapter = { number: string; name: string; title: string; clip: ClipId };
export type Quote = { text: string; name: string; role: string };
export type Experience = { title: string; org: string; period: string; details: string[] };
export type LivePassport = {
  fullName: string;
  headline: string;
  city: string;
  state: string;
  remote: "In person";
  summary: string;
  ownWords: string;
  abilities: string[];
  experience: Experience[];
  quotes: Quote[];
  education: HistoryItem[];
  interests: string[];
  availability: string[];
  contact: { email: string; phone: string };
  url: string;
};
```

`HistoryItem` comes from `src/lib/domain.ts`.

## 8. Accessibility

- Media panel is a `<button>` with `aria-label` "Watch the full clip: {description}".
- Chapters are `<section aria-labelledby>` with visible numbered headings; the
  active chapter is also announced through an `aria-live="polite"` region with
  the clip title.
- Dialog labelled by its title; focus trapped natively; focus restored on close.
- Contrast at least 4.5:1 on all text; 44 px minimum targets; visible focus
  rings; the skip link from the root layout still works (`id="main"` present).
- Colour never carries meaning alone.

## 9. Testing and verification

- `active-chapter.test.ts`: first chapter before scrolling; the chapter under
  the 45% line wins; nearest chapter when the line is in a gap; last chapter at
  the end of the page.
- `live-passport.test.tsx` (mock `IntersectionObserver` and
  `HTMLDialogElement.prototype.showModal/close`): renders name, headline, three
  chapters, all abilities and quotes; clicking the media button opens the dialog
  with the active clip's title and mounts the 1080p source; close returns focus
  to the button; no accommodations or pay text is present.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass.
- Playwright (already in `node_modules`) screenshots at 390x844 (phone) and
  1440x900 after scrolling to each chapter, to confirm the pinned panel, the clip
  swap, and the modal. Screenshots go to the scratch directory, not the repo.
- Deploy with `vercel deploy --prod --yes` and scan `public/passport/nick/qr.svg`
  with a phone as the final check.

## 10. Out of scope

Editing the database-backed `/p/[slug]` pages; captions (the clips have no
speech); the full film (already on the homepage); any employer-side view.
