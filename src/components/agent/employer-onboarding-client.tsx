"use client";

import { useState } from "react";
import { EmployerTextOnboarding } from "@/components/agent/employer-text-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { userId: string; fullName: string };

/**
 * Picks who is talking (name, in the rare case it's blank) then hands off
 * to the Employer Guide -- the employer-side counterpart to
 * onboarding-client.tsx. No mode choice here: there's no ElevenLabs agent
 * for employers today, so typing is the only path. If a voice guide is
 * ever built for this side, add the same mode chooser onboarding-client.tsx
 * uses.
 */
export function EmployerOnboardingClient({ userId, fullName: knownName }: Props) {
  const [name, setName] = useState(knownName);
  const [draftName, setDraftName] = useState("");
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
        <h1 className="text-3xl font-bold">Welcome</h1>
        <label htmlFor="employer-first-name" className="text-base font-bold">
          What should the guide call you?
        </label>
        <Input id="employer-first-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} autoComplete="given-name" />
        <Button type="submit" size="lg" disabled={!draftName.trim()}>
          Continue
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Let&apos;s set up your company, {first}</h1>
      <p className="text-muted-foreground">
        Your Employer Guide will ask a few quick questions and build your company profile as you go.
      </p>
      <EmployerTextOnboarding userId={userId} fullName={name} />
    </div>
  );
}
