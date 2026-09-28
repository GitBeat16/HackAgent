-- Migration: SIH Procurement Pathway (202609270001_sih_procurement.sql)
-- Purpose: Adds Gov Roles, Challenges, Proposals, Officer Document Uploads, and Milestones.

DROP TABLE IF EXISTS public.audit_log, public.milestones, public.proposal_documents, public.procurement_proposals, public.challenges CASCADE;

-- 1. Extend Profiles for Government & Startup Roles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'startup_founder'
    CHECK (role IN ('startup_founder', 'department_officer', 'platform_admin')),
  ADD COLUMN IF NOT EXISTS department_name text,
  ADD COLUMN IF NOT EXISTS startup_name text,
  ADD COLUMN IF NOT EXISTS dpiit_number text; -- For startup verification

-- 2. Challenges (Posted by Government Departments)
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL, -- Outcome-based problem statement
  domain text NOT NULL, -- e.g., 'Health', 'Transport', 'Cybersecurity'
  budget_inr bigint, 
  deadline date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers manage their challenges" ON public.challenges
  FOR ALL USING (department_id = auth.uid()) WITH CHECK (department_id = auth.uid());
CREATE POLICY "Startups view open challenges" ON public.challenges
  FOR SELECT USING (status = 'open');

-- 3. Procurement Proposals (Startups applying to Challenges)
CREATE TABLE public.procurement_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE RESTRICT,
  startup_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  meeting_id uuid REFERENCES public.meetings(id), -- Links to the AI Debate Engine
  report_id uuid REFERENCES public.reports(id),   -- Links to the AI Output Report
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'evaluating', 'evaluated', 'approved', 'rejected', 'pilot_active', 'completed')),
  proposal_text text NOT NULL,
  ai_match_score integer CHECK (ai_match_score BETWEEN 0 AND 100),
  officer_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.procurement_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Startups manage own proposals" ON public.procurement_proposals
  FOR ALL USING (startup_id = auth.uid()) WITH CHECK (startup_id = auth.uid());
CREATE POLICY "Officers view/update proposals for their challenges" ON public.procurement_proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.department_id = auth.uid())
  );

-- 4. Proposal Documents (New: Officers can upload tax reports, certs, etc. to aid AI evaluation)
CREATE TABLE public.proposal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  document_title text NOT NULL,
  document_type text NOT NULL, -- e.g., 'tax_report', 'compliance_certificate', 'technical_architecture'
  storage_path text NOT NULL, -- Path in Supabase Storage
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view documents on proposals they have access to" ON public.proposal_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND (p.startup_id = auth.uid() OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = p.challenge_id AND c.department_id = auth.uid())))
  );
CREATE POLICY "Users can upload documents" ON public.proposal_documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- 5. Milestones (For tracking Pilot execution & payments)
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.procurement_proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  payment_inr bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evidence_submitted', 'approved', 'rejected')),
  evidence_url text, -- Path in Supabase Storage where startup uploads proof
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
-- Startups can update milestones for their proposals (to submit evidence)
CREATE POLICY "Startups update milestones for own proposals" ON public.milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.procurement_proposals p WHERE p.id = proposal_id AND p.startup_id = auth.uid())
  );
-- Officers manage milestones for their challenges
CREATE POLICY "Officers manage milestones for their challenges" ON public.milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.procurement_proposals p
      JOIN public.challenges c ON c.id = p.challenge_id
      WHERE p.id = proposal_id AND c.department_id = auth.uid()
    )
  );

-- 6. Audit Log (Immutable Gov Tracking)
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  actor_role text NOT NULL,
  entity_type text NOT NULL, -- 'challenge', 'proposal', 'milestone'
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all audit logs" ON public.audit_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'));
CREATE POLICY "Actors read own audit log entries" ON public.audit_log
  FOR SELECT USING (actor_id = auth.uid());
CREATE POLICY "Authenticated users insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- 7. Storage Buckets configuration
INSERT INTO storage.buckets (id, name, public) VALUES ('procurement-documents', 'procurement-documents', false) ON CONFLICT DO NOTHING;

-- Storage RLS (Startups & Officers can upload/read their respective documents)
CREATE POLICY "Allow authenticated uploads to procurement docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'procurement-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated reads from procurement docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'procurement-documents' AND auth.uid() IS NOT NULL);

