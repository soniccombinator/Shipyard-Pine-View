"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewMediaButton } from "@/components/media/view-media-button";
import { uploadInterviewRecording } from "@/lib/match/recording-actions";

// Web Speech API's SpeechRecognition isn't in lib.dom.d.ts under any
// standard name yet -- Chrome only ships it prefixed. Minimal shape for
// what this component actually uses; not a full type definition.
type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const RECORDER_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const EXT_BY_MIME: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "mp4" };

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return RECORDER_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

/**
 * Records the employer's own side of a live interview (audio only) and, in
 * browsers that support it, live-captions it straight into the interview
 * copilot's transcript above -- so "Suggest a follow-up" can run against
 * what was actually just said instead of notes typed after the fact.
 *
 * Recording a conversation without telling the other person is illegal in
 * all-party-consent states -- Florida (where this company is based) is one
 * -- so "Start" stays disabled until the employer checks the box below.
 * This is a promise about what they did in the room, not something the app
 * can verify; it exists so recording never starts silently.
 */
export function LiveInterviewRecorder({
  matchId,
  recordingPath,
  onLiveTranscript,
}: {
  matchId: string;
  recordingPath: string | null;
  onLiveTranscript: (appendedText: string) => void;
}) {
  const router = useRouter();
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;
  const canRecord = typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

  async function handleStop(mimeType: string) {
    if (chunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const bareMime = mimeType.split(";")[0];
      const blob = new Blob(chunksRef.current, { type: bareMime });
      const ext = EXT_BY_MIME[bareMime] ?? "webm";
      const fd = new FormData();
      fd.set("file", new File([blob], `interview.${ext}`, { type: bareMime }));
      const result = await uploadInterviewRecording(matchId, fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Recording saved.");
      router.refresh();
    } finally {
      setUploading(false);
      chunksRef.current = [];
    }
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void handleStop(recorder.mimeType || mimeType || "audio/webm");
      mediaRecorderRef.current = recorder;
      recorder.start();

      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let text = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) text += result[0].transcript + " ";
          }
          if (text.trim()) onLiveTranscript(text.trim());
        };
        recognition.onerror = () => {};
        recognition.onend = () => {
          // Chrome stops SpeechRecognition after a few seconds of silence --
          // restart it as long as we're still actively recording.
          if (mediaRecorderRef.current?.state === "recording") {
            try {
              recognition.start();
            } catch {
              // Already running; ignore.
            }
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
      }

      setRecording(true);
    } catch {
      toast.error("We couldn't access the microphone. Check your browser's permission for this site.");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }

  if (!canRecord) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Record this interview</p>
      {!recording && (
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox checked={consented} onCheckedChange={setConsented} />
          <span>I&apos;ve told the candidate this call is being recorded and they&apos;re okay with it.</span>
        </label>
      )}
      {!speechSupported && (
        <p className="text-xs text-muted-foreground">
          Live captions aren&apos;t available in this browser -- you can still record and type notes manually above.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <Button type="button" onClick={start} disabled={!consented || uploading}>
            Start recording
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={stop}>
            Stop recording
          </Button>
        )}
        {recording && <span className="text-sm text-coral-foreground">● Recording…</span>}
        {uploading && <span className="text-sm text-muted-foreground">Saving…</span>}
        {recordingPath && !recording && (
          <ViewMediaButton bucket="interviews" path={recordingPath}>
            Play recording
          </ViewMediaButton>
        )}
      </div>
    </div>
  );
}
