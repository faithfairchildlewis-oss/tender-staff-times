SELECT 
    tgname AS trigger_name,
    CASE tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing
FROM pg_trigger
WHERE tgrelid = 'public.schedules'::regclass
AND tgname = 'schedules_strip_payroll';