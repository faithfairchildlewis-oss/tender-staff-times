CREATE OR REPLACE FUNCTION public.staff_hours_in_range(
  _name text,
  _start date,
  _end date
) RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM( ((s.data->'staff'->_name->>'hours')::numeric) ), 0)
  FROM public.schedules s
  WHERE s.start_date BETWEEN _start AND _end
    AND s.data->'staff' ? _name;
$$;

GRANT EXECUTE ON FUNCTION public.staff_hours_in_range(text, date, date) TO anon, authenticated;