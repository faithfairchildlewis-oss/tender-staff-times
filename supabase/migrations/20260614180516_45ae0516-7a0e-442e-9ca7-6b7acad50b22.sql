-- Make the June 15-19 schedule visible to staff
UPDATE public.schedules SET is_live = true WHERE id = '321abb62-8d49-4b4e-9c9f-6b6c3e56fd99';

-- Take the old June 8 schedule off the live view
UPDATE public.schedules SET is_live = false WHERE id = '284585ba-cd75-4460-b1fc-ab705055b96c';