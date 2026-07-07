drop policy if exists "children_select_authenticated" on public.enrollment_children;
drop policy if exists "children_admin_write" on public.enrollment_children;
drop policy if exists "rooms_select_authenticated" on public.enrollment_rooms;
drop policy if exists "rooms_admin_write" on public.enrollment_rooms;
drop policy if exists "waitlist_admin_all" on public.enrollment_waitlist;
drop policy if exists "Users read own roles" on public.user_roles;