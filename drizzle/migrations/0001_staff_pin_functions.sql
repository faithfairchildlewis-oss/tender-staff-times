CREATE OR REPLACE FUNCTION public.set_staff_pin(_staff_name text, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;
  IF EXISTS (SELECT 1 FROM public.staff_pins WHERE staff_name = _staff_name) THEN
    RETURN false;
  END IF;
  INSERT INTO public.staff_pins (staff_name, pin_hash)
  VALUES (_staff_name, extensions.crypt(_pin, extensions.gen_salt('bf')));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_staff_pin(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_staff_pin(_staff_name text, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_pins
    WHERE staff_name = _staff_name
      AND pin_hash = extensions.crypt(_pin, pin_hash)
  );
$$;

REVOKE ALL ON FUNCTION public.verify_staff_pin(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text, text) TO service_role;