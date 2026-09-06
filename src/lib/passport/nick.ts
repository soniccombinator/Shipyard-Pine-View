import type { HistoryItem } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";

/**
 * Nick's live Ability Passport. Facts and every quote come from the film
 * "Nick's Story: The Drive to Include" (public/stories/nick.mp4, captions in
 * nick.vtt) and the notes in docs/video-analysis/. Quotes are verbatim, with
 * spoken filler trimmed, and credited the way the film credits them.
 *
 * PLACEHOLDERS, made up, replace before the demo:
 *   NICK.experience[0].period       start date at Sarasota Ford
 *   NICK.experience[1].org, period  the earlier detailing job Beaver mentions
 *   NICK.education                  school and year
 *   NICK.availability               days and times
 *   NICK.contact.email, phone       obviously fake until real ones are supplied
 */

export const PASSPORT_URL = `${SITE_URL}/nick`;

export type ClipId = "detailing" | "drill" | "vacuuming";

export type Clip = {
  id: ClipId;
  title: string;
  /** What the viewer sees. Used for the media button's label and the modal note. */
  description: string;
  loopSrc: string;
  fullSrc: string;
  poster: string;
  seconds: number;
};

export const CLIPS: Clip[] = [
  {
    id: "detailing",
    title: "Detailing the cab",
    description: "Nick wiping down the console and dashboard of a truck, spray bottle in hand, seen from two angles",
    loopSrc: "/passport/nick/detailing.mp4",
    fullSrc: "/passport/nick/detailing-full.mp4",
    poster: "/passport/nick/detailing.jpg",
    seconds: 3,
  },
  {
    id: "drill",
    title: "Mounting a plate",
    description: "Nick leaning into a tailgate with a power driver, fitting a license plate, seen from two angles",
    loopSrc: "/passport/nick/drill.mp4",
    fullSrc: "/passport/nick/drill-full.mp4",
    poster: "/passport/nick/drill.jpg",
    seconds: 2,
  },
  {
    id: "vacuuming",
    title: "Vacuuming the seats",
    description: "Nick reaching into the back seat of a truck with a vacuum, in slow motion, beside a view of the finished cab",
    loopSrc: "/passport/nick/vacuuming.mp4",
    fullSrc: "/passport/nick/vacuuming-full.mp4",
    poster: "/passport/nick/vacuuming.jpg",
    seconds: 3,
  },
];

/** The full film, already on the homepage; here it is the emotional centre of the page. */
export type Film = {
  title: string;
  src: string;
  captions: string;
  poster: string;
  posterAlt: string;
  duration: string;
};

export const FILM: Film = {
  title: "Nick’s story: The Drive to Include",
  src: "/stories/nick.mp4",
  captions: "/stories/nick.vtt",
  poster: "/stories/nick-team.jpg",
  posterAlt: "Nick and a colleague sharing a smile at Sarasota Ford",
  duration: "3:08",
};

export type Chapter = {
  id: "work" | "people" | "words";
  number: string;
  name: string;
  title: string;
  clip: ClipId;
};

/** Chapters follow the film's own arc: the work, then the people, then Nick. */
export const CHAPTERS: Chapter[] = [
  { id: "work", number: "01", name: "The work", title: "Care in every detail.", clip: "detailing" },
  { id: "people", number: "02", name: "The people", title: "Someone to share the day with.", clip: "drill" },
  { id: "words", number: "03", name: "In his own words", title: "More than a job.", clip: "vacuuming" },
];

export type Quote = { text: string; name: string; role: string };
export type Photo = { src: string; alt: string; caption: string };
export type Experience = { title: string; org: string; period: string; details: string[] };

export type LivePassportContent = {
  fullName: string;
  headline: string;
  /** Nick introducing himself, verbatim from the film's opening. */
  ownIntro: string;
  /** Nick's closing words in the film. */
  ownWords: string;
  city: string;
  state: string;
  remote: "In person";
  summary: string;
  abilities: string[];
  /** How the job came about, in Beaver Shriver's words. */
  referral: Quote;
  /** The team, in the film's order. */
  quotes: Quote[];
  /** Nick's mother. */
  family: Quote;
  teamPhoto: Photo;
  experience: Experience[];
  education: HistoryItem[];
  interests: string[];
  availability: string[];
  contact: { email: string; phone: string };
};

