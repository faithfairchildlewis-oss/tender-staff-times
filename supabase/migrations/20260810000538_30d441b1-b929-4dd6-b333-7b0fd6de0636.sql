WITH exp AS (
  SELECT s.id,
         d->>'day' AS day,
         sl->>'time' AS tm,
         idx,
         kv.key AS room,
         elem #>> '{}' AS name
  FROM public.schedules s,
       jsonb_array_elements(s.data->'days') d,
       jsonb_array_elements(d->'slots') WITH ORDINALITY AS t(sl, idx),
       jsonb_each(sl->'assignments') kv,
       jsonb_array_elements(kv.value) elem
  WHERE jsonb_typeof(kv.value) = 'array'
    AND s.start_date IN (DATE '2026-08-03', DATE '2026-08-17', DATE '2026-08-24', DATE '2026-08-31')
), per_slot AS (
  SELECT id, name, day, tm, idx, jsonb_agg(DISTINCT room) AS rooms
  FROM exp GROUP BY id, name, day, tm, idx
), per_day AS (
  SELECT id, name, day,
         jsonb_agg(jsonb_build_object('time', tm, 'rooms', rooms) ORDER BY idx) AS blocks
  FROM per_slot GROUP BY id, name, day
), per_name AS (
  SELECT id, name, jsonb_object_agg(day, blocks) AS by_day
  FROM per_day GROUP BY id, name
), per_sched AS (
  SELECT id, jsonb_object_agg(name, by_day) AS staff_daily
  FROM per_name GROUP BY id
)
UPDATE public.schedules s
SET data = jsonb_set(s.data, '{staff_daily}', p.staff_daily)
FROM per_sched p
WHERE s.id = p.id;