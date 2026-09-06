import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { notFound } from "next/navigation";
import { PassportStory } from "@/components/passport/passport-story";
import { getPublicPassport } from "@/lib/data/passport";
import { SITE_URL } from "@/lib/sample";
import { JsonLd, passportJsonLd } from "@/lib/seo/structured-data";

// Same editorial heading face as Nick's live Passport (src/app/nick/page.tsx)
// and the homepage -- the root layout supplies the body font.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-editorial", display: "swap" });

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const passport = await getPublicPassport(slug);
  // Audit F6 — a passport that doesn't exist (or isn't published) should
  // never be indexed under its slug.
  if (!passport) return { title: "Ability Passport", robots: { index: false } };
  const title = `${passport.fullName}'s Ability Passport`;
  return {
    title,
    description: passport.headline,
    alternates: { canonical: `/p/${slug}` },
    openGraph: { title, description: passport.headline, url: `${SITE_URL}/p/${slug}` },
  };
}

export default async function PassportPage({ params }: Params) {
  const { slug } = await params;
  const passport = await getPublicPassport(slug);
  if (!passport) notFound();
  const url = `${SITE_URL}/p/${slug}`;

  return (
    <>
      {/* Audit F6 — server-rendered so the schema is in the initial HTML.
          Only ever reached for passport_public=true rows; no accommodations
          or pay (getPublicPassport already strips those). */}
      <JsonLd
        data={passportJsonLd({
          slug,
          fullName: passport.fullName,
          headline: passport.headline,
          city: passport.city,
          state: passport.state,
          abilities: passport.abilities,
          education: passport.education,
        })}
      />
      <PassportStory passport={passport} url={url} className={montserrat.variable} />
    </>
  );
}
