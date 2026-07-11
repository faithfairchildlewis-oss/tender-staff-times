ALTER TABLE public.enrollment_children
  ADD COLUMN IF NOT EXISTS weekly_rate_override numeric,
  ADD COLUMN IF NOT EXISTS days_per_week integer;