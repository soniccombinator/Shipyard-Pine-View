"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ViewMediaButton } from "@/components/media/view-media-button";
import { applyParsedResume, uploadResumeFile } from "@/lib/profile/resume-import-actions";
import type { ParsedResume } from "@/lib/resume-parse";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // "data:application/pdf;base64,AAAA..." -- keep only the payload.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Lets someone upload their actual resume file (PDF or Word), or paste
 * text, and see what ConnectAble found in it before anything is saved.
 * Nothing here writes to the profile until the person clicks "Add these to
 * my profile" -- see src/lib/profile/resume-import-actions.ts for the write
 * path, and src/lib/resume-parse.ts for why the extraction never invents a
 * fact.
 */
export function ResumeImport({ resumePath }: { resumePath: string | null }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleParse(body: Record<string, string>) {
    setLoading(true);
    try {
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "We couldn't read that resume. Please try again.");
        return;
      }
      setParsed(data.parsed as ParsedResume);
    } catch {
      toast.error("We couldn't read that resume. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const base64 = await fileToBase64(file);
    if (file.type === PDF_MIME) {
      await handleParse({ pdfBase64: base64 });
    } else if (file.type === DOCX_MIME || file.type === DOC_MIME) {
      await handleParse({ docxBase64: base64 });
    } else {
      toast.error("Please upload a PDF or Word (.doc/.docx) file.");
      setPendingFile(null);
    }
  }

  function handleAccept() {
    if (!parsed) return;
    startTransition(async () => {
      const result = await applyParsedResume(parsed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // If they uploaded a file (rather than pasting text), keep the
      // original on file too -- separate from the extracted fields above.
      if (pendingFile) {
        const fd = new FormData();
        fd.set("file", pendingFile);
        const uploadResult = await uploadResumeFile(fd);
        if (uploadResult.error) toast.error(uploadResult.error);
      }
      toast.success(result.success ?? "Added.");
      setParsed(null);
      setText("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDiscard() {
    setParsed(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Import from a resume</h2>
      <p className="text-sm text-muted-foreground">
        Upload your resume, or paste the text below. We only use what it actually says -- nothing is added or guessed.
        You choose what to keep before anything is saved.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          {loading ? "Reading…" : "Upload a PDF or Word file"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload resume file"
        />
        {resumePath && !parsed && (
          <ViewMediaButton bucket="resumes" path={resumePath}>
            View resume on file
          </ViewMediaButton>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Or paste text instead</summary>
        <div className="mt-3 flex flex-col gap-3">
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your resume text here"
            aria-label="Resume text"
          />
          <Button
            type="button"
            onClick={() => {
              setPendingFile(null);
              handleParse({ text });
            }}
            disabled={loading || !text.trim()}
            className="self-start"
          >
            {loading ? "Reading…" : "Read my resume"}
          </Button>
        </div>
      </details>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle>Here&apos;s what we found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {parsed.headline && (
              <p>
                <strong>Headline:</strong> {parsed.headline}
              </p>
            )}
            {(parsed.city || parsed.state) && (
              <p>
                <strong>Location:</strong> {[parsed.city, parsed.state].filter(Boolean).join(", ")}
              </p>
            )}
            {parsed.about && (
              <p>
                <strong>About:</strong> {parsed.about}
              </p>
            )}
            {parsed.abilities.length > 0 && (
              <p>
                <strong>Abilities:</strong> {parsed.abilities.join(", ")}
              </p>
            )}
            {parsed.history.length > 0 && (
              <div>
                <strong>History:</strong>
                <ul className="ml-4 list-disc">
                  {parsed.history.map((h, i) => (
                    <li key={i}>
                      {h.title}
                      {h.org ? ` -- ${h.org}` : ""}
                      {h.year ? ` (${h.year})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.abilities.length === 0 && parsed.history.length === 0 && !parsed.headline && !parsed.about && (
              <p className="text-muted-foreground">We didn&apos;t find anything usable in that text.</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleAccept} disabled={pending}>
                {pending ? "Adding…" : "Add these to my profile"}
              </Button>
              <Button type="button" variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
