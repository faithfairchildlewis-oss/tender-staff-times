
CREATE OR REPLACE FUNCTION public.all_staff_names()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT name ORDER BY name), ARRAY[]::text[])
  FROM public.schedules s, jsonb_object_keys(COALESCE(s.data->'staff','{}'::jsonb)) AS name;
$$;

GRANT EXECUTE ON FUNCTION public.all_staff_names() TO anon, authenticated;
