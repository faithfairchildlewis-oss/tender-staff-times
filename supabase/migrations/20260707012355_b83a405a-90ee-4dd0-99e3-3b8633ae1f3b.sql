create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.enrollment_children enable row level security;
alter table public.enrollment_waitlist enable row level security;
alter table public.enrollment_rooms    enable row level security;
alter table public.user_roles          enable row level security;

drop policy if exists "staff can read children" on public.enrollment_children;
drop policy if exists "admins manage children"  on public.enrollment_children;
create policy "staff can read children" on public.enrollment_children
  for select to authenticated using (true);
create policy "admins manage children" on public.enrollment_children
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage waitlist" on public.enrollment_waitlist;
create policy "admins manage waitlist" on public.enrollment_waitlist
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff can read rooms" on public.enrollment_rooms;
drop policy if exists "admins manage rooms"  on public.enrollment_rooms;
create policy "staff can read rooms" on public.enrollment_rooms
  for select to authenticated using (true);
create policy "admins manage rooms" on public.enrollment_rooms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role" on public.user_roles
  for select to authenticated using (user_id = auth.uid());