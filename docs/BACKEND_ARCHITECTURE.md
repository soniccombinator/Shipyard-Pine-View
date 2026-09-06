# ConnectAble Backend Architecture

## Scope

This backend implements Phase 0 shared services and Phase 2 mentor services on top of the shared ConnectAble schema.

## Request flow

Authenticated mentor requests first resolve the Supabase user to a ConnectAble profile. Role validation alone does not authorize employee data. Every employee-scoped route calls the shared access service, which requires an active mentorship, a consent grant, and no revocation timestamp. Only after that check does the route use the server database client.

Mentor contributions are separate, attributable records. A mentor may suggest an ability or write an endorsement. The employee's words are not updated. Suggested and AI-extracted abilities remain drafts; employee publication is a separate action.

## Data boundaries

Browser access uses only the public Supabase URL and publishable key. Privileged routes use the server-only Supabase secret key. Row-level security exposes only the signed-in employee's own records plus public taxonomy and intended published data. Mentor access is enforced in the route layer by the relationship service, with audit records for every write.

Private credentials are loaded only through `src/lib/backend/env.ts`. Logs record identifiers, statuses, and cost totals, not credentials, message bodies, accommodations, or raw evidence.

## Background work

Requests enqueue idempotent jobs with unique deduplication keys. The cron drainer claims jobs with `FOR UPDATE SKIP LOCKED`, limits each run, and uses exponential retry delays. Five failed attempts move a job to the failed state. Incoming GHL messages return 202 after durable enqueue so webhook retries do not repeat downstream work.

Automatic captions always enter moderation. When a transcription is unavailable, the job creates a manual-review placeholder rather than inventing words. A mentor with a current employee relationship must review the original evidence before approval.

## Model use and spend

Anthropic Messages calls are logged with input tokens, output tokens, estimated cost, and degraded status. A daily ceiling blocks paid calls. Missing configuration, rate limits, network errors, and explicit degraded mode return a canned workflow-safe response so the demo continues.

## Reset and metrics

The `scripts/seed.mts` seed creates or updates 12 fictional employees, 8 fictional employers, 25 jobs, mentorships, and computed matches. The `reseed_demo` database function resets Phase 0/2 operational records from the current demo data. Admin endpoints expose reset and aggregated usage metrics behind a dedicated bearer secret.
