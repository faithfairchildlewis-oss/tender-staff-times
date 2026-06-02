DROP POLICY IF EXISTS "Anyone can view schedules" ON public.schedules;

CREATE POLICY "Live schedules are public"
  ON public.schedules FOR SELECT
  TO anon, authenticated
  USING (is_live = true);

CREATE POLICY "Admins can view all schedules"
  ON public.schedules FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));