export const NICK: LivePassportContent = {
  fullName: "Nick Lapinski", // spelling confirmed by the team 2026-09-06; the film's badge reading in docs/video-analysis is wrong
  headline: "Service porter at Sarasota Ford. I prep cars and get them ready to sell.",
  ownIntro: "My job at Sarasota Ford is a service porter where I prep cars and get them ready to sell.",
  ownWords: "Doing my job is fun. A big thank you to Beaver for getting my job at Sarasota Ford.",
  city: "Sarasota",
  state: "FL",
  remote: "In person",
  summary:
    "Nick preps and details vehicles at Sarasota Ford: removing stickers and transport film, mounting plates, refueling, checking loaner cars in and out, and keeping the logs straight. He is consistent, picks up new workflows quickly, and his teammates count on him.",
  abilities: [
    "Vehicle detailing",
    "Interior cleaning",
    "Decal and sticker removal",
    "Mounting license plates",
    "Refueling vehicles",
    "Loaner check-in and keys",
    "Vehicle logs and paperwork",
    "Driving and parking vehicles",
  ],
  referral: {
    text: "I learned that Nick was the best detail guy they ever had, so I thought, well, I know exactly who I’m going to call.",
    name: "Beaver Shriver",
    role: "Founder, Inclusion Revolution",
  },
  quotes: [
    {
      text: "Nick has been doing a wonderful job. He’s extremely consistent. The team has become very close. They’re in the car a lot together, chatting. They go to lunch together as well with Nick.",
      name: "Veronica Izzo",
      role: "Loaner Department Manager, Sarasota Ford",
    },
    {
      text: "I first met Nick a couple days into him being on our team. We drive, listen to music, he talks about what he likes. I can’t wait to have another person like him on the team.",
      name: "Jordan Cardenas",
      role: "Service Porter, Sarasota Ford",
    },
    {
      text: "It’s actually impressive how fast he learned how to do all these things with these loaner vehicles. I would even say that he actually learned faster than I did in the past.",
      name: "Sebastian Mattos",
      role: "Loaner department, Sarasota Ford",
    },
    {
      text: "I used to do detailing a lot, but Nick is by far the best in my opinion. I think every dealership needs somebody like Nick.",
      name: "Kevin",
      role: "Sarasota Ford",
    },
  ],
  family: {
    text: "We were so, so, so thankful for Nick to have an opportunity to do something that he loved. This is probably one of the first jobs where Nick is so supported by all of the employees and by his supervisor that he doesn’t even have a job coach at this point.",
    name: "Sara Brooks",
    role: "Nick’s mom",
  },
  teamPhoto: {
    src: "/stories/nick-team.jpg",
    alt: "Nick and a colleague sharing a smile at Sarasota Ford",
    caption: "Sarasota Ford, from the film",
  },
  experience: [
    {
      title: "Service Porter",
      org: "Sarasota Ford",
      period: "2024 – present", // PLACEHOLDER
      details: [
        "Preps new and loaner vehicles: detailing, decal removal, plates, fuel.",
        "Checks loaner vehicles in and out and keeps the intake logs.",
        "Supported day to day by his teammates and supervisor.",
      ],
    },
    {
      title: "Detailer",
      org: "Gulf Coast Auto Spa", // PLACEHOLDER
      period: "2022 – 2024", // PLACEHOLDER
      details: ["Detailed vehicles to a standard his manager called “the best detail guy they ever had.”"],
    },
  ],
  education: [
    { title: "High school diploma", org: "Sarasota County Schools", year: "2019" }, // PLACEHOLDER
  ],
  interests: ["Music on the drive", "Driving", "Getting to know the team"],
  availability: ["Weekday mornings", "Weekday afternoons"], // PLACEHOLDER
  contact: { email: "nick@example.com", phone: "(941) 555-0142" }, // PLACEHOLDER
};
