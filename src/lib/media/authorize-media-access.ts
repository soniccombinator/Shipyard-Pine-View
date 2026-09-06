import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/domain";

/**
 * Decides whether a signed-in user may view a private resume/work-media
 * file. Storage RLS only ever grants someone their own folder ("storage:
 * owner manages own private files"), so this is the only place that decides
 * whether an employer can see a candidate's file -- and it does not use the
 * "searchable" flag: only a real match between this employer's own jobs and
 * this candidate counts, matching the same boundary the candidates page
 * itself already enforces (src/lib/data/matches.ts).
 */
export async function authorizeMediaAccess(
  supabase: SupabaseClient,
  viewer: { userId: string; role: Role },
  path: string
): Promise<boolean> {
  const ownerId = path.split("/")[0];
  if (ownerId === viewer.userId) return true;
  if (viewer.role !== "employer") return false;

  const { data: jobs } = await supabase.from("jobs").select("id").eq("employer_id", viewer.userId);
  const jobIds = ((jobs ?? []) as { id: string }[]).map((j) => j.id);
  if (jobIds.length === 0) return false;

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("employee_id", ownerId)
    .in("job_id", jobIds)
    .limit(1)
    .maybeSingle();
  return Boolean(match);
}
