"use client";

import { useState } from "react";
import Link from "next/link";
import { Keyboard, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Line = { id: number; who: "you" | "guide"; text: string };

const SCRIPT = [
  "Great to meet you, Nick! First, what city do you live in, and do you want to work in person, remotely, or either?",
  "Got it, saved. Now, what are some things you're good at, at work or at home?",
  "Those are real abilities. I've saved them. What helps you do your best work? For example written instructions or a regular schedule.",
  "Saved as accommodations. When can you work? Mornings, afternoons, weekends?",
  "Perfect. Last one: tell me about a time you did a good job at something.",
  "Here's how I'd say that professionally: \"Nick kept a busy stockroom organized for two years and never missed a shift.\" Does that sound right?",
  "Saved. Your Ability Passport is ready to publish. Tap \"See my Passport\" below.",
];

export function OnboardingDemo() {
  const [mode, setMode] = useState<"voice" | "text" | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState(0);
  const done = step >= SCRIPT.length;

  function start(m: "voice" | "text") {
    setMode(m);
    setLines([{ id: 0, who: "guide", text: "Hi Nick. I'm your Passport Guide. We can go slowly. I'll ask one easy question at a time, and I'll build your Ability Passport as we go. Take your time with each answer. You can stop whenever you want. Would you like to start?" }]);
  }

  function send() {
    const text = draft.trim();
    if (!text || done) return;
    const reply = SCRIPT[step];
    setLines((l) => [...l, { id: l.length, who: "you", text }, { id: l.length + 1, who: "guide", text: reply }]);
    setStep((s) => s + 1);
    setDraft("");
  }

  if (!mode) {
    return (
      <div className="flex flex-col gap-6">
        <p className="ap-label">Passport guide</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome, Nick</h1>
        <p>Your Passport Guide will ask a few easy questions and build your Ability Passport as you go. How would you like to talk?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => start("voice")} className="flex flex-col items-center gap-3 rounded-xl border-2 p-8 text-lg font-bold hover:border-green hover:bg-green-soft">
            <Mic aria-hidden="true" className="size-10 text-green" />
            Talk out loud
          </button>
          <button type="button" onClick={() => start("text")} className="flex flex-col items-center gap-3 rounded-xl border-2 p-8 text-lg font-bold hover:border-green hover:bg-green-soft">
            <Keyboard aria-hidden="true" className="size-10 text-green" />
            Type instead
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Let&apos;s build your Passport</h1>
        <p role="status" className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
          {mode === "voice" ? "Listening" : "Connected"}
        </p>
      </div>

      <ol aria-label="Conversation" aria-live="polite" className="flex min-h-64 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-[var(--ap-shadow-md)]">
        {lines.map((line) => (
          <li
            key={line.id}
            className={line.who === "you" ? "max-w-[85%] self-end rounded-2xl bg-green-soft px-4 py-2" : "max-w-[85%] self-start rounded-2xl bg-muted px-4 py-2"}
          >
            <span className="block text-xs font-bold text-muted-foreground">{line.who === "you" ? "You" : "Guide"}</span>
            {line.text}
          </li>
        ))}
      </ol>

      {done ? (
        <div className="rounded-2xl border-2 border-green bg-green-soft p-4 shadow-[var(--ap-shadow-md)]">
          <p className="font-bold">Your Ability Passport is ready.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button render={<Link href="/app/passport" />}>See my Passport</Button>
            <Button variant="outline" render={<Link href="/app/profile" />}>
              Check what was saved
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <label htmlFor="guide-input" className="sr-only">
            Your message
          </label>
          <Input id="guide-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === "voice" ? "Or type here" : "Type here"} />
          <Button type="submit" aria-label="Send">
            <Send aria-hidden="true" />
          </Button>
        </form>
      )}
      <button type="button" onClick={() => setMode(null)} className="self-start text-sm font-bold text-green underline">
        Change how we talk
      </button>
    </div>
  );
}
