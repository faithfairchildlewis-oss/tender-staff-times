
UPDATE public.schedules
SET data = jsonb_set(
  jsonb_set(
    data,
    '{staff,Sophia}',
    '{"hours": 9, "lunch": {"type": "none"}, "daily_breaks": {}}'::jsonb,
    true
  ),
  '{staff_daily,Sophia}',
  (
    SELECT jsonb_agg(jsonb_build_object('time', t, 'room', 'TBD'))
    FROM (VALUES
      ('Mon 8:00 AM'),('Mon 8:30 AM'),('Mon 9:00 AM'),('Mon 9:30 AM'),
      ('Mon 10:00 AM'),('Mon 10:30 AM'),('Mon 11:00 AM'),('Mon 11:30 AM'),
      ('Mon 12:00 PM'),('Mon 12:30 PM'),('Mon 1:00 PM'),('Mon 1:30 PM'),
      ('Mon 2:00 PM'),('Mon 2:30 PM'),('Mon 3:00 PM'),('Mon 3:30 PM'),
      ('Mon 4:00 PM'),('Mon 4:30 PM')
    ) AS x(t)
  ),
  true
)
WHERE start_date = '2026-06-22';
