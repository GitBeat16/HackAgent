-- Migration: Procurement Lifecycle Phase B (202609280001_procurement_lifecycle.sql)

-- 1. Extend Roles in profiles if not exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('startup', 'department_officer', 'evaluator', 'validator', 'platform_admin'));

-- 2. Extend Proposal Statuses
ALTER TABLE public.procurement_proposals DROP CONSTRAINT IF EXISTS procurement_proposals_status_check;
ALTER TABLE public.procurement_proposals ADD CONSTRAINT procurement_proposals_status_check CHECK (status IN (
  'submitted', 
  'evaluating', 
  'evaluated', 
  'screened', 
  'ineligible', 
  'pilot_approved', 
  'rejected', 
  'pilot_active', 
  'pilot_complete', 
  'scaled', 
  'extended', 
  'terminated'
));

-- Add columns to procurement_proposals
ALTER TABLE public.procurement_proposals ADD COLUMN IF NOT EXISTS ai_match_score numeric;
ALTER TABLE public.procurement_proposals ADD COLUMN IF NOT EXISTS officer_override_reason text;
ALTER TABLE public.procurement_proposals ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Extend Milestone Statuses & Tracking
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check CHECK (status IN (
  'pending', 'evidence_submitted', 'validated', 'approved', 'rejected'
));

ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_payment_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_payment_status_check CHECK (payment_status IN (
  'unpaid', 'processing', 'paid'
));

-- Add tracking columns to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id);
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS validated_at timestamptz;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS evidence_url text;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS validator_feedback text;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS payment_reference text;

-- 4. New Tables
CREATE TABLE IF NOT EXISTS public.pilot_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  duration_weeks integer NOT NULL,
  scope text NOT NULL,
  constraints text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.pilot_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_plan_id uuid REFERENCES public.pilot_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  baseline_value numeric,
  target_value numeric NOT NULL,
  actual_value numeric,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  passed boolean NOT NULL,
  reason text,
  checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scale_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  decision text CHECK (decision IN ('scale', 'extend', 'terminate')) NOT NULL,
  pathway text,
  reason text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expert_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  evaluator_id uuid REFERENCES auth.users(id),
  dimension text NOT NULL,
  score numeric NOT NULL,
  feedback text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.startup_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  dpiit_number text,
  incorporation_date date,
  sector text,
  annual_turnover_inr numeric,
  verified boolean DEFAULT false
);

-- 5. Row Level Security

ALTER TABLE public.pilot_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;

-- Helper to fetch role easily
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Pilot Plans
CREATE POLICY "Startup can view own pilot plans" ON public.pilot_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = pilot_plans.proposal_id AND p.startup_id = auth.uid()));
CREATE POLICY "Officers can view challenge pilot plans" ON public.pilot_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.procurement_proposals p JOIN public.challenges c ON p.challenge_id = c.id WHERE p.id = pilot_plans.proposal_id AND c.department_id = auth.uid()));
CREATE POLICY "Officers can create pilot plans" ON public.pilot_plans FOR INSERT
  WITH CHECK (auth.role() = 'department_officer');

-- Pilot KPIs
CREATE POLICY "Startup can view own pilot kpis" ON public.pilot_kpis FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pilot_plans pp JOIN public.procurement_proposals p ON pp.proposal_id = p.id WHERE pp.id = pilot_kpis.pilot_plan_id AND p.startup_id = auth.uid()));
CREATE POLICY "Officers can view and manage pilot kpis" ON public.pilot_kpis FOR ALL
  USING (auth.role() = 'department_officer');

-- Eligibility Checks
CREATE POLICY "Startup can view own eligibility" ON public.eligibility_checks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = eligibility_checks.proposal_id AND p.startup_id = auth.uid()));
CREATE POLICY "Officers can view and insert eligibility" ON public.eligibility_checks FOR ALL
  USING (auth.role() = 'department_officer' OR auth.role() = 'platform_admin');

-- Scale Decisions
CREATE POLICY "Startup can view own scale decision" ON public.scale_decisions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = scale_decisions.proposal_id AND p.startup_id = auth.uid()));
CREATE POLICY "Officers can insert scale decisions" ON public.scale_decisions FOR INSERT
  WITH CHECK (auth.role() = 'department_officer');
CREATE POLICY "Officers can view scale decisions" ON public.scale_decisions FOR SELECT
  USING (auth.role() = 'department_officer');

-- Expert Scores
CREATE POLICY "Evaluators can insert scores" ON public.expert_scores FOR INSERT
  WITH CHECK (auth.uid() = evaluator_id AND auth.role() = 'evaluator');
CREATE POLICY "Officers can view expert scores" ON public.expert_scores FOR SELECT
  USING (auth.role() = 'department_officer');
CREATE POLICY "Evaluators can view own scores" ON public.expert_scores FOR SELECT
  USING (auth.uid() = evaluator_id);

-- Startup Profiles
CREATE POLICY "Startup can view own profile" ON public.startup_profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Startup can update own profile" ON public.startup_profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Startup can insert own profile" ON public.startup_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Officers can view startup profiles" ON public.startup_profiles FOR SELECT
  USING (auth.role() = 'department_officer' OR auth.role() = 'platform_admin');

