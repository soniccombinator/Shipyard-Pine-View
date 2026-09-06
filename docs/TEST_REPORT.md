# Commute MVP test report

September 6, 2026. Final scope is mentor pairing and commute coordination.

## Final source checks

- 115 tests passed in 27 files.
- Eight embedded PostgreSQL tests execute the new migration and its RLS/commands: pairing consent, mentor and employer ride plans, employee confirmation, unrelated-user denial, role protection, stale-version rejection, revocation, sharing changes, trip times and audit persistence.
- Two UI integration tests use the real CommuteWorkspace and saveCommute server action against PostgreSQL. Only Supabase's auth/REST transport is replaced by local authenticated test sessions. The full pairing/request/propose/confirm/complete path passes, including a fresh database read after remounting the UI. Invalid arrival times show an error without inserting a trip.
- Next.js production build and TypeScript passed.
- Changed commute, navigation, dashboard integration and test files passed ESLint. Repository-wide lint still reports five existing main-branch errors in text-onboarding.tsx and use-form-draft.ts; those files were not changed.
- 25 production HTTP smoke checks passed for public pages, commute/mentor login boundaries and selected Phase 0/2 API authorization/validation boundaries.

## Local guard load

The existing health/authentication-guard load suite ran in this session with 6,000 requests and zero unexpected-status/transport failures. Those guards did not change during the subsequent MVP reduction.

| Workload | Requests | Concurrency | Requests/sec | p95 | p99 | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Health | 3,000 | 100 | 291.2 | 461.9 ms | 657.7 ms | 0 |
| Phase 0/2 authentication guards | 3,000 | 75 | 255.6 | 345.9 ms | 465.1 ms | 0 |

These results do not measure authenticated database write capacity, external providers or production latency. They are not a claim that every product feature has been stress tested.

## Hosted status

A read-only check against the configured Supabase project returned HTTP 404 / PGRST205 for profiles, mentorships and commute_requests. The required schema is not available. No remote migration, deployment, real account creation or message delivery was performed.

The local UI/action/PostgreSQL path works. Hosted end-to-end acceptance remains pending database initialization and testing with separate real staging accounts, as described in INTERNAL_WEBSITE_TESTING.md. The previous browser-only sample dashboard has been removed rather than used as evidence of persistence.
