CREATE OR REPLACE FUNCTION public.all_staff_names()
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT name ORDER BY name), ARRAY[]::text[])
  FROM public.schedules s, jsonb_object_keys(COALESCE(s.data->'staff','{}'::jsonb)) AS name;
$function$;

REVOKE EXECUTE ON FUNCTION public.all_staff_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.all_staff_names() TO anon, authenticated, service_role;