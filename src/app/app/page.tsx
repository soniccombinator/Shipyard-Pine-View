import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeStatus } from "@/lib/agent/profile-status";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role === "employer") redirect("/app/employer");
  if (profile.role === "mentor") redirect("/app/mentor");
  const supabase = await createClient();
  const first = profile.fullName.split(" ")[0] || "there";

  if (profile.role === "employee") {
    const [{ data: ep }, { data: priv }, { count }] = await Promise.all([
      supabase
        .from("employee_profiles")
        .select("headline, city, about, abilities, accommodations, availability, awards, education, volunteer, passport_public")
        .eq("user_id", profile.userId)
        .maybeSingle(),
      supabase.from("employee_private").select("salary_min").eq("user_id", profile.userId).maybeSingle(),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("employee_id", profile.userId),
    ]);
    const status = summarizeStatus(ep, priv);
    const abilityCount = ep?.abilities?.length ?? 0;
    return (
      <>
        <PageHeader kicker="Your dashboard" title={`Hi ${first}`} description="Here is where you are." />

        <div className="ap-stats ap-fade">
          <div className="ap-stat">
            <div className="ap-stat-val">{ep?.passport_public ? "Live" : "Draft"}</div>
            <div className="ap-label mt-0.5">Passport</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-val">{count ?? 0}</div>
            <div className="ap-label mt-0.5">Matches</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-val">{abilityCount}</div>
            <div className="ap-label mt-0.5">Abilities</div>
          </div>
        </div>

        <p className="ap-rule">Next steps</p>
        <div className="mb-4 rounded-xl border bg-green-soft p-4"><h2 className="font-bold">Need a ride to work?</h2><p className="mt-1 text-sm">Share your pickup location and destination. Your mentor or employer can help arrange a ride.</p><Link className="mt-2 inline-block font-bold underline" href="/app/commutes">Plan your commute</Link></div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="ap-accent ap-accent-green ap-fade ap-fade-1">
            <CardHeader>
              <CardTitle>Your Ability Passport</CardTitle>
              <CardDescription>{ep?.passport_public ? "Live. Anyone with the link can see it." : status}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ep?.passport_public ? (
                <Button render={<Link href="/app/passport" />}>See my Passport</Button>
              ) : (
                <Button render={<Link href="/onboarding" />}>Build it with the guide</Button>
              )}
              <Button variant="outline" render={<Link href="/app/profile" />}>
                Edit by hand
              </Button>
            </CardContent>
          </Card>
          <Card className="ap-accent ap-accent-purple ap-fade ap-fade-2">
            <CardHeader>
              <CardTitle>Matches</CardTitle>
              <CardDescription>
                {count ? `${count} job${count === 1 ? "" : "s"} could be a fit.` : "Publish your Passport to start matching."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" render={<Link href="/app/matches" />}>
                See matches
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return null;
}
