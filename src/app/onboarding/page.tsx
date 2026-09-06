import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { hasAnthropicEnv, hasElevenLabsEnv, hasSupabaseEnv } from "@/lib/env";
import { SITE_URL } from "@/lib/sample";
import { createClient } from "@/lib/supabase/server";
import { hasRealGuide } from "./guide-modes";
import { OnboardingClient } from "./onboarding-client";
import { OnboardingDemo } from "./onboarding-demo";

// Audit F5 — the onboarding flow is auth-gated / transactional, not indexable.
export const metadata = { title: "Welcome", robots: { index: false, follow: true } };

export default async function OnboardingPage() {
  let userId: string | null = null;
  let fullName = "";

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      userId = data.claims.sub;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      fullName = profile?.full_name ?? "";
    }
  }

  // Voice and typing are separate services; either one alone is enough for
  // the real guide. The scripted demo is only for a deployment with neither.
  const available = { voice: hasElevenLabsEnv(), text: hasAnthropicEnv() };

  return (
    <div className="ap-site flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Wordmark className="[--wordmark-size:1.1rem]" />
          <Button variant="ghost" className="rounded-full" render={<Link href="/app" />}>
            Skip for now
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {hasRealGuide(available) ? (
          <OnboardingClient
            userId={userId}
            fullName={fullName}
            siteUrl={SITE_URL}
            voiceAvailable={available.voice}
            textAvailable={available.text}
          />
        ) : (
          <div className="mx-auto max-w-3xl">
            <OnboardingDemo />
          </div>
        )}
      </main>
    </div>
  );
}
