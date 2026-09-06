# Commute MVP audit

September 6, 2026. Rebased onto team main `48b94e2`. Scope: one working path from mentor pairing to an agreed commute.

## What ships

1. A signed-in mentor invites an existing employee. The employee accepts or declines. Commute details stay hidden from the mentor until acceptance.
2. The employee requests a trip with pickup location, destination and arrival time. Sharing with an employer is optional and explicit.
3. A paired mentor or the selected employer proposes a ride plan and pickup time. The plan says who drives, whose car and where to meet.
4. The employee confirms the exact version of the plan. The mentor and selected employer can see the confirmed arrangement.
5. The employee, paired mentor or actual arranger marks the trip completed. A trip can also be cancelled. Finished trips remain available in history.

The mentor dashboard shows pairing and commute requests only. Goals, abilities, applications, progress percentages, notes, generic task categories and the browser-only five-mentee dashboard were removed from this change. Existing Phase 0/2 backend APIs remain in the repository for the teams that own those features.

## Integration and permission checks

| Finding | Result |
| --- | --- |
| Mentor pairing had no usable frontend and direct table updates could rewrite consent/identity. | Invitation, employee acceptance and ending a pairing use a session-authorized SQL command. General browser writes to mentorships are revoked. |
| No shared commute workflow connected the dashboards. | Employee and employer dashboards link to `/app/commutes`; mentors use `/app/mentor`. All use the same component, server action and database records. |
| No persistent trip or ride agreement. | One new table, `commute_requests`, records A-to-B trips, one current plan, arranger, pickup time and status. |
| A candidate might confirm a plan after someone edited it. | Each trip has a version. Stale commands fail rather than confirming a different plan. |
| Mentor/employer access could outlive consent/sharing. | Row-level security scopes reads. Ending a pairing removes access and withdraws that mentor's upcoming plan. Removing employer sharing withdraws that employer's upcoming plan. |
| A mentor could confirm on the employee's behalf. | Only the employee can confirm. The database enforces this, regardless of which buttons appear. |
| Signup metadata/profile edits could self-assign mentor access. | Mentor accounts require trusted app metadata or the existing admin invitation route. General profile role updates are revoked. |
| Employer totals counted the same person across multiple jobs. | The label now says Candidate matches. Existing main job posting and onboarding behavior is preserved. |

## Source map

- `src/components/commute-workspace.tsx`: pairing and commute UI.
- `src/lib/commute/model.ts`: input validation and shared types.
- `src/lib/commute/actions.ts`: authentication, command execution and refresh.
- `src/lib/commute/data.ts`: user-scoped loading with RLS.
- `supabase/migrations/20260906160141_commute_mvp.sql`: one new table and atomic authorized commands, using existing profiles and mentorships.
- `src/lib/commute/database.test.ts`: real PostgreSQL authorization and lifecycle tests.
- `src/components/commute-workspace.test.tsx`: UI through the actual server action to PostgreSQL, with only Supabase's auth/REST transport replaced by a local test session.

## Live status and limits

The configured Supabase project returned `PGRST205` for profiles, mentorships and commute_requests on September 6. Its required schema is not available. No remote database changes, deployment, account creation, emails or SMS were performed in this source-only update. The old sample page now points to the actual signed-in workspace instead of simulating success.

The local integration test covers the complete workflow and reloads records from PostgreSQL. It does not prove that the hosted Supabase auth/REST configuration is ready. Initialize the database and run the staging acceptance test in `INTERNAL_WEBSITE_TESTING.md` before using real accounts.

This MVP records arrangements. Driver/car availability is agreed by the people involved; it does not book cars, process payment, send notifications, track vehicles or provide a chat system. Refresh shows another person's latest changes. Separate authenticated browser sessions are needed for real multi-role testing.

Repository-wide lint has five pre-existing errors in `src/components/agent/text-onboarding.tsx` and `src/lib/use-form-draft.ts`, which do not differ from main. Changed MVP files pass lint. See `TEST_REPORT.md` for the final test counts and limits.
