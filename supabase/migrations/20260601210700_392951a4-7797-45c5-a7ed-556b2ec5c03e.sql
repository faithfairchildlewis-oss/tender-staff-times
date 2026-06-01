
-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Lock down SECURITY DEFINER functions: only the trigger / RLS evaluator
-- needs them. Revoke from public, anon, and authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role is referenced from RLS policies that authenticated users hit, so it
-- must remain executable by authenticated. RLS already constrains usage.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
