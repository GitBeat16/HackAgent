-- Add approved_at column to milestones for payment tracking SLA
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS days_to_payment integer,
  ADD COLUMN IF NOT EXISTS is_on_time boolean;
