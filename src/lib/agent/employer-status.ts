import type { EmployerProfile } from "@/lib/domain";

/**
 * The Employer Guide's view of a company profile: which sections are saved
 * and which are missing. Mirrors src/lib/agent/profile-status.ts for the
 * employee side -- same shape, different fields, so the two guides feel
 * like one product.
 */

export const EMPLOYER_SECTIONS = ["basics", "description", "accommodations"] as const;
export type EmployerSection = (typeof EMPLOYER_SECTIONS)[number];

type EmployerProfileLike = Partial<
  Pick<EmployerProfile, "company_name" | "city" | "description" | "accommodations_offered">
>;

export function savedEmployerSections(profile: EmployerProfileLike | null): EmployerSection[] {
  if (!profile) return [];
  const saved: EmployerSection[] = [];
  if (profile.company_name?.trim() && profile.city?.trim()) saved.push("basics");
  if (profile.description?.trim()) saved.push("description");
  if ((profile.accommodations_offered?.length ?? 0) > 0) saved.push("accommodations");
  return saved;
}

/** Plain-language one-liner the agent can read and act on. */
export function summarizeEmployerStatus(profile: EmployerProfileLike | null): string {
  const saved = savedEmployerSections(profile);
  const missing = EMPLOYER_SECTIONS.filter((s) => !saved.includes(s));
  if (saved.length === 0) return "Nothing saved yet.";
  if (missing.length === 0) return "Everything is saved. Ready to finish.";
  return `Saved: ${saved.join(", ")}. Missing: ${missing.join(", ")}.`;
}

/** company_name + city are the minimum for the profile to be worth having. */
export function canFinishEmployerOnboarding(profile: EmployerProfileLike | null): boolean {
  return savedEmployerSections(profile).includes("basics");
}
