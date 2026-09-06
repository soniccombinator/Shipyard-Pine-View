-- Scheduled mentor check-ins. Notifications are queued by the protected API
-- after the relationship and consent check passes.
create table public.mentor_check_ins (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  time_zone text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 180),
  location text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mentor_check_ins_mentor_schedule_idx on public.mentor_check_ins(mentor_id, starts_at) where status = 'scheduled';
create index mentor_check_ins_employee_schedule_idx on public.mentor_check_ins(employee_id, starts_at) where status = 'scheduled';

alter table public.mentor_check_ins enable row level security;

create policy "mentor check-ins: employee can read own"
  on public.mentor_check_ins for select to authenticated
  using (employee_id = (select auth.uid()));

create policy "mentor check-ins: mentor can read active consented"
  on public.mentor_check_ins for select to authenticated
  using (exists (
    select 1 from public.mentorships m
    where m.mentor_id = (select auth.uid())
      and m.employee_id = mentor_check_ins.employee_id
      and m.status = 'active'
      and m.consent_granted_at is not null
      and m.consent_revoked_at is null
  ));

grant select on public.mentor_check_ins to authenticated;
