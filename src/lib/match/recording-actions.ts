"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

const RECORDING_EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
};

/**
 * Saves a recorded interview (audio only) against a specific match. The
 * employer must actually own the job behind that match -- matches' own RLS
 * already limits reads to participants, but this is a write, so it's
 * checked explicitly rather than trusted.
 *
 * The consent gate ("I've told the candidate this call is being recorded")
 * lives entirely in the client component that calls this -- Florida (where
 * this company is based) requires all-party consent to record a
 * conversation, so recording must never start silently.
 */
export async function uploadInterviewRecording(
  matchId: string,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No recording received." };
  const ext = RECORDING_EXT_BY_MIME[file.type];
  if (!ext) return { error: "Unsupported recording format." };

  const { userId } = await requireRole("employer");
  const supabase = await createClient();

  const { data: match } = await supabase.from("matches").select("id, job_id, employee_id").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Couldn't find that interview." };
  const { data: job } = await supabase.from("jobs").select("id").eq("id", match.job_id).eq("employer_id", userId).maybeSingle();
  if (!job) return { error: "You don't have access to that interview." };

  const path = `${userId}/${matchId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("interviews").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: "We couldn't save that recording. Please try again." };

  const { error: dbError } = await supabase
    .from("interview_recordings")
    .upsert({ match_id: matchId, employer_id: userId, path }, { onConflict: "match_id" });
  if (dbError) return { error: "Saved the file, but couldn't record it against this interview. Please try again." };

  revalidatePath(`/app/employer/jobs/${match.job_id}/candidates/${match.employee_id}`);
  return { success: "Recording saved." };
}
