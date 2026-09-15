"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LiveInterviewRecorder } from "@/components/match/live-interview-recorder";

type CopilotResult = {
  suggestedQuestions: string[];
  whatToListenFor: string;
  flagged: boolean;
  demoModeFallback?: boolean;
};

// Defense in depth: the tool schema asks the model for plain text with no
// markdown and no leading bullet/number, but this is still free-form model
// output -- strip anything that slips through rather than show a raw "**"
// or "1." to the employer.
function stripStrayMarkdown(text: string): string {
  return text
    .replace(/^[-*\d.]+\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Employer-side only, disclosed, and read by the employer alone -- the
 * candidate never sees this. See src/lib/interview-copilot.ts for why this
 * is not the participant-facing "ethical Cluely" idea from the team's
 * original brainstorm.
 */
export function InterviewCopilot({
  jobId,
  matchId,
  recordingPath = null,
}: {
  jobId: string;
  matchId?: string;
  recordingPath?: string | null;
}) {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function getSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/interviews/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, transcriptSoFar: transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "We couldn't get a suggestion. Please try again.");
        return;
      }
      setResult(data as CopilotResult);
    } catch {
      toast.error("We couldn't get a suggestion. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview helper</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Record the call live, or type notes as you go. This is for you only -- the candidate never sees it.
        </p>
        {matchId && (
          <LiveInterviewRecorder
            matchId={matchId}
            recordingPath={recordingPath}
            onLiveTranscript={(text) => setTranscript((prev) => (prev ? `${prev} ${text}` : text))}
          />
        )}
        <Textarea
          rows={4}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="What have they said so far?"
          aria-label="Interview notes"
        />
        <Button type="button" onClick={getSuggestions} disabled={loading} className="self-start">
          {loading ? "Thinking…" : "Suggest a follow-up question"}
        </Button>

        {result?.flagged && (
          <p className="text-sm text-coral-foreground">
            We couldn&apos;t suggest a question that stays focused on the job&apos;s tasks. Try asking about a
            specific task instead.
          </p>
        )}

        {result && !result.flagged && result.suggestedQuestions.length > 0 && (
          <div className="rounded-lg border p-3 text-sm">
            <ul className="ml-4 list-disc">
              {result.suggestedQuestions.map((q, i) => (
                <li key={i}>{stripStrayMarkdown(q)}</li>
              ))}
            </ul>
            {result.whatToListenFor && (
              <p className="mt-2 text-muted-foreground">{stripStrayMarkdown(result.whatToListenFor)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
