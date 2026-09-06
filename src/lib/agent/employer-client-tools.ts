import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EmployerProfile } from "@/lib/domain";
import { summarizeEmployerStatus, canFinishEmployerOnboarding } from "./employer-status";
import { parseList } from "./text";

/**
 * Client tools for the Employer Guide -- the employer-side counterpart to
 * client-tools.ts. Every tool runs in the browser with the signed-in
 * employer's Supabase session, so RLS guarantees it can only touch that
 * employer's own row. Tools never throw: they return a short string the
 * agent can read back, and on failure a message starting with "Error:" so
 * the agent can apologise and retry -- same contract as the employee tools.
 *
 * Unlike the employee side, there's no local-store fallback: an employer
 * only reaches this guide already signed in (see the role check on
 * src/app/onboarding/page.tsx), so a Supabase session always exists.
 */
type ToolFn = (parameters: Record<string, unknown>) => Promise<string>;
export type EmployerClientTools = Record<string, ToolFn>;

const PROFILE_COLUMNS = "user_id, company_name, description, website, city, state, accommodations_offered";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const basicsSchema = z.object({
  company_name: optionalText(120),
  city: optionalText(80),
  state: optionalText(2).transform((v) => v?.toUpperCase()),
  website: optionalText(200).transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v)),
});

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return `Error: ${msg}. Please try again.`;
}

export function buildEmployerClientTools(supabase: SupabaseClient, userId: string): EmployerClientTools {
  async function loadProfile(): Promise<Partial<EmployerProfile> | null> {
    const { data, error } = await supabase.from("employer_profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return (data as Partial<EmployerProfile> | null) ?? null;
  }

  async function status(): Promise<string> {
    return summarizeEmployerStatus(await loadProfile());
  }

  async function upsertProfile(patch: Partial<EmployerProfile>): Promise<string> {
    const { error } = await supabase.from("employer_profiles").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) throw error;
    return `Saved. ${await status()}`;
  }

  return {
    get_company_status: async () => {
      try {
        return await status();
      } catch (e) {
        return errorMessage(e);
      }
    },

    save_company_basics: async (parameters) => {
      try {
        const patch = basicsSchema.parse(parameters);
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
        if (Object.keys(clean).length === 0) return "Nothing to save yet.";
        return await upsertProfile(clean);
      } catch (e) {
        return errorMessage(e);
      }
    },

    save_description: async (parameters) => {
      try {
        const description = String(parameters.description ?? "").trim().slice(0, 1000);
        if (!description) return "Error: the description is empty.";
        return await upsertProfile({ description });
      } catch (e) {
        return errorMessage(e);
      }
    },

    save_accommodations: async (parameters) => {
      try {
        const accommodations_offered = parseList(String(parameters.accommodations ?? ""));
        if (accommodations_offered.length === 0) return "Error: no accommodations were given.";
        return await upsertProfile({ accommodations_offered });
      } catch (e) {
        return errorMessage(e);
      }
    },

    finish_employer_onboarding: async () => {
      try {
        const profile = await loadProfile();
        if (!canFinishEmployerOnboarding(profile)) {
          return "Error: the company name and city must be saved before finishing.";
        }
        return "Done. Ready to post your first job.";
      } catch (e) {
        return errorMessage(e);
      }
    },
  };
}
