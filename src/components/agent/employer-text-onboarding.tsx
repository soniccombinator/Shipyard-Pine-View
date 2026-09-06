"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type Anthropic from "@anthropic-ai/sdk";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildEmployerClientTools } from "@/lib/agent/employer-client-tools";
import { summarizeEmployerStatus } from "@/lib/agent/employer-status";
import { firstName } from "@/lib/agent/text";
import { hasDraftConsent } from "@/lib/consent";
import type { EmployerProfile } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import { Transcript, type TranscriptLine } from "./transcript";

type Props = { userId: string; fullName: string };
type Snapshot = Partial<EmployerProfile> | null;

const PROFILE_COLUMNS = "user_id, company_name, description, website, city, state, accommodations_offered";

/**
 * The typed conversation is kept on-device (consent-gated) so closing the
 * tab mid-setup doesn't lose the thread -- same pattern as
 * text-onboarding.tsx's onboarding-chat draft.
 */
const CHAT_DRAFT_KEY = "connectable.draft.employer-onboarding-chat";
type ChatDraft = { messages: Anthropic.MessageParam[]; lines: TranscriptLine[]; started: boolean };

async function loadSnapshot(client: ReturnType<typeof createClient>, userId: string): Promise<Snapshot> {
  const { data } = await client.from("employer_profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();
  return (data as Partial<EmployerProfile> | null) ?? null;
}

/**
 * The Employer Guide, typed -- the employer-side counterpart to
 * text-onboarding.tsx. Reuses buildEmployerClientTools() so a save here
 * behaves identically to editing the profile form by hand: same schema,
 * same RLS, same table.
 */
export function EmployerTextOnboarding({ userId, fullName }: Props) {
  const client = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<Snapshot>(null);
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [draft, setDraft] = useState("");
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const refresh = useCallback(async () => {
    setSnapshot(await loadSnapshot(client, userId));
  }, [client, userId]);

  useEffect(() => {
    let active = true;
    loadSnapshot(client, userId).then((s) => {
      if (active) setSnapshot(s);
    });
    return () => {
      active = false;
    };
  }, [client, userId]);

  // Restore an interrupted conversation once, on mount.
  useEffect(() => {
    if (!hasDraftConsent()) return;
    try {
      const raw = window.localStorage.getItem(CHAT_DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ChatDraft;
      if (saved.started && Array.isArray(saved.messages) && saved.messages.length > 0) {
        setMessages(saved.messages);
        setLines(Array.isArray(saved.lines) ? saved.lines : []);
        setStarted(true);
        toast("We brought back your conversation.", {
          action: {
            label: "Start over",
            onClick: () => {
              try {
                window.localStorage.removeItem(CHAT_DRAFT_KEY);
              } catch {
                /* ignore */
              }
              window.location.reload();
            },
          },
        });
      }
    } catch {
      /* corrupt or unavailable storage -- start fresh */
    }
  }, []);

  // Keep the on-device copy current while the conversation is live.
  useEffect(() => {
    if (!hasDraftConsent() || !started) return;
    try {
      window.localStorage.setItem(CHAT_DRAFT_KEY, JSON.stringify({ messages, lines, started } satisfies ChatDraft));
    } catch {
      /* private mode / quota -- keep going in memory */
    }
  }, [messages, lines, started]);

  // Once setup is done, the conversation is done -- drop the draft.
  useEffect(() => {
    if (!finished) return;
    try {
      window.localStorage.removeItem(CHAT_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, [finished]);

  const tools = useMemo(() => buildEmployerClientTools(client, userId), [client, userId]);

  const addLine = useCallback((who: TranscriptLine["who"], text: string) => {
    if (!text) return;
    setLines((l) => [...l, { id: crypto.randomUUID(), who, text }]);
  }, []);

  /** Same loop shape as text-onboarding.tsx's runTurn -- see there for why
   *  it recurses automatically after a tool result. */
  const runTurn = useCallback(
    async (history: Anthropic.MessageParam[]) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/employer-text-turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userFirstName: firstName(fullName),
            companyStatus: summarizeEmployerStatus(snapshot),
          }),
        });
        const json = (await res.json()) as { content?: Anthropic.ContentBlock[]; error?: string };
        if (!res.ok || !json.content) {
          setError(json.error ?? "The guide is not available right now.");
          return;
        }

        for (const block of json.content) {
          if (block.type === "text" && block.text.trim()) addLine("guide", block.text.trim());
        }

        const toolUseBlocks = json.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        const nextHistory: Anthropic.MessageParam[] = [...history, { role: "assistant", content: json.content }];

        if (toolUseBlocks.length === 0) {
          setMessages(nextHistory);
          return;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          const fn = tools[block.name];
          const reply = fn ? await fn(block.input as Record<string, unknown>) : `Error: unknown tool ${block.name}.`;
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: reply });
          if (block.name === "finish_employer_onboarding" && !reply.startsWith("Error:")) setFinished(true);
        }
        await refresh();

        const withResults: Anthropic.MessageParam[] = [...nextHistory, { role: "user", content: toolResults }];
        setMessages(withResults);
        await runTurn(withResults);
      } catch {
        setError("We couldn't reach the guide. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [addLine, fullName, refresh, snapshot, tools]
  );

  function start() {
    setStarted(true);
    const initial: Anthropic.MessageParam[] = [{ role: "user", content: "Hi, I'm ready to set up my company." }];
    setMessages(initial);
    void runTurn(initial);
  }

  function send() {
    const text = draft.trim();
    if (!text || busy) return;
    addLine("you", text);
    setDraft("");
    const next: Anthropic.MessageParam[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    void runTurn(next);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
            {!started ? "Not started" : busy ? "Guide is thinking…" : "Connected"}
          </p>
          {!started && (
            <Button type="button" size="lg" onClick={start}>
              Start typing
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-coral-soft p-3 font-bold text-coral-foreground">
            {error}
          </p>
        )}

        <div className="min-h-64 rounded-lg border p-4">
          <Transcript lines={lines} />
        </div>

        {started && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <label htmlFor="employer-guide-input" className="sr-only">
              Your message
            </label>
            <Input id="employer-guide-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type here" disabled={busy} />
            <Button type="submit" aria-label="Send" disabled={busy || !draft.trim()}>
              <Send aria-hidden="true" />
            </Button>
          </form>
        )}

        {finished && (
          <div className="rounded-lg border-2 border-green bg-green-soft p-4">
            <p className="font-bold">Your company profile is ready.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button render={<Link href="/app/employer/jobs/new" />}>Post your first job</Button>
              <Button variant="outline" render={<Link href="/app/employer" />}>
                Check what was saved
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside aria-label="Your company profile so far" className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-muted-foreground">Your company profile, filling in live</h2>
        {snapshot ? (
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <p className="font-bold">{snapshot.company_name || "Company name not set yet"}</p>
            {(snapshot.city || snapshot.state) && (
              <p className="text-sm text-muted-foreground">
                {[snapshot.city, snapshot.state].filter(Boolean).join(", ")}
              </p>
            )}
            {snapshot.description && <p className="text-sm">{snapshot.description}</p>}
            {(snapshot.accommodations_offered?.length ?? 0) > 0 && (
              <p className="text-sm">
                <span className="font-bold">Accommodations offered: </span>
                {snapshot.accommodations_offered?.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nothing saved yet. Each answer shows up here as the guide saves it.
          </p>
        )}
      </aside>
    </div>
  );
}
