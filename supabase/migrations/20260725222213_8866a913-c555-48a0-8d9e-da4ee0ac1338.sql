
-- Explicit admin SELECT on enrollment_waitlist (defense in depth)
CREATE POLICY "Admins can read waitlist"
ON public.enrollment_waitlist
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Ensure user_roles is fail-closed for writes by authenticated users
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
