import { PageHeader } from "@/components/page-header";
import { EmployeeProfileForm } from "@/components/profile/employee-profile-form";
import { HistoryEditor } from "@/components/profile/history-editor";
import { ResumeImport } from "@/components/profile/resume-import";
import { WorkMediaUpload } from "@/components/profile/work-media-upload";
import { requireRole } from "@/lib/data/profile";
import type { EmployeePrivate, EmployeeProfile } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit profile" };

const PROFILE_COLUMNS =
  "user_id, headline, about, about_raw, city, state, remote_preference, availability, abilities, accommodations, awards, education, volunteer, resume_path, video_path, passport_slug, passport_public, searchable";

export default async function ProfilePage() {
  const { userId, fullName } = await requireRole("employee");
  const supabase = await createClient();
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("employee_profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle(),
    supabase.from("employee_private").select("salary_min, salary_max").eq("user_id", userId).maybeSingle(),
  ]);
  const p = (profile as unknown as EmployeeProfile | null) ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker="Profile" title="Edit your profile" description="Everything here goes on your Ability Passport, except pay." />
      <div className="flex flex-col gap-6">
        <p className="ap-rule">Import</p>
        <ResumeImport resumePath={p?.resume_path ?? null} />
        <p className="ap-rule">Your details</p>
        <EmployeeProfileForm profile={p} priv={(priv as EmployeePrivate | null) ?? null} fullName={fullName} />
        <p className="ap-rule">History</p>
        <HistoryEditor awards={p?.awards ?? []} education={p?.education ?? []} volunteer={p?.volunteer ?? []} />
        <p className="ap-rule">Show your work</p>
        <WorkMediaUpload videoPath={p?.video_path ?? null} />
      </div>
    </div>
  );
}
