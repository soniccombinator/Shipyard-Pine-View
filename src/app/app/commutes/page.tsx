import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CommuteWorkspace } from "@/components/commute-workspace";
import { requireProfile } from "@/lib/data/profile";
import { loadCommutes } from "@/lib/commute/data";
export const metadata = { title: "Commutes" };
export default async function CommutesPage() {
  const profile = await requireProfile();
  const data = await loadCommutes(profile).catch(() => null);
  return (
    <>
      <PageHeader
        kicker="Getting to work"
        title="Commutes"
        description={
          profile.role === "employee"
            ? "Request a ride and confirm the plan that works for you."
            : "Help arrange rides for employees who have shared their commute."
        }
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
          <Link href="/app/commutes" className="mt-3 inline-block underline">
            Try again
          </Link>
        </div>
      )}
    </>
  );
}
