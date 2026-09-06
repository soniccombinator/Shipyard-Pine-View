# Team handoff: commute MVP

Review PR #1 in soniccombinator/Shipyard-Pine-View. The source branch is `phase-0-2-backend` in `riyadoshi014-commits/Shipyard-Pine-View`, rebased onto team main `48b94e2`. The prior branch tip is backed up locally at `backup/phase-0-2-before-main-20260906`.

The final mentor MVP is intentionally small: mentor invitation + employee acceptance, A-to-B commute requests, a mentor/employer ride plan, employee confirmation and completion. The broad sample dashboard, goals, notes and progress UI were removed. Existing Phase 0/2 APIs are retained from earlier work.

A teammate with write access can review and merge PR #1 using their own GitHub credentials. Do not force-push main. If you had the old branch checked out, preserve local work and fetch into a fresh checkout because the requested rebase changed its history.

Read `DASHBOARD_AUDIT.md` and `TEST_REPORT.md`. The configured Supabase project is missing the required schema. Initialize a staging project using `DATABASE_SETUP.md`, including `20260906160141_commute_mvp.sql`, then run the three-account website test in `INTERNAL_WEBSITE_TESTING.md`. This source handoff has not changed the live database or deployed the app.

Do not commit .env.local, credentials or database connection strings. `npm test` exercises the actual server action and SQL locally without needing those credentials.
