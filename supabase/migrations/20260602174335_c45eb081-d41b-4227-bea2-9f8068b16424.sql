
-- 1. Payroll rates table, admin-only
CREATE TABLE public.payroll_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, staff_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_rates TO authenticated;
GRANT ALL ON public.payroll_rates TO service_role;

ALTER TABLE public.payroll_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payroll rates"
  ON public.payroll_rates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payroll rates"
  ON public.payroll_rates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payroll rates"
  ON public.payroll_rates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payroll rates"
  ON public.payroll_rates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Trigger: extract `rate` from data.staff.* into payroll_rates and strip it
CREATE OR REPLACE FUNCTION public.strip_schedule_payroll()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_obj jsonb;
  k text;
  v jsonb;
  r numeric;
BEGIN
  staff_obj := COALESCE(NEW.data->'staff', '{}'::jsonb);

  -- Upsert rates and remove `rate` field from each staff entry
  FOR k, v IN SELECT key, value FROM jsonb_each(staff_obj) LOOP
    IF v ? 'rate' THEN
      r := COALESCE((v->>'rate')::numeric, 0);
      INSERT INTO public.payroll_rates (schedule_id, staff_name, rate)
      VALUES (NEW.id, k, r)
      ON CONFLICT (schedule_id, staff_name)
      DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();

      staff_obj := jsonb_set(staff_obj, ARRAY[k], (v - 'rate'), false);
    END IF;
  END LOOP;

  NEW.data := jsonb_set(NEW.data, '{staff}', staff_obj, true);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.strip_schedule_payroll() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER schedules_strip_payroll
BEFORE INSERT OR UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.strip_schedule_payroll();

-- 3. Backfill: move existing rates out of schedules.data
DO $$
DECLARE
  s record;
  k text;
  v jsonb;
  new_staff jsonb;
BEGIN
  FOR s IN SELECT id, data FROM public.schedules LOOP
    new_staff := COALESCE(s.data->'staff', '{}'::jsonb);
    FOR k, v IN SELECT key, value FROM jsonb_each(COALESCE(s.data->'staff', '{}'::jsonb)) LOOP
      IF v ? 'rate' THEN
        INSERT INTO public.payroll_rates (schedule_id, staff_name, rate)
        VALUES (s.id, k, COALESCE((v->>'rate')::numeric, 0))
        ON CONFLICT (schedule_id, staff_name)
        DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();

        new_staff := jsonb_set(new_staff, ARRAY[k], (v - 'rate'), false);
      END IF;
    END LOOP;
    UPDATE public.schedules
      SET data = jsonb_set(data, '{staff}', new_staff, true)
      WHERE id = s.id;
  END LOOP;
END $$;
