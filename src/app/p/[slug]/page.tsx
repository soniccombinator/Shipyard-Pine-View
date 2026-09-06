import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PassportCard } from "@/components/passport/passport-card";
import { PassportShare } from "@/components/passport/passport-qr";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getPublicPassport } from "@/lib/data/passport";
import { SITE_URL } from "@/lib/sample";
import { JsonLd, passportJsonLd } from "@/lib/seo/structured-data";

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
    <div className="ap-site flex flex-1 flex-col">
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
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/" className="inline-flex rounded-md [--wordmark-size:1.1rem]" aria-label="ConnectAble home">
            <Wordmark />
          </Link>
          <Button variant="outline" className="rounded-full" render={<Link href="/signup" />}>
            Get your own Passport
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto grid w-full max-w-4xl gap-8 px-6 py-8 md:grid-cols-[1fr_auto]">
        <PassportCard person={passport} />
        <PassportShare url={url} />
      </main>
    </div>
  );
}
