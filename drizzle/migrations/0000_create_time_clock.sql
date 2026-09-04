CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.time_clock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.time_clock_entries TO authenticated;
GRANT ALL ON public.time_clock_entries TO service_role;

ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view time clock entries" ON public.time_clock_entries
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update time clock entries" ON public.time_clock_entries
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete time clock entries" ON public.time_clock_entries
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX time_clock_entries_staff_open_idx ON public.time_clock_entries (staff_name, clock_in DESC);

CREATE TABLE public.staff_pins (
  staff_name text PRIMARY KEY,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.staff_pins TO authenticated;
GRANT ALL ON public.staff_pins TO service_role;

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view staff pins" ON public.staff_pins
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete staff pins" ON public.staff_pins
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));