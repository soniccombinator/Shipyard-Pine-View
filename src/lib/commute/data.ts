import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/data/profile";
import type { CommuteData, Person } from "./model";

export async function loadCommutes(
  profile: CurrentProfile,
): Promise<CommuteData> {
  const db = await createClient();
  // RLS scopes pairings and trips. Public account names are already readable by
  // authenticated accounts in the foundation; no private profile fields loaded.
  const [people, pairings, trips, companies] = await Promise.all([
    db.from("profiles").select("id,full_name,role"),
    db
      .from("mentorships")
      .select(
        "id,mentor_id,employee_id,status,consent_granted_at,consent_revoked_at",
      ),
    db.from("commute_requests").select("*").order("arrive_by"),
    db.from("employer_profiles").select("user_id,company_name"),
  ]);
  if (people.error || pairings.error || trips.error || companies.error)
    throw new Error("Commute workspace unavailable");
  const names = (people.data ?? []).map((p) => ({
    id: p.id,
    name:
      companies.data?.find((c) => c.user_id === p.id)?.company_name ||
      p.full_name ||
      "Team member",
    role: p.role,
  })) as Person[];
  // Employers do not receive the full employee directory, only shared riders.
  const visible =
    profile.role === "employer"
      ? names.filter(
          (p) =>
            (trips.data ?? []).some(
              (t) => t.employee_id === p.id || t.arranged_by === p.id,
            ) || p.id === profile.userId,
        )
      : names;
  return {
    people: visible,
    pairings: pairings.data ?? [],
    trips: trips.data ?? [],
  };
}
