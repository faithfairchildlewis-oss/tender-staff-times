UPDATE schedules
SET data = data 
  || jsonb_build_object('staff', ((data->'staff')::jsonb - 'Kyleigh') || jsonb_build_object('Courtney', data->'staff'->'Kyleigh'))
  || jsonb_build_object('staff_daily', ((data->'staff_daily')::jsonb - 'Kyleigh') || jsonb_build_object('Courtney', data->'staff_daily'->'Kyleigh'))
WHERE data->'staff' ? 'Kyleigh';