-- =====================================================================
-- BoardroomAI — one-shot bootstrap for a project that already has a
-- `profiles` table from a different schema.
--
-- Run this ONE file. Do not run 202607260001, 202607260002 or
-- 202607290001 alongside it — this supersedes all three.
--
-- Why a consolidated file instead of the three originals:
--
--   This project's `profiles` table was created by a standalone auth
--   script with `full_name` / `provider` columns. The app reads
--   `display_name`, `title` and `workspace_name`. Worse, both schemas
--   define `handle_new_user()`, so running the original migration would
--   `create or replace` the working signup trigger with one that inserts
--   a `display_name` column that does not exist yet — breaking signup
--   for every new user.
--
--   This file adds the missing columns first, backfills them from the
--   existing data, and installs a trigger that satisfies BOTH schemas.
--   Nothing is dropped and no existing column is touched.
--
-- Safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Reconcile `profiles` — additive only
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name   text,
  add column if not exists title          text,
  add column if not exists workspace_name text;

-- Carry the name across so existing users are not blank in the UI.
update public.profiles
   set display_name = full_name
 where display_name is null
   and full_name is not null;


-- ---------------------------------------------------------------------
-- 2. Signup trigger that feeds both schemas
--
-- Writes `full_name`/`provider` (the original script's columns) AND
-- `display_name` (what the app reads), so neither side goes null.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, email, full_name, display_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    resolved_name,
    resolved_name,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 3. Core session tables
--
-- The vote and report tables are created with the richer columns already
-- present, so there is no second `alter` step to forget.
-- ---------------------------------------------------------------------
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  startup_name text not null,
  one_liner    text not null,
  industry     text not null,
  stage        text not null,
  pitch        text not null,
  status       text not null default 'scheduled'
               check (status in ('scheduled', 'in-progress', 'completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.meeting_executives (
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  executive_id text not null,
  seat_index   smallint not null,
  primary key (meeting_id, executive_id),
  unique (meeting_id, seat_index)
);

-- `id` is text, not uuid: the orchestrator mints ids client-side as
-- `msg_<uuid>` so an optimistic founder message can be reconciled with
-- its persisted row after a reload.
create table if not exists public.messages (
  id           text primary key,
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  speaker_id   text not null,
  speaker_name text not null,
  role         text not null,
  message      text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.votes (
  meeting_id         uuid not null references public.meetings(id) on delete cascade,
  executive_id       text not null,
  vote               text not null check (vote in ('yes', 'no', 'conditional')),
  rationale          text,
  confidence         integer check (confidence is null or (confidence between 0 and 100)),
  biggest_risk       text,
  biggest_strength   text,
  required_milestone text,
  cheque_size        text,
  return_horizon     text,
  primary key (meeting_id, executive_id)
);

create table if not exists public.reports (
  id                       uuid primary key default gen_random_uuid(),
  meeting_id               uuid unique references public.meetings(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,
  startup_name             text not null,
  one_liner                text not null,
  industry                 text not null,
  investment_score         integer not null check (investment_score between 0 and 100),
  verdict                  text not null check (verdict in ('Strong buy', 'Conditional', 'Pass')),
  executive_summary        text not null,
  swot                     jsonb not null default '[]'::jsonb,
  dimensions               jsonb not null default '[]'::jsonb,
  risks                    jsonb not null default '[]'::jsonb,
  financials               jsonb not null default '[]'::jsonb,
  investment_readiness     integer check (investment_readiness is null or (investment_readiness between 0 and 100)),
  confidence               jsonb,
  consensus                jsonb not null default '[]'::jsonb,
  disagreements            jsonb not null default '[]'::jsonb,
  most_convincing_argument jsonb,
  weakest_founder_answer   jsonb,
  risk_timeline            jsonb not null default '[]'::jsonb,
  next_steps               jsonb not null default '[]'::jsonb,
  roadmap                  jsonb not null default '[]'::jsonb,
  sources                  jsonb not null default '[]'::jsonb,
  generated_at             timestamptz not null default now()
);

-- If `votes` or `reports` somehow already existed without the richer
-- columns, add them. No-ops on a fresh create above.
alter table public.votes
  add column if not exists rationale          text,
  add column if not exists confidence         integer,
  add column if not exists biggest_risk       text,
  add column if not exists biggest_strength   text,
  add column if not exists required_milestone text,
  add column if not exists cheque_size        text,
  add column if not exists return_horizon     text;

alter table public.reports
  add column if not exists investment_readiness     integer,
  add column if not exists confidence               jsonb,
  add column if not exists consensus                jsonb not null default '[]'::jsonb,
  add column if not exists disagreements            jsonb not null default '[]'::jsonb,
  add column if not exists most_convincing_argument jsonb,
  add column if not exists weakest_founder_answer   jsonb,
  add column if not exists risk_timeline            jsonb not null default '[]'::jsonb,
  add column if not exists next_steps               jsonb not null default '[]'::jsonb,
  add column if not exists roadmap                  jsonb not null default '[]'::jsonb,
  add column if not exists sources                  jsonb not null default '[]'::jsonb;


-- ---------------------------------------------------------------------
-- 4. Workspace + activity feed
-- ---------------------------------------------------------------------
create table if not exists public.workspace_data (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  kanban             jsonb not null default '[]'::jsonb,
  financials         jsonb not null default '{}'::jsonb,
  market_research    jsonb not null default '{}'::jsonb,
  startup_health     jsonb not null default '{}'::jsonb,
  prd_document       jsonb not null default '[]'::jsonb,
  pitch_deck         jsonb not null default '[]'::jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  plan_name          text not null default 'Founder',
  plan_price         text not null default '$49/mo',
  seats_used         smallint not null default 1,
  seats_total        smallint not null default 1,
  updated_at         timestamptz not null default now()
);

create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text not null,
  tone        text not null default 'brass'
              check (tone in ('brass', 'signal', 'success', 'warning')),
  change_type text not null default 'Report'
              check (change_type in ('Report', 'Pitch deck', 'PRD', 'Financials')),
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------
create index if not exists meetings_user_created_idx    on public.meetings (user_id, created_at desc);
create index if not exists messages_meeting_created_idx on public.messages (meeting_id, created_at);
create index if not exists activity_user_created_idx    on public.activity_events (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- 6. Row Level Security
--
-- Child tables inherit ownership through an `exists` subquery back to
-- `meetings`, so there is one source of truth for who owns a session.
-- Without these policies any anon key holder could read every meeting.
-- ---------------------------------------------------------------------
alter table public.meetings           enable row level security;
alter table public.meeting_executives enable row level security;
alter table public.messages           enable row level security;
alter table public.votes              enable row level security;
alter table public.reports            enable row level security;
alter table public.workspace_data     enable row level security;
alter table public.activity_events    enable row level security;

drop policy if exists "Users manage their meetings" on public.meetings;
create policy "Users manage their meetings" on public.meetings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users access seats for own meetings" on public.meeting_executives;
create policy "Users access seats for own meetings" on public.meeting_executives
  for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));

drop policy if exists "Users access messages for own meetings" on public.messages;
create policy "Users access messages for own meetings" on public.messages
  for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));

drop policy if exists "Users access votes for own meetings" on public.votes;
create policy "Users access votes for own meetings" on public.votes
  for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));

drop policy if exists "Users access their reports" on public.reports;
create policy "Users access their reports" on public.reports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their workspace data" on public.workspace_data;
create policy "Users manage their workspace data" on public.workspace_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their activity events" on public.activity_events;
create policy "Users manage their activity events" on public.activity_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 7. Verification — should return 8 rows, all with rowsecurity = true
-- ---------------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'meetings', 'meeting_executives', 'messages',
                    'votes', 'reports', 'workspace_data', 'activity_events')
order by tablename;
