update public.schedules set is_current = false, is_live = true where start_date = date '2026-08-24';

insert into public.schedules (week_label, start_date, is_current, is_live, data)
select 'August 17–21, 2026', date '2026-08-17', true, true,
       jsonb_set(data, '{week}', '"August 17–21, 2026"'::jsonb)
from public.schedules where start_date = date '2026-08-24';