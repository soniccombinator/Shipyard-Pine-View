import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
export const metadata = {
  title: "Mentor commute MVP",
  robots: { index: false, follow: false },
};
export default function MentorPreview() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-12">
      <Wordmark />
      <h1 className="mt-10 text-3xl font-bold">
        One job: help people get to work.
      </h1>
      <p className="mt-4 text-muted-foreground">
        The mentor MVP now focuses on employee pairing and commute arrangements.
      </p>
      <ol className="my-8 space-y-4 list-decimal pl-5">
        <li>A mentor invites an employee. The employee accepts.</li>
        <li>
          The employee requests a ride from a pickup location to their
          workplace.
        </li>
        <li>
          The mentor or employer proposes the ride. The employee confirms.
        </li>
      </ol>
      <Link
        className="inline-block rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground"
        href="/app/mentor"
      >
        Open the mentor workspace
      </Link>
      <p className="mt-5 text-sm text-muted-foreground">
        The working workspace uses signed-in accounts and saves trips to the
        database. The previous sample dashboard has been removed.
      </p>
    </main>
  );
}
