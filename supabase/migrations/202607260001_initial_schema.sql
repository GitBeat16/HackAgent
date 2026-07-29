-- Run with `supabase db push` (or paste into the Supabase SQL editor).
-- OAuth identities live in auth.users; application rows use auth.uid().
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  title text,
  workspace_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  startup_name text not null,
  one_liner text not null,
  industry text not null,
  stage text not null,
  pitch text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in-progress', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.meeting_executives (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  executive_id text not null,
  seat_index smallint not null,
  primary key (meeting_id, executive_id),
  unique (meeting_id, seat_index)
);

create table if not exists public.messages (
  id text primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  speaker_id text not null,
  speaker_name text not null,
  role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  executive_id text not null,
  vote text not null check (vote in ('yes', 'no', 'conditional')),
  primary key (meeting_id, executive_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid unique references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  startup_name text not null,
  one_liner text not null,
  industry text not null,
  investment_score integer not null check (investment_score between 0 and 100),
  verdict text not null check (verdict in ('Strong buy', 'Conditional', 'Pass')),
  executive_summary text not null,
  swot jsonb not null default '[]'::jsonb,
  dimensions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  financials jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists meetings_user_created_idx on public.meetings (user_id, created_at desc);
create index if not exists messages_meeting_created_idx on public.messages (meeting_id, created_at);

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_executives enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;

create policy "Users manage their profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "Users manage their meetings" on public.meetings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users access seats for own meetings" on public.meeting_executives for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid())) with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));
create policy "Users access messages for own meetings" on public.messages for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid())) with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));
create policy "Users access votes for own meetings" on public.votes for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid())) with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));
create policy "Users access their reports" on public.reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
