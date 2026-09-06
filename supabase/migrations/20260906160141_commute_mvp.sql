-- One MVP: mentor pairing and an agreed commute from pickup to workplace.
create or replace function public.is_active_mentor(employee uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from mentorships m join profiles p on p.id=m.mentor_id
    where m.employee_id=employee and m.mentor_id=auth.uid() and p.role='mentor'
      and m.status='active' and m.consent_granted_at is not null and m.consent_revoked_at is null);
$$;
revoke all on function public.is_active_mentor(uuid) from public,anon;
grant execute on function public.is_active_mentor(uuid) to authenticated;

create table public.commute_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id),
  employer_id uuid references profiles(id),
  origin text not null check(length(origin) between 3 and 160),
  destination text not null check(length(destination) between 3 and 160),
  arrive_by timestamptz not null,
  status text not null default 'requested' check(status in ('requested','proposed','confirmed','completed','cancelled')),
  arranged_by uuid references profiles(id),
  plan text check(length(plan) between 10 and 1000),
  pickup_at timestamptz,
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(),
  check ((arranged_by is null and plan is null and pickup_at is null) or
    (arranged_by is not null and plan is not null and pickup_at is not null and pickup_at<=arrive_by)),
  check (status not in ('proposed','confirmed','completed') or arranged_by is not null)
);
create index commute_employee on public.commute_requests(employee_id,arrive_by);
create index commute_employer on public.commute_requests(employer_id,arrive_by);
alter table public.commute_requests enable row level security;
create policy commute_read on public.commute_requests for select to authenticated using(
  employee_id=auth.uid() or employer_id=auth.uid() or public.is_active_mentor(employee_id));
grant select on public.commute_requests to authenticated;

-- Pairing identity and consent cannot be rewritten via the general table API.
revoke insert,update,delete on public.mentorships from authenticated;

