-- =====================================================================
-- BoardroomAI — one-shot bootstrap for a project that already has a
-- `profiles` table, from either schema this app has shipped.
--
-- On a fresh project this is the only file you need before
-- 202607290003_research_and_verification.sql — it supersedes both
-- 202607260001_initial_schema.sql and 202607260002_workspace_data.sql.
-- Running it *after* those two is also fine, and is the case it is most
-- often needed for: they create `reports` and `votes` without the
-- analysis columns, and this is what adds them.
--
-- Why a consolidated file instead of the three originals:
--
--   `profiles` may have been created either by a standalone auth script
--   (`full_name` / `provider`) or by 202607260001_initial_schema
--   (`display_name` / `title` / `workspace_name`). Both schemas define
--   `handle_new_user()`, so applying either one's migration on top of the
--   other replaces a working signup trigger with one that inserts a
--   column that does not exist — breaking signup for every new user.
--
--   This file reconciles the two: it adds every column both sides expect,
--   backfills across them, and installs a trigger that satisfies BOTH.
--   Nothing is dropped and no existing column is touched.
--
-- The editor runs this as a single transaction, so any error anywhere
-- rolls back the whole file, including the report columns in section 3.
-- If a statement fails, nothing was applied — fix it and re-run.
--
-- Safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Reconcile `profiles` — additive only
--
-- Two different schemas have created this table, and which one a project
-- started from is not knowable from here:
--
--   the standalone auth script   → full_name, provider
--   202607260001_initial_schema  → display_name, title, workspace_name
--
-- The backfill and the signup trigger below both reference columns from
-- *both* sides, so every one of them is added first. Skipping this is
-- what made an earlier version of this file abort with
-- `column "full_name" does not exist` on a database that had taken the
-- initial schema — and because the editor runs the file in one
-- transaction, the abort rolled back the report columns in section 3 too,
-- which are the whole point of running it.
--
-- Adding both sets is also what lets the trigger below stay a single
-- static insert instead of dynamic SQL. Nothing is dropped and no
-- existing column is touched.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name   text,
  add column if not exists title          text,
  add column if not exists workspace_name text,
  add column if not exists full_name      text,
  add column if not exists provider       text,
  add column if not exists email          text,
  add column if not exists avatar_url     text;

-- Carry the name across so existing users are not blank in the UI,
-- whichever side of the split it was stored on. On a column that was just
-- added by the statement above, every value is null and this is a no-op.
update public.profiles
   set display_name = full_name
 where display_name is null
   and full_name is not null;

update public.profiles
   set full_name = display_name
 where full_name is null
   and display_name is not null;


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
-- `profiles` is included because section 7 verifies it and because a
-- project that came from the standalone auth script may never have had it
-- enabled — which leaves every user's profile readable by any holder of
-- the anon key. On a database from 202607260001 this is already the case
-- and both statements are no-ops.
alter table public.profiles           enable row level security;
alter table public.meetings           enable row level security;
alter table public.meeting_executives enable row level security;
alter table public.messages           enable row level security;
alter table public.votes              enable row level security;
alter table public.reports            enable row level security;
alter table public.workspace_data     enable row level security;
alter table public.activity_events    enable row level security;

drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

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
