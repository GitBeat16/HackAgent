-- Migration: v2 Core Mechanism (202609280001_v2_core_mechanism.sql)
-- Purpose: Extended roles, new proposal statuses, pilot design, payment tracking, independent validation.

-- 1. Extend Roles in profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('startup_founder', 'startup', 'department_officer', 'evaluator', 'validator', 'platform_admin'));

-- 2. Extend Proposal Statuses
ALTER TABLE public.procurement_proposals DROP CONSTRAINT IF EXISTS procurement_proposals_status_check;
ALTER TABLE public.procurement_proposals ADD CONSTRAINT procurement_proposals_status_check CHECK (status IN (
  'submitted', 
  'screened', 
  'ineligible', 
  'evaluating', 
  'evaluated', 
  'approved', 
  'rejected', 
  'pilot_active', 
  'pilot_complete', 
  'completed', 
  'scaled', 
  'extended', 
  'terminated'
));

-- 3. Extend Milestone Statuses & Columns
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check CHECK (status IN (
  'pending', 
  'evidence_submitted', 
  'validated', 
  'approved', 
  'rejected'
));

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'released', 'paid')),
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 4. Extend Procurement Proposals with Override tracking
ALTER TABLE public.procurement_proposals
  ADD COLUMN IF NOT EXISTS decision_override_reason text,
  ADD COLUMN IF NOT EXISTS decision_by uuid REFERENCES auth.users(id);

-- 5. Extend Challenges with new configurations
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS evaluation_weights jsonb,
  ADD COLUMN IF NOT EXISTS relax_turnover boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS entity_age_max integer,
  ADD COLUMN IF NOT EXISTS published_criteria_at timestamptz;

-- 6. New Table: eligibility_checks
CREATE TABLE public.eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  rule text NOT NULL,
  passed boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view relevant eligibility checks" ON public.eligibility_checks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid())))
  );

-- 7. New Table: pilot_plans
CREATE TABLE public.pilot_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  duration_weeks integer NOT NULL,
  scope_description text NOT NULL,
  constraints text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pilot_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view relevant pilot plans" ON public.pilot_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid())))
  );

-- 8. New Table: pilot_kpis
CREATE TABLE public.pilot_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.pilot_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL,
  baseline numeric NOT NULL,
  target numeric NOT NULL,
  actual numeric,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pilot_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view relevant pilot kpis" ON public.pilot_kpis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pilot_plans pp 
      JOIN public.procurement_proposals p ON p.id = pp.proposal_id 
      WHERE pp.id = plan_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid()))
    )
  );

-- 9. New Table: scale_decisions
CREATE TABLE public.scale_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('Scale', 'Extend', 'Terminate')),
  pathway text CHECK (pathway IN ('GeM Listing', 'Open Tender', 'Cross-Department', 'None')),
  reason text NOT NULL,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scale_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view relevant scale decisions" ON public.scale_decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid())))
  );

-- 10. New Table: expert_scores
CREATE TABLE public.expert_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES auth.users(id),
  dimension text NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view relevant expert scores" ON public.expert_scores
  FOR SELECT USING (
    evaluator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid())))
  );

-- 11. New Table: startup_profiles
CREATE TABLE public.startup_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_name text NOT NULL,
  sector_tags text[],
  dpiit_number text,
  stage text,
  districts_served text[],
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view startup profiles" ON public.startup_profiles FOR SELECT USING (true);
CREATE POLICY "Startups can update own profile" ON public.startup_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Startups can insert own profile" ON public.startup_profiles FOR INSERT WITH CHECK (id = auth.uid());
