import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CommuteWorkspace } from "@/components/commute-workspace";
import { requireRole } from "@/lib/data/profile";
import { loadCommutes } from "@/lib/commute/data";
export const metadata = { title: "Mentor workspace" };
export default async function MentorPage() {
  const profile = await requireRole("mentor");
  const data = await loadCommutes(profile).catch(() => null);
  return (
    <>
      <PageHeader
        kicker="Mentor workspace"
        title="Help your employees get to work"
        description="Pair with an employee, agree a ride, and coordinate with their employer."
      />
      {data ? (
        <CommuteWorkspace
          data={data}
          userId={profile.userId}
          viewerRole={profile.role}
        />
      ) : (
        <div role="alert" className="rounded-xl border p-5">
          <p>
            The commute workspace needs database setup. Ask the project owner to
            apply the commute MVP migration, then refresh.
          </p>
          <Link href="/app/mentor" className="mt-3 inline-block underline">
            Try again
          </Link>
        </div>
      )}
    </>
  );
}
