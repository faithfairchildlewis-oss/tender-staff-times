CREATE TABLE IF NOT EXISTS public.staff_default_rates (
  staff_name TEXT PRIMARY KEY,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_default_rates TO authenticated;
GRANT ALL ON public.staff_default_rates TO service_role;

ALTER TABLE public.staff_default_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view default rates"
  ON public.staff_default_rates
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert default rates"
  ON public.staff_default_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update default rates"
  ON public.staff_default_rates
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete default rates"
  ON public.staff_default_rates
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));