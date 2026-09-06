import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { LivePassport } from "@/components/passport/live-passport";
import { CLIPS, NICK, PASSPORT_URL } from "@/lib/passport/nick";
import { JsonLd } from "@/lib/seo/structured-data";

// Editorial headings, same face as the homepage. The root layout supplies the body font.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-editorial", display: "swap" });

const title = `${NICK.fullName}’s Ability Passport`;
const description = `${NICK.headline} See Nick at work and hear what his colleagues at Sarasota Ford say about him.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/nick" },
  openGraph: {
    title,
    description,
    url: PASSPORT_URL,
    type: "profile",
    images: [{ url: CLIPS[0].poster, width: 1280, height: 720, alt: CLIPS[0].description }],
  },
  twitter: { card: "summary_large_image", title, description, images: [CLIPS[0].poster] },
};

export default function NickPassportPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: PASSPORT_URL,
          mainEntity: {
            "@type": "Person",
            name: NICK.fullName,
            description: NICK.headline,
            jobTitle: "Service Porter",
            worksFor: { "@type": "Organization", name: "Sarasota Ford" },
            address: { "@type": "PostalAddress", addressLocality: NICK.city, addressRegion: NICK.state },
            knowsAbout: NICK.abilities,
          },
        }}
      />
      <LivePassport className={montserrat.variable} />
    </>
  );
}
