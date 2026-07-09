
-- Revoke public/anon EXECUTE on SECURITY DEFINER functions to prevent anon callers
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;

-- Restrict children reads to admins only (previous policy exposed parent contact
-- info and DOB/notes to every authenticated user).
DROP POLICY IF EXISTS "staff can read children" ON public.enrollment_children;

CREATE POLICY "Admins can read children"
ON public.enrollment_children
FOR SELECT
TO authenticated
USING (public.is_admin());
