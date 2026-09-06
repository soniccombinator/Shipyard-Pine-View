# ConnectAble database setup

Create `.env.local` from `.env.example` and set environment values locally. Keep credentials out of source control. The dashboard migration has not been applied remotely by this change.

Apply pending migrations in filename order:

1. `20260905192406_init.sql` — shared product foundation.
2. `20260905203000_sms_recruiter.sql` — main's SMS conversation tables.
3. `20260905230000_phase_0_2_backend.sql` — consent, abilities, endorsements, moderation, applications, background jobs, communications and audit.
4. `20260906000100_mentor_check_ins.sql` — scheduled mentor check-ins.
5. `20260906120000_sms_needs_human.sql` — main's SMS escalation state.
6. `20260906130000_work_media_images.sql` — main's work-media image support.
7. `20260906160141_commute_mvp.sql` — mentor pairing, one commute table, authorized ride commands and stricter mentor role assignment.

Use the team's existing Supabase migration history and standard CLI (`supabase db push`) when the project is already managed by Supabase migrations. Review pending files first; do not reapply historical migrations.

The optional `npm run db:migrate` runner instead uses `public.schema_migrations` and a process environment `DATABASE_URL` containing the session-pooler connection string. It recognizes an existing foundation only. Do not mix it with an existing Supabase CLI history without reconciling already-applied files. It does not automatically load `.env.local`. Test this setup in staging before production.

`npm run seed` creates fictional demo accounts and assignments using server credentials and trusted app metadata. The working mentor and commute pages require initialized tables and signed-in accounts. `/demo/mentor` only explains the workflow; it no longer simulates saved data.

For actual check-in email delivery, configure the server-only mail credentials and call `POST /api/cron/drain` on a schedule with `Authorization: Bearer <CRON_SECRET>`. Configure the GHL inbound webhook with its dedicated shared secret. Never use the provider integration key as a webhook secret.
