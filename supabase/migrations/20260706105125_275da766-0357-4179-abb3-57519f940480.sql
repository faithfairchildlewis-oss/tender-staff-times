-- Enrollment module tables

CREATE TABLE IF NOT EXISTS public.enrollment_rooms (
  code text PRIMARY KEY,
  classroom text NOT NULL,
  capacity int NOT NULL,
  max_under_2 int,
  max_twos int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollment_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dob date,
  room text NOT NULL,
  schedule text NOT NULL DEFAULT 'Standard' CHECK (schedule IN ('Standard','Extended')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Withdrawn')),
  fall_plan text CHECK (fall_plan IS NULL OR fall_plan IN ('SAC','Inactive','TBD')),
  parent text,
  parent_phone text,
  parent_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dob_or_due_date date NOT NULL,
  desired_start date NOT NULL,
  status text NOT NULL DEFAULT 'Inquiry',
  parent text,
  phone text,
  email text,
  date_inquired date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.enrollment_rooms TO authenticated;
GRANT ALL ON public.enrollment_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_children TO authenticated;
GRANT ALL ON public.enrollment_children TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_waitlist TO authenticated;
GRANT ALL ON public.enrollment_waitlist TO service_role;

ALTER TABLE public.enrollment_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_authenticated" ON public.enrollment_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_admin_write" ON public.enrollment_rooms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "children_select_authenticated" ON public.enrollment_children
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "children_admin_write" ON public.enrollment_children
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "waitlist_admin_all" ON public.enrollment_waitlist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER enrollment_rooms_touch BEFORE UPDATE ON public.enrollment_rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER enrollment_children_touch BEFORE UPDATE ON public.enrollment_children
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER enrollment_waitlist_touch BEFORE UPDATE ON public.enrollment_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed rooms
INSERT INTO public.enrollment_rooms(code,classroom,capacity,max_under_2,max_twos) VALUES ('F','The Acorns',6,NULL,NULL) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.enrollment_rooms(code,classroom,capacity,max_under_2,max_twos) VALUES ('I','The Pine Cones',3,NULL,NULL) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.enrollment_rooms(code,classroom,capacity,max_under_2,max_twos) VALUES ('G/H','The Sprouts',9,3,6) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.enrollment_rooms(code,classroom,capacity,max_under_2,max_twos) VALUES ('J/K','Mighty Oaks',20,NULL,NULL) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.enrollment_rooms(code,classroom,capacity,max_under_2,max_twos) VALUES ('SAC','Mighty Cedars / School Age',11,NULL,NULL) ON CONFLICT (code) DO NOTHING;

-- Seed children
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Bodie Collins','2025-11-15','F','Standard','Active',NULL,'Katie Collins','14438713186','katiecollins06@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Jude Watkins','2026-02-01','F','Standard','Active',NULL,'Shania Jarvis','14433066189','shania.jarvis@yahoo.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Charlie Wood','2026-02-05','F','Standard','Active',NULL,'Alexis Summers','14104742460',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Aurora Dahlgren','2024-11-26','I','Standard','Active',NULL,'Elisa Pellegrini','15712821684',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Hendrix Hood','2025-01-30','I','Standard','Active',NULL,'Stephanie Hood','13016530795','soconnor1016@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Gregory Mosley','2025-04-26','I','Standard','Active',NULL,'Alexis Mosley','14436940349',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Sonny Schulze','2023-08-19','G/H','Standard','Active',NULL,'Alisa Tucker','14434541813','alisartucker@yahoo.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Evelyn Carlson','2023-12-04','G/H','Standard','Active',NULL,'Emma Glasgow','14105330525','emma.a.glasgow@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Laelynn Pineda','2024-01-23','G/H','Standard','Active',NULL,'Lazaro Pineda','2017365293','laz.pineda@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Bristol Turner','2024-02-15','G/H','Standard','Active',NULL,'Sarah Dean','14105336336','sdean102@yahoo.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Stevie Murianka','2024-02-15','G/H','Standard','Active',NULL,'Stephanie Murianka','13018617354','stephanie.murianka@outlook.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Ivy Britten','2024-07-11','G/H','Standard','Active',NULL,'Katie Britten','12406438121',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Beau Platt','2024-09-11','G/H','Standard','Active',NULL,'Lilly Nugent','14439958627',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Isabella Powell','2020-10-14','J/K','Standard','Active','TBD','Amalia Renkiewicz','14433701849','alrenkiewicz23@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Toulson Scruggs','2020-12-15','J/K','Standard','Active','TBD','Katrina Scruggs','17192210592','mks83101@protonmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Rhett Britten','2021-05-05','J/K','Standard','Active','SAC','Katie Britten','12406438121',NULL,'SAC begins week of 8/24/2026');
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Sloan Beck','2021-05-05','J/K','Standard','Active','SAC',NULL,NULL,NULL,'SAC begins week of 8/24/2026');
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Isla Henry','2021-05-23','J/K','Standard','Active','TBD','Ana Henry',NULL,'anab103@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Leo Pineda','2021-07-14','J/K','Standard','Active','TBD','Lazaro Pineda','2017365293','laz.pineda@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Camden Sullivan','2021-08-06','J/K','Standard','Active','TBD','Diana Sullivan','12406789276','sullivand903@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Aris Smith','2021-12-23','J/K','Standard','Active',NULL,'Joseph Smith','14109198543','1stjosephsmith@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Landon Klein','2022-02-26','J/K','Standard','Active',NULL,'Crystal Klein','14438678570','crystalcklein@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Antonya Pounders','2022-03-24','J/K','Standard','Active',NULL,'Fatima Sequeira','17165601288','sequeira.fatima.c@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Callie Beck','2022-04-20','J/K','Standard','Active',NULL,NULL,NULL,NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Brooks Cunningham','2022-07-07','J/K','Standard','Active',NULL,'Bryn Cunningham','13017589887','brynbuck@hotmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Leo DiLoreto','2022-07-07','J/K','Standard','Active',NULL,'Matt DiLoreto','17173191654',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Norah Carroll','2022-08-19','J/K','Standard','Active',NULL,'Stephanie Carroll','14107033895','stephcarroll89@yahoo.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Brooks Kazimer','2022-10-02','J/K','Standard','Active',NULL,'Jennifer Collins','14432541713','jenncollins35@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Brooks Brown','2022-10-11','J/K','Standard','Active',NULL,'Hannah Carroll','14105308830',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Benjamin Zeek','2022-10-25','J/K','Standard','Active',NULL,'Dave Zeek','17064151524','zeekfam19@gmail.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Shay Watkins','2023-02-20','J/K','Standard','Active',NULL,'Shania Jarvis','14433066189','shania.jarvis@yahoo.com',NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Enzo Anastasi','2023-07-01','J/K','Standard','Active',NULL,'Sarah Irwin','13014523053',NULL,NULL);
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('William Murphy','2018-12-04','SAC','Standard','Active',NULL,'Pearl Winston','19734447213','priettii_p@yahoo.com','SAC begins week of 8/24/2026');
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Jace Beck',NULL,'SAC','Standard','Active',NULL,NULL,NULL,NULL,'SAC begins week of 8/24/2026 DOB missing — update in Brightwheel.');
INSERT INTO public.enrollment_children(name,dob,room,schedule,status,fall_plan,parent,parent_phone,parent_email,notes) VALUES ('Shiloh Beck',NULL,'SAC','Standard','Active',NULL,NULL,NULL,NULL,'SAC begins week of 8/24/2026 DOB missing — update in Brightwheel.');

-- Seed waitlist
INSERT INTO public.enrollment_waitlist(name,dob_or_due_date,desired_start,status,parent,phone,email,date_inquired,notes) VALUES ('Gage Michael Spong','2026-09-19','2026-11-16','Deposit paid','Rachel Estep & Eric Spong','Rachel (443) 771-5208 / Eric (410) 279-7017','rachel.e.estep@gmail.com','2026-06-02','Due 9/19/2026 (DOB col = due date). Signed agreement 6/2/2026. Infant care $475/wk. $490 (wk 1 + activity fee) due 11/13/2026.');
INSERT INTO public.enrollment_waitlist(name,dob_or_due_date,desired_start,status,parent,phone,email,date_inquired,notes) VALUES ('Margo Turk','2026-06-21','2026-09-21','Deposit paid','Stami & Kyle Turk','(770) 712-5560','stamiturk@gmail.com','2026-02-18','First child; DOB shown is the due date (6/21/2026) — confirm actual birth date. Start 9/21/2026 is mom''s best estimate pending maternity leave; check in late August. Infant care $475/wk. JotForm inquiry 2/18/2026.');
INSERT INTO public.enrollment_waitlist(name,dob_or_due_date,desired_start,status,parent,phone,email,date_inquired,notes) VALUES ('Michael Lowe','2021-03-26','2026-08-24','Deposit paid','Melissa & Austin Lowe','Melissa (301) 557-0911 / Austin (301) 908-2593','mbeeslowe@gmail.com / amlowe12@aol.com','2026-04-17','School-age (K–5th), $175/wk school year. Signed 4/17/2026. Brother of Nathan. Rising kindergartner — counts toward fall SAC capacity.');
INSERT INTO public.enrollment_waitlist(name,dob_or_due_date,desired_start,status,parent,phone,email,date_inquired,notes) VALUES ('Nathan Lowe','2022-10-12','2026-08-24','Deposit paid','Melissa & Austin Lowe','Melissa (301) 557-0911 / Austin (301) 908-2593','mbeeslowe@gmail.com / amlowe12@aol.com','2026-04-17','Pre-K with extended care: $300 + $40 = $340/wk (Extended). Signed 4/17/2026. Brother of Michael. Set Schedule = Extended when moved to Children tab.');
INSERT INTO public.enrollment_waitlist(name,dob_or_due_date,desired_start,status,parent,phone,email,date_inquired,notes) VALUES ('Baby Boy Dahlgren','2027-01-15','2027-03-01','Hold – deposit pending','Elisa Pellegrini','15712821684',NULL,'2026-07-06','Sibling of Aurora. Due January 2027 (DOB col = mid-month estimate — update at birth). Start March 2027, infant care $475/wk. Confirm deposit and exact start.');