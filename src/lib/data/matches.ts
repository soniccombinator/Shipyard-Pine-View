import "server-only";
import type { FeedbackValue, HistoryItem, Job, RemotePreference } from "@/lib/domain";
import type { Breakdown } from "@/lib/match/score";
import { createClient } from "@/lib/supabase/server";

export type CandidateMatch = {
  matchId: string;
  score: number;
  breakdown: Breakdown;
  employeeId: string;
  fullName: string;
  headline: string;
  about: string;
  city: string;
  state: string;
  remotePreference: RemotePreference;
  abilities: string[];
  accommodations: string[];
  availability: string[];
  awards: HistoryItem[];
  education: HistoryItem[];
  volunteer: HistoryItem[];
  passportSlug: string | null;
  passportPublic: boolean;
  resumePath: string | null;
  videoPath: string | null;
  myFeedback: FeedbackValue | null;
  theirFeedback: FeedbackValue | null;
};

type FeedbackRow = { match_id: string; user_id: string; value: FeedbackValue };

function feedbackFor(rows: FeedbackRow[], matchId: string, userId: string): FeedbackValue | null {
  return rows.find((f) => f.match_id === matchId && f.user_id === userId)?.value ?? null;
}

/** Ranked candidates for one of the viewer's jobs. Employees the viewer cannot see under RLS are skipped. */
export async function getCandidatesForJob(jobId: string, viewerId: string): Promise<CandidateMatch[]> {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id, score, breakdown, employee_id")
    .eq("job_id", jobId)
    .order("score", { ascending: false });
  if (!matches?.length) return [];

  const ids = matches.map((m) => m.employee_id as string);
  const [{ data: profiles }, { data: employees }, { data: feedback }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase
      .from("employee_profiles")
      .select(
        "user_id, headline, about, city, state, remote_preference, abilities, accommodations, availability, awards, education, volunteer, passport_slug, passport_public, resume_path, video_path"
      )
      .in("user_id", ids),
    supabase.from("match_feedback").select("match_id, user_id, value").in("match_id", matches.map((m) => m.id as string)),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));
  const employeeById = new Map((employees ?? []).map((e) => [e.user_id as string, e]));
  const fb = (feedback ?? []) as FeedbackRow[];

  const out: CandidateMatch[] = [];
  for (const m of matches) {
    const e = employeeById.get(m.employee_id as string);
    if (!e) continue;
    out.push({
      matchId: m.id as string,
      score: m.score as number,
      breakdown: m.breakdown as Breakdown,
      employeeId: e.user_id as string,
      fullName: nameById.get(e.user_id as string) ?? "Job seeker",
      headline: e.headline ?? "",
      about: e.about ?? "",
      city: e.city ?? "",
      state: e.state ?? "",
      remotePreference: (e.remote_preference ?? "either") as RemotePreference,
      abilities: e.abilities ?? [],
      accommodations: e.accommodations ?? [],
      availability: e.availability ?? [],
      awards: e.awards ?? [],
      education: e.education ?? [],
      volunteer: e.volunteer ?? [],
      passportSlug: e.passport_slug ?? null,
      passportPublic: Boolean(e.passport_public),
      resumePath: e.resume_path ?? null,
      videoPath: e.video_path ?? null,
      myFeedback: feedbackFor(fb, m.id as string, viewerId),
      theirFeedback: feedbackFor(fb, m.id as string, e.user_id as string),
    });
  }
  return out;
}

export type EmployeeMatch = {
  matchId: string;
  score: number;
  breakdown: Breakdown;
  job: Job;
  companyName: string;
  myFeedback: FeedbackValue | null;
  theirFeedback: FeedbackValue | null;
};

/** The signed-in employee's matches, best first. */
export async function getMatchesForEmployee(userId: string): Promise<EmployeeMatch[]> {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id, score, breakdown, job_id")
    .eq("employee_id", userId)
    .order("score", { ascending: false });
  if (!matches?.length) return [];

  const jobIds = matches.map((m) => m.job_id as string);
  const { data: jobs } = await supabase.from("jobs").select("*").in("id", jobIds);
  const employerIds = [...new Set((jobs ?? []).map((j) => j.employer_id as string))];
  const [{ data: employers }, { data: feedback }] = await Promise.all([
    supabase.from("employer_profiles").select("user_id, company_name").in("user_id", employerIds),
    supabase.from("match_feedback").select("match_id, user_id, value").in("match_id", matches.map((m) => m.id as string)),
  ]);
  const jobById = new Map((jobs ?? []).map((j) => [j.id as string, j as Job]));
  const companyById = new Map((employers ?? []).map((e) => [e.user_id as string, e.company_name as string]));
  const fb = (feedback ?? []) as FeedbackRow[];

  const out: EmployeeMatch[] = [];
  for (const m of matches) {
    const job = jobById.get(m.job_id as string);
    // Skip jobs that are gone or no longer open, even if a stale match row survives.
    if (!job || job.status !== "open") continue;
    out.push({
      matchId: m.id as string,
      score: m.score as number,
      breakdown: m.breakdown as Breakdown,
      job: { ...job, salary_min: job.salary_min == null ? null : Number(job.salary_min), salary_max: job.salary_max == null ? null : Number(job.salary_max) },
      companyName: companyById.get(job.employer_id) ?? "Employer",
      myFeedback: feedbackFor(fb, m.id as string, userId),
      theirFeedback: feedbackFor(fb, m.id as string, job.employer_id),
    });
  }
  return out;
}
