-- Add data protection declaration boolean to proposals
ALTER TABLE public.procurement_proposals
  ADD COLUMN data_protection_accepted boolean NOT NULL DEFAULT false;

-- Add turnover boolean threshold to profiles
ALTER TABLE public.startup_profiles
  ADD COLUMN meets_turnover_threshold boolean NOT NULL DEFAULT false;
