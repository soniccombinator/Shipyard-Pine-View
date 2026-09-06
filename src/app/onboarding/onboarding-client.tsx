"use client";

import { useState } from "react";
import Link from "next/link";
import { Keyboard, Mic } from "lucide-react";
import { PassportGuide, type GuideStorage } from "@/components/agent/passport-guide";
import { TextOnboarding } from "@/components/agent/text-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialGuideMode, type GuideMode } from "./guide-modes";

type Props = {
  userId: string | null;
  fullName: string;
  siteUrl: string;
  voiceAvailable: boolean;
  textAvailable: boolean;
};

/**
 * Picks who is talking (name, when there is no account yet) and how
 * (voice or text), then hands off to the guide.
 */
export function OnboardingClient({ userId, fullName: knownName, siteUrl, voiceAvailable, textAvailable }: Props) {
  const storage: GuideStorage = userId ? "supabase" : "local";
  const [name, setName] = useState(knownName);
  const [draftName, setDraftName] = useState("");
  // When only one way of talking is configured, don't make someone click
  // through a chooser to discover the other button is disabled -- skip
  // straight to the one that works. With both configured, show the chooser.
  const bothAvailable = voiceAvailable && textAvailable;
  const [mode, setMode] = useState<GuideMode | null>(
    initialGuideMode({ voice: voiceAvailable, text: textAvailable }),
  );
  const first = name.split(" ")[0] || "there";

  if (!name) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draftName.trim()) setName(draftName.trim());
        }}
        className="flex max-w-md flex-col gap-4"
      >
        <p className="ap-label">Passport guide</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome</h1>
        <label htmlFor="first-name" className="text-base font-bold">
          What should the guide call you?
        </label>
        <Input id="first-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} autoComplete="given-name" />
        <Button type="submit" size="lg" disabled={!draftName.trim()}>
          Continue
        </Button>
      </form>
    );
  }

  if (!mode) {
    return (
      <div className="flex flex-col gap-6">
        <p className="ap-label">Passport guide</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {first}</h1>
        <p>
          Your Passport Guide will ask a few easy questions and build your Ability Passport as you go. How would you
          like to talk?
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => voiceAvailable && setMode("voice")}
            disabled={!voiceAvailable}
            aria-disabled={!voiceAvailable}
            className="flex flex-col items-center gap-3 rounded-xl border-2 p-8 text-lg font-bold hover:border-green hover:bg-green-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-inherit disabled:hover:bg-transparent"
          >
            <Mic aria-hidden="true" className="size-10 text-green" />
            Talk out loud
            {!voiceAvailable && <span className="text-sm font-normal text-muted-foreground">Not set up yet -- try typing instead.</span>}
          </button>
          <button
            type="button"
            onClick={() => textAvailable && setMode("text")}
            disabled={!textAvailable}
            aria-disabled={!textAvailable}
            className="flex flex-col items-center gap-3 rounded-xl border-2 p-8 text-lg font-bold hover:border-green hover:bg-green-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-inherit disabled:hover:bg-transparent"
          >
            <Keyboard aria-hidden="true" className="size-10 text-green" />
            Type instead
            {!textAvailable && <span className="text-sm font-normal text-muted-foreground">Not set up yet -- try talking instead.</span>}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Prefer a form?{" "}
          <Link href="/app/profile" className="font-bold text-green underline">
            Fill in your profile by hand
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="ap-label">Passport guide</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Let&apos;s build your Passport</h1>
      {mode === "voice" ? (
        <PassportGuide userId={userId ?? "local-user"} fullName={name} siteUrl={siteUrl} mode="voice" storage={storage} />
      ) : (
        <TextOnboarding userId={userId ?? "local-user"} fullName={name} siteUrl={siteUrl} storage={storage} />
      )}
      {/* Only offer to change modes when there's a real second mode to switch
          to -- otherwise "changing" would just restart the same conversation
          and lose whatever was already said or typed. */}
      {bothAvailable && (
        <button type="button" onClick={() => setMode(null)} className="self-start text-sm font-bold text-green underline">
          Change how we talk
        </button>
      )}
    </div>
  );
}
