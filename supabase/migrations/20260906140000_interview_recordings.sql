-- Live interview recording: an employer can record their own call with a
-- candidate (audio only) straight from the candidate page, get a live
-- transcript, and feed that transcript into the same interview-copilot
-- suggestions as the paste-your-notes path. The recording itself is a
-- private per-match file the employer alone can play back.
--
-- Recording someone else's conversation without telling them is illegal in
-- two-party-consent states (Florida, where this company is based, is one)
-- -- the UI requires the employer to confirm they've told the candidate
-- before "Start" is enabled. This migration only handles storage/RLS; the
-- consent gate lives in the client component.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('interviews', 'interviews', false, 209715200,
    array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'])
on conflict (id) do nothing;

create policy "storage: owner manages own interview recordings"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'interviews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'interviews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- interview_recordings: separate from matches (which is service-role-
-- write-only) so an employer can record their own interview without needing
-- a service-role write path. One recording per match; re-recording replaces
-- both the row and the Storage object (upsert on both sides).
-- ---------------------------------------------------------------------------
create table public.interview_recordings (
  match_id uuid primary key references public.matches (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
comment on table public.interview_recordings is 'One audio recording per match, owned by the employer who recorded it. The employer must confirm on the client that they told the candidate before recording starts.';

create index interview_recordings_employer_id_idx on public.interview_recordings (employer_id);

alter table public.interview_recordings enable row level security;

create policy "interview_recordings: employer manages their own"
  on public.interview_recordings for all
  to authenticated
  using (employer_id = (select auth.uid()))
  with check (employer_id = (select auth.uid()));

grant select, insert, update, delete on public.interview_recordings to authenticated;
