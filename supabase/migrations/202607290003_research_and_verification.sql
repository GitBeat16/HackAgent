-- Persisted research + per-message fact-check results.
--
-- Run after 202607290002_bootstrap_full_schema.sql. Idempotent.
--
-- ## Why this table exists
--
-- Retrieved sources used to live in a module-level Map in `lib/ai/research.ts`.
-- That works on a single dev server and silently breaks in production: on a
-- serverless platform the debate turns and the finalize call can execute in
-- different instances, so the cache the report reads from is empty and the
-- Sources section disappears. Evidence the board actually retrieved has to
-- outlive the process that fetched it.

create table if not exists public.research_findings (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  -- Which seat triggered the lookup, for auditing who cited what.
  executive_id text not null,
  query        text not null,
  claim        text not null,
  source       text not null,
  url          text not null,
  created_at   timestamptz not null default now(),
  -- One row per URL per meeting: the same query is asked by more than one
  -- seat across a session and the report should cite each source once.
  unique (meeting_id, url)
);

create index if not exists research_findings_meeting_idx
  on public.research_findings (meeting_id, created_at);

alter table public.research_findings enable row level security;

drop policy if exists "Users access research for own meetings" on public.research_findings;
create policy "Users access research for own meetings" on public.research_findings
  for all using (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = auth.uid()));


-- ---------------------------------------------------------------------
-- Fact-check results, stored against the message they judge.
--
-- `verification` is null for turns that were never checked (most of them —
-- only evidence seats with retrieved data are verifiable at all), which is
-- meaningfully different from "checked and found clean".
-- ---------------------------------------------------------------------
alter table public.messages
  add column if not exists verification jsonb;

comment on column public.messages.verification is
  'Fact-check result: { supported: string[], unsupported: string[], checked: bool }. Null = never checked.';
