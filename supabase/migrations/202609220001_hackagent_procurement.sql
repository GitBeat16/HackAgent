-- =====================================================================
-- HackAgent Procurement Architecture Migration
-- Extends the existing database for SIH26136.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiles Extension
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'startup_founder'
    check (role in ('startup_founder', 'department_officer', 'platform_admin')),
  add column if not exists department_name text,
  add column if not exists startup_name    text,
  add column if not exists gstin           text,
  add column if not exists dpiit_number    text;

-- ---------------------------------------------------------------------
-- 2. Challenges
-- ---------------------------------------------------------------------
create table if not exists public.challenges (
  id                uuid primary key default gen_random_uuid(),
  department_id     uuid not null references auth.users(id) on delete restrict,
  title             text not null,
  description       text not null,
  domain            text not null,
  budget_inr        bigint,
  deadline          date,
  eligibility_notes text,
  status            text not null default 'draft'
                    check (status in ('draft','open','closed','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.challenges enable row level security;

drop policy if exists "Officers manage their challenges" on public.challenges;
create policy "Officers manage their challenges" on public.challenges
  for all using (department_id = auth.uid()) with check (department_id = auth.uid());

drop policy if exists "Startups view open challenges" on public.challenges;
create policy "Startups view open challenges" on public.challenges
  for select using (status = 'open');

drop policy if exists "Platform admins view all challenges" on public.challenges;
create policy "Platform admins view all challenges" on public.challenges
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  );

-- ---------------------------------------------------------------------
-- 3. Procurement Proposals
-- ---------------------------------------------------------------------
create table if not exists public.procurement_proposals (
  id                  uuid primary key default gen_random_uuid(),
  challenge_id        uuid not null references public.challenges(id) on delete restrict,
  startup_id          uuid not null references auth.users(id) on delete restrict,
  meeting_id          uuid references public.meetings(id),
  report_id           uuid references public.reports(id),
  status              text not null default 'submitted'
                      check (status in (
                        'submitted','evaluating','evaluated',
                        'approved','rejected','pilot_active','completed','archived'
                      )),
  proposal_text       text not null,
  ai_match_score      integer check (ai_match_score is null or (ai_match_score between 0 and 100)),
  officer_notes       text,
  submitted_at        timestamptz not null default now(),
  evaluated_at        timestamptz,
  decided_at          timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.procurement_proposals enable row level security;

drop policy if exists "Startups manage own proposals" on public.procurement_proposals;
create policy "Startups manage own proposals" on public.procurement_proposals
  for all using (startup_id = auth.uid()) with check (startup_id = auth.uid());

drop policy if exists "Officers view proposals for their challenges" on public.procurement_proposals;
create policy "Officers view proposals for their challenges" on public.procurement_proposals
  for select using (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.department_id = auth.uid())
  );

drop policy if exists "Officers update proposal status" on public.procurement_proposals;
create policy "Officers update proposal status" on public.procurement_proposals
  for update using (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.department_id = auth.uid())
  );

drop policy if exists "Platform admins view all proposals" on public.procurement_proposals;
create policy "Platform admins view all proposals" on public.procurement_proposals
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  );

-- ---------------------------------------------------------------------
-- 4. Milestones
-- ---------------------------------------------------------------------
create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.procurement_proposals(id) on delete cascade,
  title           text not null,
  description     text not null,
  payment_inr     bigint not null,
  due_date        date,
  status          text not null default 'pending'
                  check (status in ('pending','evidence_submitted','approved','rejected')),
  evidence_url    text,
  officer_comment text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table public.milestones enable row level security;

drop policy if exists "Startups manage milestones for own proposals" on public.milestones;
create policy "Startups manage milestones for own proposals" on public.milestones
  for all using (
    exists (select 1 from public.procurement_proposals p where p.id = proposal_id and p.startup_id = auth.uid())
  );

drop policy if exists "Officers manage milestones for their challenges" on public.milestones;
create policy "Officers manage milestones for their challenges" on public.milestones
  for all using (
    exists (
      select 1 from public.procurement_proposals p
      join public.challenges c on c.id = p.challenge_id
      where p.id = proposal_id and c.department_id = auth.uid()
    )
  );

drop policy if exists "Platform admins view all milestones" on public.milestones;
create policy "Platform admins view all milestones" on public.milestones
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  );

-- ---------------------------------------------------------------------
-- 5. Audit Log (Immutable)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid not null references auth.users(id),
  actor_role   text not null,
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  old_value    jsonb,
  new_value    jsonb,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "Admins read all audit logs" on public.audit_log;
create policy "Admins read all audit logs" on public.audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin')
  );

drop policy if exists "Actors read own audit log entries" on public.audit_log;
create policy "Actors read own audit log entries" on public.audit_log
  for select using (actor_id = auth.uid());

drop policy if exists "Authenticated users insert audit log" on public.audit_log;
create policy "Authenticated users insert audit log" on public.audit_log
  for insert with check (actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. Storage Bucket for Milestone Evidence
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('milestone-evidence', 'milestone-evidence', false)
on conflict (id) do nothing;

create policy "Officers and Admins can read milestone evidence"
  on storage.objects for select
  using (
    bucket_id = 'milestone-evidence'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('department_officer', 'platform_admin')
    )
  );

create policy "Startups can read own milestone evidence"
  on storage.objects for select
  using (
    bucket_id = 'milestone-evidence'
    and owner_id = auth.uid()::text
  );

create policy "Startups can insert own milestone evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'milestone-evidence'
    and owner_id = auth.uid()::text
  );

create policy "Startups can update own milestone evidence"
  on storage.objects for update
  using (
    bucket_id = 'milestone-evidence'
    and owner_id = auth.uid()::text
  );
