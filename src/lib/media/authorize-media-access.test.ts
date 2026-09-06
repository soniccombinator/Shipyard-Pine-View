// authorize-media-access.ts is server-only (no DOM APIs used); the real
// "server-only" package unconditionally throws when imported outside Next's
// own build, so mock it.
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { authorizeMediaAccess } from "./authorize-media-access";

function fakeSupabase({ jobs, match }: { jobs: { id: string }[]; match: { id: string } | null }) {
  const builder: Record<string, unknown> = {};
  let table = "";
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.limit = () => builder;
  builder.maybeSingle = () =>
    Promise.resolve(table === "matches" ? { data: match, error: null } : { data: null, error: null });
  builder.then = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: table === "jobs" ? jobs : null, error: null }).then(resolve);
  return {
    from: (name: string) => {
      table = name;
      return builder;
    },
  };
}

describe("authorizeMediaAccess", () => {
  it("allows the file's own owner regardless of role", async () => {
    const supabase = fakeSupabase({ jobs: [], match: null });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "emp-1", role: "employee" }, "emp-1/resume.pdf");
    expect(allowed).toBe(true);
  });

  it("denies a non-owner who isn't an employer", async () => {
    const supabase = fakeSupabase({ jobs: [], match: null });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "emp-2", role: "employee" }, "emp-1/resume.pdf");
    expect(allowed).toBe(false);
  });

  it("denies an employer with no jobs at all", async () => {
    const supabase = fakeSupabase({ jobs: [], match: null });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "employer-1", role: "employer" }, "emp-1/resume.pdf");
    expect(allowed).toBe(false);
  });

  it("denies an employer with jobs but no match with this candidate", async () => {
    const supabase = fakeSupabase({ jobs: [{ id: "job-1" }], match: null });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "employer-1", role: "employer" }, "emp-1/resume.pdf");
    expect(allowed).toBe(false);
  });

  it("allows an employer with a real match with this candidate on one of their own jobs", async () => {
    const supabase = fakeSupabase({ jobs: [{ id: "job-1" }], match: { id: "match-1" } });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "employer-1", role: "employer" }, "emp-1/resume.pdf");
    expect(allowed).toBe(true);
  });

  it("does not use a 'searchable' shortcut -- a match is required, not just employer role", async () => {
    // Same shape as "denies an employer with jobs but no match", stated
    // explicitly so this guarantee doesn't regress silently.
    const supabase = fakeSupabase({ jobs: [{ id: "job-1" }, { id: "job-2" }], match: null });
    const allowed = await authorizeMediaAccess(supabase as never, { userId: "employer-1", role: "employer" }, "emp-1/work.mp4");
    expect(allowed).toBe(false);
  });
});
