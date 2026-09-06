-- Phase 0 platform services and Phase 2 mentor workflows.
-- Extends the shared schema without replacing the product team's foundation.

alter table public.mentorships
  add column if not exists consent_granted_at timestamptz,
  add column if not exists consent_revoked_at timestamptz,
  add column if not exists delegated_publish boolean not null default false;

update public.mentorships
set consent_granted_at = coalesce(consent_granted_at, updated_at, now())
where status = 'active';

-- Mentors submit separate drafts; they never overwrite an employee's own words.
drop policy if exists "employee_profiles: active mentor can update" on public.employee_profiles;

create table public.skill_taxonomy (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  label text not null,
  aliases text[] not null default '{}',
  active boolean not null default true
);

create table public.accommodation_taxonomy (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  label text not null,
  description text,
  active boolean not null default true
);

create table public.ability_claims (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  ability_id uuid not null references public.skill_taxonomy(id),
  source text not null check (source in ('employee','mentor','ai')),
  claim_text text,
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, ability_id, source)
);
create index ability_claims_employee_idx on public.ability_claims(employee_id);

create table public.endorsements (
  id uuid primary key default gen_random_uuid(),
  ability_claim_id uuid not null references public.ability_claims(id) on delete cascade,
  mentor_profile_id uuid not null references public.profiles(id),
  observation text not null check (length(observation) between 10 and 2000),
  support_level text not null check (support_level in ('independent','light_support','regular_support')),
  status text not null default 'draft' check (status in ('draft','confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ability_claim_id, mentor_profile_id)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  ability_claim_id uuid references public.ability_claims(id) on delete set null,
  storage_path text not null,
  media_type text not null check (media_type in ('audio','video','image','document')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  flagged_reason text,
  created_at timestamptz not null default now()
);

create table public.captions (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null unique references public.evidence(id) on delete cascade,
  generated_text text not null,
  reviewed_text text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  reviewed_by_profile_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (moderation_status = 'pending' or reviewed_at is not null)
);

create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('ability','evidence','caption')),
  resource_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text,
  assigned_mentor_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (kind, resource_id)
);
create index moderation_pending_idx on public.moderation_queue(created_at) where status = 'pending';

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'applied' check (status in ('draft','applied','interviewing','offered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, job_id)
);

create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index background_jobs_claim_idx on public.background_jobs(available_at, created_at) where status = 'pending';

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('sms','email')),
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_resource_idx on public.audit_log(resource_type, resource_id, created_at desc);

create table public.usage_events (
  id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}',
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create table public.model_usage (
  id bigint generated always as identity primary key,
  request_id text not null unique,
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  cost_usd numeric(12,6) not null check (cost_usd >= 0),
  degraded boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_audit_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_log_immutable before update or delete on public.audit_log for each row execute function public.prevent_audit_mutation();

create or replace function public.claim_background_jobs(max_jobs integer default 10)
returns setof public.background_jobs
language plpgsql security definer set search_path = public as $$
begin
  update public.background_jobs set status = 'pending', locked_at = null,
    available_at = now(), last_error = 'Recovered after a worker timeout.'
  where status = 'running' and locked_at < now() - interval '10 minutes';

  return query
  update public.background_jobs j set status = 'running', locked_at = now(), attempts = attempts + 1
  where j.id in (
    select id from public.background_jobs
    where status = 'pending' and available_at <= now()
    order by available_at, created_at
    for update skip locked limit least(greatest(max_jobs, 1), 25)
  ) returning j.*;
end $$;
revoke all on function public.claim_background_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_background_jobs(integer) to service_role;

create or replace function public.reseed_demo()
returns table(employees integer, employers integer, jobs integer)
language plpgsql security definer set search_path = public as $$
begin
  delete from public.moderation_queue;
  delete from public.captions;
  delete from public.evidence;
  delete from public.endorsements;
  delete from public.ability_claims;
  delete from public.applications;
  insert into public.applications(employee_id, job_id, status)
    select employee_id, job_id, 'applied' from public.matches on conflict do nothing;
  return query select
    (select count(*)::integer from public.profiles where role = 'employee'),
    (select count(*)::integer from public.profiles where role = 'employer'),
    (select count(*)::integer from public.jobs);
end $$;
revoke all on function public.reseed_demo() from public, anon, authenticated;
grant execute on function public.reseed_demo() to service_role;

alter table public.skill_taxonomy enable row level security;
alter table public.accommodation_taxonomy enable row level security;
alter table public.ability_claims enable row level security;
alter table public.endorsements enable row level security;
alter table public.evidence enable row level security;
alter table public.captions enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.applications enable row level security;
alter table public.background_jobs enable row level security;
alter table public.communications enable row level security;
alter table public.audit_log enable row level security;
alter table public.usage_events enable row level security;
alter table public.model_usage enable row level security;

create policy "taxonomy: everyone can read active" on public.skill_taxonomy for select to anon, authenticated using (active);
create policy "accommodation taxonomy: everyone can read active" on public.accommodation_taxonomy for select to anon, authenticated using (active);
create policy "ability claims: employee owns rows" on public.ability_claims for all to authenticated using (employee_id = (select auth.uid())) with check (employee_id = (select auth.uid()) and created_by_profile_id = (select auth.uid()));
create policy "ability claims: mentors read assigned" on public.ability_claims for select to authenticated using (exists (select 1 from public.mentorships m where m.mentor_id = (select auth.uid()) and m.employee_id = ability_claims.employee_id and m.status = 'active' and m.consent_granted_at is not null and m.consent_revoked_at is null));
create policy "ability claims: employers read published" on public.ability_claims for select to authenticated using (publication_status = 'published' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'employer'));
create policy "endorsements: related people read" on public.endorsements for select to authenticated using (mentor_profile_id = (select auth.uid()) or exists (select 1 from public.ability_claims a where a.id = endorsements.ability_claim_id and a.employee_id = (select auth.uid())));
create policy "evidence: employee owns rows" on public.evidence for all to authenticated using (employee_id = (select auth.uid())) with check (employee_id = (select auth.uid()));
create policy "captions: employee reads own" on public.captions for select to authenticated using (exists (select 1 from public.evidence e where e.id = captions.evidence_id and e.employee_id = (select auth.uid())));
create policy "applications: employee reads own" on public.applications for select to authenticated using (employee_id = (select auth.uid()));

grant select on public.skill_taxonomy, public.accommodation_taxonomy to anon, authenticated;
grant select, insert, update on public.ability_claims, public.endorsements, public.evidence, public.captions, public.applications to authenticated;


with source(category, labels) as (values
  ('Grocery and retail stocking', array['Stock shelves','Face products on shelves','Rotate stock by date','Read product labels','Use a pricing labeler','Build a product display','Collect shopping carts','Bag groceries','Complete an inventory count','Prepare online pickup orders']),
  ('Food service and prep', array['Wash produce','Measure ingredients','Follow a recipe','Prepare cold foods','Portion food consistently','Operate a commercial dishwasher','Set up a food station','Store food safely','Clear dining tables','Follow allergen procedures']),
  ('Cafe and coffee counter', array['Greet cafe guests','Take a drink order','Prepare brewed coffee','Prepare tea','Use a point of sale register','Restock cups and supplies','Clean a coffee station','Label prepared orders','Deliver counter orders','Close a cafe station']),
  ('Hospitality', array['Make a guest bed','Fold towels and linens','Restock guest supplies','Prepare a meeting room','Greet hotel guests','Direct guests to locations','Carry guest luggage safely','Inspect a guest room','Record a maintenance request','Set up an event space']),
  ('Cleaning and sanitation', array['Sweep floors','Mop floors','Vacuum carpet','Clean windows','Sanitize high touch surfaces','Clean a restroom','Empty waste bins','Sort recycling','Use cleaning chemicals safely','Complete a cleaning checklist']),
  ('Groundskeeping and horticulture', array['Water plants','Pull weeds','Plant flowers','Spread mulch','Rake leaves','Mow a lawn','Trim small shrubs','Collect yard debris','Use hand gardening tools','Inspect plants for damage']),
  ('Warehouse and distribution', array['Pick items from a list','Pack a shipment','Apply shipping labels','Sort incoming packages','Load a cart safely','Use a hand truck','Count warehouse inventory','Inspect items for damage','Break down cardboard','Keep aisles clear']),
  ('Customer greeting and service', array['Welcome a customer','Offer directions','Answer a routine question','Find a staff member to help','Listen to a customer request','Explain store hours','Hand out information','Manage a waiting line','Thank a customer','Escalate a customer concern']),
  ('Cash handling', array['Count bills and coins','Make change','Open a cash drawer','Close a cash drawer','Match a receipt to a purchase','Process a card payment','Issue a receipt','Balance a register','Identify common bills','Follow cash security procedures']),
  ('Office and clerical', array['File paper records','Scan a document','Enter data accurately','Answer a business phone','Route a phone call','Prepare outgoing mail','Sort incoming mail','Schedule an appointment','Copy and collate documents','Shred confidential documents']),
  ('Digital workplace', array['Sign in to a work computer','Use business email','Join a video meeting','Enter information in a form','Create a basic document','Update a spreadsheet','Use a team chat','Search for a digital file','Follow a digital checklist','Protect account passwords']),
  ('Transportation and delivery', array['Read a bus schedule','Plan a work commute','Confirm a delivery address','Follow a delivery route','Load delivery items','Unload delivery items','Record a completed delivery','Contact a supervisor about delays','Use rideshare safely','Follow pedestrian safety rules']),
  ('Teamwork', array['Ask a teammate for help','Offer help to a teammate','Share task updates','Take turns with shared equipment','Participate in a team huddle','Accept constructive feedback','Resolve a small disagreement','Complete an assigned team role','Recognize a teammate contribution','Support a team deadline']),
  ('Workplace safety', array['Wear required safety equipment','Read a safety sign','Report a workplace hazard','Follow an evacuation route','Lift an item safely','Use a step stool safely','Respond to a spill','Follow handwashing procedures','Store tools safely','Ask before using unfamiliar equipment']),
  ('Workplace communication', array['Follow a one-step direction','Follow a multi-step direction','Ask a clarifying question','Give a verbal status update','Write a short work message','Tell a supervisor about a problem','Confirm task completion','Use respectful workplace language','Request a break','Describe an accommodation need'])
), expanded as (
  select category, label from source cross join lateral unnest(labels) as label
)
insert into public.skill_taxonomy(slug, category, label, aliases)
select regexp_replace(lower(label), '[^a-z0-9]+', '-', 'g'), category, label,
       array[lower(label), replace(lower(label), ' and ', ' & ')]
from expanded
on conflict (slug) do update set category = excluded.category, label = excluded.label, aliases = excluded.aliases, active = true;

insert into public.accommodation_taxonomy(slug, category, label, description) values
('written-instructions','Communication','Written instructions','Provide important directions in writing.'),
('plain-language','Communication','Plain language','Use direct words and short sentences.'),
('visual-instructions','Communication','Visual instructions','Use pictures, diagrams, or demonstrations.'),
('repeat-instructions','Communication','Repeated instructions','Repeat or restate directions when needed.'),
('check-for-understanding','Communication','Check for understanding','Ask the person to explain the next step in their own way.'),
('communication-device','Communication','Communication device','Allow use of an augmentative or alternative communication device.'),
('predictable-schedule','Scheduling','Predictable schedule','Keep workdays and hours consistent where possible.'),
('advance-schedule-notice','Scheduling','Advance schedule notice','Provide schedule changes with advance notice.'),
('flexible-start-time','Scheduling','Flexible start time','Allow an agreed range for arrival time.'),
('part-time-hours','Scheduling','Part-time hours','Use a reduced weekly schedule.'),
('extra-breaks','Scheduling','Additional breaks','Provide additional short breaks.'),
('medical-appointment-flexibility','Scheduling','Appointment flexibility','Allow time for disability-related appointments.'),
('quiet-workspace','Environment','Quiet workspace','Reduce avoidable noise and interruptions.'),
('reduced-lighting','Environment','Reduced lighting','Adjust or reduce harsh lighting.'),
('headphones','Environment','Noise-reducing headphones','Allow hearing protection or noise-reducing headphones.'),
('temperature-adjustment','Environment','Temperature adjustment','Adjust temperature or allow personal temperature supports.'),
('fragrance-reduction','Environment','Fragrance reduction','Reduce scented products in the work area.'),
('designated-calm-space','Environment','Designated calm space','Provide a place to briefly regulate away from activity.'),
('seated-work','Physical access','Seated work option','Allow tasks to be completed while seated.'),
('accessible-workstation','Physical access','Accessible workstation','Provide a workstation that supports mobility access.'),
('lifting-limit','Physical access','Adjusted lifting requirement','Change lifting weight or frequency.'),
('mobility-device-access','Physical access','Mobility device access','Keep routes and work areas accessible to mobility devices.'),
('ergonomic-equipment','Physical access','Ergonomic equipment','Provide adapted seating, keyboard, tools, or supports.'),
('job-coach','Task support','Job coach support','Allow an approved coach to support learning and transitions.'),
('task-checklist','Task support','Task checklist','Provide a step-by-step checklist.'),
('task-demonstration','Task support','Task demonstration','Demonstrate a task before asking for independent completion.'),
('extra-training-time','Task support','Additional training time','Allow more time and repetition during training.'),
('one-task-at-a-time','Task support','One task at a time','Give one clear priority before adding another.'),
('reminder-tools','Task support','Reminder tools','Allow timers, calendars, or reminder applications.'),
('modified-productivity-target','Task support','Adjusted productivity target','Use an individualized pace or production target.')
on conflict (slug) do update set category = excluded.category, label = excluded.label, description = excluded.description, active = true;



select public.reseed_demo();
