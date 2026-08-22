ALTER TABLE public.enrollment_children
  ADD COLUMN IF NOT EXISTS alternate_weeks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_anchor_date date;