create or replace function public.commute_command(command jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  actor uuid:=auth.uid(); actor_role text; action text:=command->>'action';
  r public.commute_requests; p public.mentorships; employee uuid; employer uuid; result uuid;
  pickup timestamptz; arrival timestamptz;
begin
  select role into actor_role from profiles where id=actor;
  if actor is null or actor_role is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if action='invite' then
    employee:=(command->>'employeeId')::uuid;
    if actor_role<>'mentor' or not exists(select 1 from profiles where id=employee and role='employee') then
      raise exception 'Only a mentor can invite an employee' using errcode='42501'; end if;
    insert into mentorships(mentor_id,employee_id,status,consent_granted_at,consent_revoked_at)
      values(actor,employee,'pending',null,null)
      on conflict(mentor_id,employee_id) do update set status='pending',consent_granted_at=null,consent_revoked_at=null
      where mentorships.status='ended' returning id into result;
    if result is null then select id into result from mentorships where mentor_id=actor and employee_id=employee; end if;
  elsif action in ('accept_pairing','end_pairing') then
    select * into p from mentorships where id=(command->>'pairingId')::uuid for update;
    if p.id is null or actor not in (p.employee_id,p.mentor_id) then raise exception 'Pairing access denied' using errcode='42501'; end if;
    if action='accept_pairing' then
      if actor<>p.employee_id or p.status<>'pending' then raise exception 'Employee acceptance required' using errcode='42501'; end if;
      update mentorships set status='active',consent_granted_at=now(),consent_revoked_at=null where id=p.id;
    else
      update mentorships set status='ended',consent_revoked_at=now() where id=p.id;
      -- A former mentor must not remain responsible for an upcoming ride.
      update commute_requests set status='requested',arranged_by=null,plan=null,pickup_at=null,version=version+1
        where employee_id=p.employee_id and arranged_by=p.mentor_id and status in ('proposed','confirmed');
    end if;
    result:=p.id;
  elsif action='request' then
    if actor_role<>'employee' then raise exception 'Employee request required' using errcode='42501'; end if;
    employer:=(command->>'employerId')::uuid;
    if employer is not null and not exists(select 1 from profiles where id=employer and role='employer') then raise exception 'Invalid employer' using errcode='42501'; end if;
    arrival:=(command->>'arriveBy')::timestamptz;
    if arrival is null or arrival<=now() then raise exception 'Choose a future arrival' using errcode='22023'; end if;
    insert into commute_requests(employee_id,employer_id,origin,destination,arrive_by)
      values(actor,employer,trim(command->>'origin'),trim(command->>'destination'),arrival) returning id into result;
  else
    select * into r from commute_requests where id=(command->>'tripId')::uuid for update;
    if r.id is null or not coalesce(r.employee_id=actor or r.employer_id=actor or public.is_active_mentor(r.employee_id),false) then
      raise exception 'Trip access denied' using errcode='42501'; end if;
    if (command->>'version')::integer is distinct from r.version then raise exception 'Trip changed' using errcode='40001'; end if;
    if r.status in ('completed','cancelled') and action<>'share' then raise exception 'Trip closed' using errcode='42501'; end if;
    result:=r.id;
    if action='propose' then
      if not ((actor_role='employer' and r.employer_id is not distinct from actor) or public.is_active_mentor(r.employee_id))
        or not (r.status='requested' or (r.status='proposed' and r.arranged_by=actor)) then
        raise exception 'Cannot arrange this ride' using errcode='42501'; end if;
      pickup:=(command->>'pickupAt')::timestamptz;
      if pickup is null or pickup<=now() or pickup>r.arrive_by then raise exception 'Invalid pickup time' using errcode='22023'; end if;
      update commute_requests set arranged_by=actor,plan=trim(command->>'plan'),pickup_at=pickup,status='proposed',version=version+1 where id=r.id;
    elsif action='confirm' then
      if r.employee_id<>actor or r.status<>'proposed' then raise exception 'Employee must confirm the plan' using errcode='42501'; end if;
      if r.pickup_at<=now() then raise exception 'The pickup time has passed' using errcode='22023'; end if;
      if not (r.arranged_by is not distinct from r.employer_id or exists(select 1 from mentorships m
        where m.mentor_id=r.arranged_by and m.employee_id=r.employee_id and m.status='active' and m.consent_granted_at is not null and m.consent_revoked_at is null)) then
        raise exception 'Arranger no longer has access' using errcode='42501'; end if;
      update commute_requests set status='confirmed',version=version+1 where id=r.id;
    elsif action='complete' then
      if r.status<>'confirmed' or not (r.employee_id=actor or r.arranged_by=actor or public.is_active_mentor(r.employee_id)) then raise exception 'Confirm a plan first' using errcode='42501'; end if;
      update commute_requests set status='completed',version=version+1 where id=r.id;
    elsif action='cancel' then
      if not coalesce(r.employee_id=actor or r.arranged_by=actor or public.is_active_mentor(r.employee_id),false) then raise exception 'Cannot cancel this ride' using errcode='42501'; end if;
      update commute_requests set status='cancelled',version=version+1 where id=r.id;
    elsif action='share' then
      if actor<>r.employee_id then raise exception 'Employee controls sharing' using errcode='42501'; end if;
      employer:=(command->>'employerId')::uuid;
      if employer is not null and not exists(select 1 from profiles where id=employer and role='employer') then raise exception 'Invalid employer' using errcode='42501'; end if;
      if r.status in ('completed','cancelled') and employer is not null and employer is distinct from r.employer_id then raise exception 'Closed trips can only have sharing removed' using errcode='42501'; end if;
      if employer is distinct from r.employer_id then
        if r.arranged_by=r.employer_id and r.status in ('proposed','confirmed') then
          update commute_requests set employer_id=employer,status='requested',arranged_by=null,plan=null,pickup_at=null,version=version+1 where id=r.id;
        else update commute_requests set employer_id=employer,version=version+1 where id=r.id; end if;
      end if;
    else raise exception 'Unknown command' using errcode='22023'; end if;
  end if;
  insert into audit_log(actor_profile_id,action,resource_type,resource_id) values(actor,'commute.'||action,case when action in ('invite','accept_pairing','end_pairing') then 'mentorship' else 'commute' end,result);
  return result;
end $$;
revoke all on function public.commute_command(jsonb) from public,anon;
grant execute on function public.commute_command(jsonb) to authenticated;

drop policy if exists "employee_profiles: active mentor can read" on public.employee_profiles;
create policy "commute: mentor reads active consent" on public.employee_profiles for select to authenticated using(public.is_active_mentor(user_id));
revoke update on public.profiles from authenticated;
grant update(full_name,avatar_url) on public.profiles to authenticated;

-- Public signup metadata cannot issue a mentor account.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_role text; v_name text;
begin
  v_role:=new.raw_user_meta_data->>'role';
  if new.raw_app_meta_data->>'connectable_role'='mentor' then v_role:='mentor';
  elsif v_role is null or v_role not in ('employee','employer') then v_role:='employee'; end if;
  v_name:=coalesce(new.raw_user_meta_data->>'full_name','');
  insert into public.profiles(id,role,full_name) values(new.id,v_role,v_name);
  if v_role='employee' then
    insert into public.employee_profiles(user_id) values(new.id);
    insert into public.employee_private(user_id) values(new.id);
  elsif v_role='employer' then insert into public.employer_profiles(user_id) values(new.id);
  else insert into public.mentor_profiles(user_id) values(new.id); end if;
  return new;
end $$;
revoke execute on function private.handle_new_user() from public,anon,authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;
