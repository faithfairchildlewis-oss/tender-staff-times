ALTER TABLE public.enrollment_children
  ADD COLUMN IF NOT EXISTS pending_room text,
  ADD COLUMN IF NOT EXISTS pending_room_date date;