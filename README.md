# ConnectAble

Inclusive-hiring platform for [Inclusion Revolution](https://TheInclusionRevolution.org).
Connects job seekers with intellectual and developmental disabilities to
employers who can support them, with mentors as the bridge. The **Ability
Passport** is the shareable profile card inside it (QR / NFC).

## Stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Auth, Postgres + RLS, Storage) · a conversational voice guide ·
Claude API (resume parsing) · Vercel.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in keys as they become available
npm run dev                  # http://localhost:3000
npm test
npm run lint
npm run typecheck
```

The frontend runs without any keys, using sample content. Supabase keys
switch auth and data on; the guide keys switch the voice conversation on.

## Where things live

```
src/app/                 routes: landing, auth, onboarding, app screens, public Passport
src/app/api/             agent session and matching endpoints
src/components/          UI (shadcn primitives in ui/)
src/lib/                 domain types, match scorer, Supabase clients, sample content
supabase/migrations/     schema, RLS, storage buckets
docs/                    kickoff notes and design spec
```

Phase 0 operations and Phase 2 mentor APIs live under `src/lib/backend/` and
`src/app/api/{admin,coach,cron,moderation,webhooks}`. See
`docs/BACKEND_ARCHITECTURE.md`, `docs/DATABASE_SETUP.md`, and
`docs/INTERNAL_WEBSITE_TESTING.md` for the design, database setup, and internal
acceptance flow.

```bash
npm run db:migrate       # requires DATABASE_URL
npm run seed             # requires .env.local and the Phase 0/2 migration
npm run test:smoke       # production HTTP checks
npm run test:stress      # 6,000 concurrent-request checks
```

## Language rules for all UI copy

- **Accommodations** for a need. **Ability / abilities** for a skillset.
- Plain language, short sentences, one task per screen.
- No blue in the palette; tokens live in `src/app/globals.css`.

## Deploy

`vercel deploy --prod --yes` from the repo root (project `connectable`).
