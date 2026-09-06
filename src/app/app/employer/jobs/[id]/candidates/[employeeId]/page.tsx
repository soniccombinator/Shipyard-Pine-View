import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { BreakdownList } from "@/components/match/breakdown-list";
import { FeedbackButtons } from "@/components/match/feedback-buttons";
import { InterviewCopilot } from "@/components/match/interview-copilot";
import { MatchRing } from "@/components/match/match-ring";
import { ViewMediaButton } from "@/components/media/view-media-button";
import { PageHeader } from "@/components/page-header";
import { PassportCard } from "@/components/passport/passport-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidatesForJob } from "@/lib/data/matches";
import { requireRole } from "@/lib/data/profile";
import type { Job } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Candidate" };

export default async function CandidatePage({ params }: { params: Promise<{ id: string; employeeId: string }> }) {
  const { id, employeeId } = await params;
  const { userId } = await requireRole("employer");
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("employer_id", userId).maybeSingle();
  if (!job) notFound();
  const j = job as Job;
  const match = (await getCandidatesForJob(j.id, userId)).find((c) => c.employeeId === employeeId);
  if (!match) notFound();
  const offered = new Set(j.accommodations_offered.map((a) => a.toLowerCase()));
  const back = `/app/employer/jobs/${j.id}/candidates`;

  return (
    <>
      <PageHeader kicker="Candidate" title={match.fullName} description={`Candidate for ${j.title}`}>
        <Button variant="outline" render={<Link href={back} />}>
          Back to candidates
        </Button>
      </PageHeader>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <PassportCard
          person={{
            id: match.employeeId,
            slug: match.passportSlug ?? "",
            fullName: match.fullName,
            headline: match.headline,
            about: match.about,
            aboutRaw: "",
            city: match.city,
            state: match.state,
            remotePreference: match.remotePreference,
            abilities: match.abilities,
            accommodations: [],
            availability: match.availability,
            awards: match.awards,
            education: match.education,
            volunteer: match.volunteer,
            salaryMin: null,
            salaryMax: null,
          }}
        />
        <div className="flex flex-col gap-4">
          <Card className="ap-fade">
            <CardHeader className="items-center">
              <MatchRing score={match.score} size={96} />
            </CardHeader>
            <CardContent>
              <BreakdownList breakdown={match.breakdown} />
            </CardContent>
          </Card>
          <Card className="ap-fade ap-fade-1">
            <CardHeader>
              <CardTitle>Accommodations they need</CardTitle>
            </CardHeader>
            <CardContent>
              {match.accommodations.length === 0 ? (
                <p className="text-sm text-muted-foreground">None listed.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {match.accommodations.map((a) => {
                    const ok = offered.has(a.toLowerCase());
                    return (
                      <li key={a} className="inline-flex items-center gap-2">
                        {ok ? <Check aria-hidden="true" className="size-4 text-green" /> : <Minus aria-hidden="true" className="size-4 text-muted-foreground" />}
                        <span>
                          {a}
                          <span className="text-muted-foreground"> · {ok ? "you offer this" : "not on this job yet"}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          {(match.resumePath || match.videoPath) && (
            <Card className="ap-fade ap-fade-1">
              <CardHeader>
                <CardTitle>See for yourself</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {match.resumePath && (
                  <ViewMediaButton bucket="resumes" path={match.resumePath}>
                    View resume
                  </ViewMediaButton>
                )}
                {match.videoPath && (
                  <ViewMediaButton bucket="videos" path={match.videoPath}>
                    View them at work
                  </ViewMediaButton>
                )}
              </CardContent>
            </Card>
          )}
          <FeedbackButtons matchId={match.matchId} current={match.myFeedback} back={`${back}/${match.employeeId}`} vertical />
          <InterviewCopilot jobId={j.id} matchId={match.matchId} recordingPath={match.recordingPath} />
          {match.passportPublic && match.passportSlug && (
            <Button variant="outline" render={<Link href={`/p/${match.passportSlug}`} />}>
              Open their public Passport
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Mark interested and they will see it on their matches page. Messaging comes next.</p>
        </div>
      </div>
    </>
  );
}
