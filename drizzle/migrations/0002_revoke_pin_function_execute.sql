REVOKE EXECUTE ON FUNCTION public.set_staff_pin(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_staff_pin(text, text) FROM anon, authenticated;