DELETE FROM public.payroll_rates
WHERE staff_name = 'Courtney'
  AND schedule_id IN (SELECT schedule_id FROM public.payroll_rates WHERE staff_name = 'Kyleigh');

UPDATE public.payroll_rates SET staff_name = 'Kyleigh' WHERE staff_name = 'Courtney';
UPDATE public.staff_default_rates SET staff_name = 'Kyleigh' WHERE staff_name = 'Courtney';
UPDATE public.time_off_requests SET staff_name = 'Kyleigh' WHERE staff_name = 'Courtney';
UPDATE public.schedules SET data = REPLACE(data::text, 'Courtney', 'Kyleigh')::jsonb WHERE data::text LIKE '%Courtney%';