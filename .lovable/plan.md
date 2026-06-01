## What you'll get

- A secure **/admin** area you sign into with email + password
- A list of **weeks** you can create, duplicate, set as "current", or delete
- For each week, an editor that lets you pick a **staff member + day** and edit their **time blocks and rooms** (matches today's JSON structure exactly)
- The staff-facing home and personal pages load the **current week from the database** instead of the embedded JSON (current file kept as a one-time seed and fallback)

## Setup steps

1. **Enable Lovable Cloud** — gives us database + auth, no external accounts.
2. **Database schema**
   - `schedules` — one row per week: `week_label`, `start_date`, `is_current`, `data jsonb` (whole week's days/staff_daily/staff blob in today's shape), `updated_at`
   - `user_roles` + `has_role()` security-definer function (admin role, per project rules — never stored on profiles)
   - RLS: anyone can `SELECT` schedules (staff app is public); only `admin` role can `INSERT/UPDATE/DELETE`; `user_roles` readable only by the authenticated user
   - Seed the existing June 1–5 JSON as the first row, marked `is_current = true`
3. **Auth**
   - Email + password (no email confirm, so first sign-in works immediately)
   - `/login` page (sign in + sign up)
   - First account you create won't be admin automatically — I'll add a one-time SQL helper note so you can promote yourself, OR seed your email as admin if you give me one. Simplest: the **first signup becomes admin** via a database trigger. I'll go with that.
4. **Admin UI** (`/admin`, gated by `_authenticated` + admin role check)
   - Weeks list: create new (blank or duplicate of another week), rename, set current, delete
   - Week editor: tabs for Mon–Fri, dropdown to pick a staff member, form fields to edit their time blocks (start, end, rooms) for that day, plus pay rate / weekly hours / lunch / daily breaks
   - Saves write back to `schedules.data` (whole-blob update — keeps the existing read code unchanged)
5. **Staff app updates**
   - `src/data/schedule.ts` becomes async: fetches the `is_current` schedule from Supabase, falls back to bundled JSON if the table is empty or offline
   - Home, `/staff/$name`, and the existing read-only `/admin` schedule-view route load from the live data
6. **Header tweak**
   - Tiny "Admin" link in the home footer card linking to `/admin` (which redirects to `/login` if you're not signed in)

## Technical notes

- Schema stays JSONB-shaped so we don't have to rewrite the rendering code; the editor mutates the JSONB structure in place
- Admin writes go through `requireSupabaseAuth` server functions + RLS double-gate
- `has_role(auth.uid(), 'admin')` used in RLS policies (not a column on profiles)
- Existing `/admin` read-only schedule-view route renames to `/schedule` to free `/admin` for the editor
- No edge functions; everything is server functions per the TanStack Start template
