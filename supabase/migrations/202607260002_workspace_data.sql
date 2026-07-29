-- Workspace-scoped data that replaces frontend mock datasets.
-- Run after 202607260001_initial_schema.sql.

alter table public.profiles
  add column if not exists email text,
  add column if not exists title text,
  add column if not exists workspace_name text;

create table if not exists public.workspace_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kanban jsonb not null default '[]'::jsonb,
  financials jsonb not null default '{}'::jsonb,
  market_research jsonb not null default '{}'::jsonb,
  startup_health jsonb not null default '{}'::jsonb,
  prd_document jsonb not null default '[]'::jsonb,
  pitch_deck jsonb not null default '[]'::jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  plan_name text not null default 'Founder',
  plan_price text not null default '$49/mo',
  seats_used smallint not null default 1,
  seats_total smallint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  tone text not null default 'brass' check (tone in ('brass', 'signal', 'success', 'warning')),
  change_type text not null default 'Report' check (change_type in ('Report', 'Pitch deck', 'PRD', 'Financials')),
  created_at timestamptz not null default now()
);

create table if not exists public.hackathon_leaderboard (
  id uuid primary key default gen_random_uuid(),
  rank smallint not null,
  team text not null,
  idea text not null,
  score integer not null check (score between 0 and 100),
  unique (rank)
);

create table if not exists public.hackathon_schedule (
  id uuid primary key default gen_random_uuid(),
  sort_order smallint not null,
  time_label text not null,
  title text not null,
  description text not null,
  unique (sort_order)
);

create index if not exists activity_events_user_created_idx on public.activity_events (user_id, created_at desc);

alter table public.workspace_data enable row level security;
alter table public.activity_events enable row level security;
alter table public.hackathon_leaderboard enable row level security;
alter table public.hackathon_schedule enable row level security;

create policy "Users manage their workspace data" on public.workspace_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their activity events" on public.activity_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Anyone can read hackathon leaderboard" on public.hackathon_leaderboard
  for select using (true);

create policy "Anyone can read hackathon schedule" on public.hackathon_schedule
  for select using (true);

-- Seed global hackathon demo data (idempotent).
insert into public.hackathon_leaderboard (rank, team, idea, score) values
  (1, 'Team Northbeam', 'Warehouse pick-and-pack retrofit kits', 91),
  (2, 'Team Ledgerly', 'Automated bookkeeping for creator LLCs', 87),
  (3, 'Team Hemlock', 'Inventory forecasting for grocers', 79),
  (4, 'Team Fieldnote', 'Field-service scheduling for utilities', 76),
  (5, 'Team Marrow', 'Async triage for rural clinics', 68)
on conflict (rank) do nothing;

insert into public.hackathon_schedule (sort_order, time_label, title, description) values
  (1, 'Day 1 · 9:00 AM', 'Pitches open', 'Every team submits to the board simultaneously.'),
  (2, 'Day 1 · 2:00 PM', 'Round 1 debates', 'Board convenes for each team, live.'),
  (3, 'Day 2 · 10:00 AM', 'Revisions due', 'Teams address board feedback and resubmit.'),
  (4, 'Day 2 · 4:00 PM', 'Final scores', 'Leaderboard locks and winners are announced.')
on conflict (sort_order) do nothing;
