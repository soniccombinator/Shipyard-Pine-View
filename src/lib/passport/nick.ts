import type { HistoryItem } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";

/**
 * Nick's live Ability Passport. Facts come from the film "Nick's Story: The
 * Drive to Include" (public/stories/nick.mp4, captions in nick.vtt) and the
 * notes in docs/video-analysis/. Quotes are verbatim and credited the way the
 * film credits them.
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

export type Chapter = {
  id: "work" | "experience" | "beyond";
  number: string;
  name: string;
  title: string;
  clip: ClipId;
};

export const CHAPTERS: Chapter[] = [
  { id: "work", number: "01", name: "The work", title: "Cars ready to sell, down to the last detail.", clip: "detailing" },
  { id: "experience", number: "02", name: "Experience", title: "Learned fast. Trusted with the fleet.", clip: "drill" },
  { id: "beyond", number: "03", name: "Beyond the job", title: "Music in the car. Lunch with the team.", clip: "vacuuming" },
];

export type Quote = { text: string; name: string; role: string };
export type Experience = { title: string; org: string; period: string; details: string[] };

export type LivePassportContent = {
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
};

export const NICK: LivePassportContent = {
  fullName: "Nick Lapinski", // spelling confirmed by the team 2026-09-06; the film's badge reading in docs/video-analysis is wrong
  headline: "Service porter at Sarasota Ford. I prep cars and get them ready to sell.",
  city: "Sarasota",
  state: "FL",
  remote: "In person",
  summary:
    "Nick preps and details vehicles at Sarasota Ford: removing stickers and transport film, mounting plates, refueling, checking loaner cars in and out, and keeping the logs straight. He is consistent, picks up new workflows quickly, and his teammates count on him.",
  ownWords: "Doing my job is fun.",
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
  quotes: [
    {
      text:
        "It’s actually impressive how fast he learned how to do all these things with these loaner vehicles. I would even say that he actually learned faster than I did in the past.",
      name: "Sebastian Mattos",
      role: "Loaner department, Sarasota Ford",
    },
    {
      text: "I used to do detailing a lot, but Nick is by far the best in my opinion. I think every dealership needs somebody like Nick.",
      name: "Kevin",
      role: "Sarasota Ford",
    },
    {
      text: "Nick has been doing a wonderful job. He’s extremely consistent. The team has become very close.",
      name: "Veronica Izzo",
      role: "Loaner Department Manager, Sarasota Ford",
    },
  ],
  education: [
    { title: "High school diploma", org: "Sarasota County Schools", year: "2019" }, // PLACEHOLDER
  ],
  interests: ["Music on the drive", "Driving", "Getting to know the team"],
  availability: ["Weekday mornings", "Weekday afternoons"], // PLACEHOLDER
  contact: { email: "nick@example.com", phone: "(941) 555-0142" }, // PLACEHOLDER
};
