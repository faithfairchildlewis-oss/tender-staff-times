ALTER TABLE public.time_off_requests
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decided_by_email text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;