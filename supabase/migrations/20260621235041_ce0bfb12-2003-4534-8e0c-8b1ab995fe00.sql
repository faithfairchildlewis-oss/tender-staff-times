
UPDATE public.schedules
SET data = jsonb_set(
  data,
  '{staff_daily,Sophia}',
  jsonb_build_object(
    'Monday',
    (
      SELECT jsonb_agg(jsonb_build_object('time', t, 'rooms', jsonb_build_array('TBD')))
      FROM (VALUES
        ('8:00 AM'),('8:30 AM'),('9:00 AM'),('9:30 AM'),
        ('10:00 AM'),('10:30 AM'),('11:00 AM'),('11:30 AM'),
        ('12:00 PM'),('12:30 PM'),('1:00 PM'),('1:30 PM'),
        ('2:00 PM'),('2:30 PM'),('3:00 PM'),('3:30 PM'),
        ('4:00 PM'),('4:30 PM')
      ) AS x(t)
    )
  ),
  true
)
WHERE start_date = '2026-06-22';
