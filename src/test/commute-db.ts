import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { CommuteData } from "@/lib/commute/model";
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const EMPLOYEE = id(1),
  OTHER_EMPLOYEE = id(2),
  MENTOR = id(100),
  OTHER_MENTOR = id(101),
  EMPLOYER = id(200),
  OTHER_EMPLOYER = id(201);
export const future = (hours: number) =>
  new Date(Date.now() + hours * 3600000).toISOString();
export async function createCommuteDb() {
  const db = new PGlite();
  // Foundation contracts needed by the additive migration. SQL and RLS run in
  // PostgreSQL; the hosted Supabase auth/REST gateway is outside this fixture.
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
    create table profiles(id uuid primary key,role text not null,full_name text,avatar_url text);
    create table employee_profiles(user_id uuid primary key references profiles(id));
    create table employee_private(user_id uuid primary key references profiles(id));
    create table employer_profiles(user_id uuid primary key references profiles(id));
    create table mentor_profiles(user_id uuid primary key references profiles(id));
    create table mentorships(id uuid primary key default gen_random_uuid(),mentor_id uuid not null references profiles(id),employee_id uuid not null references profiles(id),status text not null default 'pending' check(status in ('pending','active','ended')),consent_granted_at timestamptz,consent_revoked_at timestamptz,unique(mentor_id,employee_id));
    create table audit_log(id bigint generated always as identity primary key,actor_profile_id uuid references profiles(id),action text not null,resource_type text not null,resource_id uuid);
    alter table profiles enable row level security;
    create policy profile_read on profiles for select to authenticated using(true);
    create policy profile_update on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
    alter table employee_profiles enable row level security;
    alter table mentorships enable row level security;
    create policy pairing_read on mentorships for select to authenticated using(mentor_id=auth.uid() or employee_id=auth.uid());
    grant select on profiles,employee_profiles,mentorships to authenticated;
    grant update on profiles to authenticated;
    grant insert,update,delete on mentorships to authenticated;
  `);
  await db.exec(
    readFileSync("supabase/migrations/20260906160141_commute_mvp.sql", "utf8"),
  );
  await db.exec(
    "create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user()",
  );
  for (const [user, role, name] of [
    [EMPLOYEE, "employee", "Nick Alvarez"],
    [OTHER_EMPLOYEE, "employee", "Priya Nair"],
    [MENTOR, "mentor", "Sam Ortiz"],
    [OTHER_MENTOR, "mentor", "Other mentor"],
    [EMPLOYER, "employer", "Gulf Coast Auto"],
    [OTHER_EMPLOYER, "employer", "Other company"],
  ]) {
    await db.query("insert into profiles(id,role,full_name) values($1,$2,$3)", [
      user,
      role,
      name,
    ]);
  }
  return db;
}
export async function asUser(db: PGlite, user: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
}
export async function command(db: PGlite, value: unknown) {
  return (
    await db.query<{ id: string }>(
      "select public.commute_command($1::jsonb) as id",
      [JSON.stringify(value)],
    )
  ).rows[0].id;
}
export async function readWorkspace(db: PGlite): Promise<CommuteData> {
  const people = (
    await db.query<{
      id: string;
      name: string;
      role: "employee" | "mentor" | "employer";
    }>("select id,full_name as name,role from profiles")
  ).rows;
  const pairings = (
    await db.query<CommuteData["pairings"][number]>("select * from mentorships")
  ).rows;
  const trips = (
    await db.query<CommuteData["trips"][number]>(
      "select * from commute_requests order by arrive_by",
    )
  ).rows;
  return {
    people,
    pairings,
    trips: trips.map((t) => ({
      ...t,
      arrive_by: new Date(t.arrive_by).toISOString(),
      pickup_at: t.pickup_at ? new Date(t.pickup_at).toISOString() : null,
    })),
  };
}
