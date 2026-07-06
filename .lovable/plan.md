
# /enrollment module — build plan

All age/rate/transition/capacity math comes from your `enrollment-logic.ts` verbatim; UI just imports its exports. No re-derivation.

## 1. Database (one migration)

Three new tables in `public`, all admin-scoped via existing `has_role(auth.uid(), 'admin')`. Teachers get SELECT-only for the roster view.

- `enrollment_rooms` — `code` (PK: F, I, G/H, J/K, SAC), `classroom`, `capacity`, `max_under_2`, `max_twos`, `notes`. Seeded from `seed-data.json` rooms.
- `enrollment_children` — `id` uuid, `name`, `dob` (nullable), `room` (RoomCode), `schedule` ('Standard'|'Extended'), `status` ('Active'|'Withdrawn'), `fall_plan` ('SAC'|'Inactive'|'TBD'|null), `parent`, `parent_phone`, `parent_email`, `notes`, timestamps. Seeded with the 35 children.
- `enrollment_waitlist` — `id` uuid, `name`, `dob_or_due_date`, `desired_start`, `status`, `parent`, `phone`, `email`, `date_inquired`, `notes`, timestamps. Seeded with the 5 entries.

RLS: admins full CRUD; authenticated staff SELECT-only on children (needed for the read-only Weekly Roster). GRANTs to authenticated + service_role. `updated_at` trigger using existing `touch_updated_at()`.

## 2. Business logic

`src/lib/enrollment/enrollment-logic.ts` — your file, pasted verbatim. Nothing else touches this math.

`src/lib/enrollment/enrollment.functions.ts` — `createServerFn` reads/writes gated by `requireSupabaseAuth`. List/upsert/withdraw children, list/upsert/convert waitlist, list rooms. Server maps snake_case ↔ camelCase to match the `Child` / `WaitlistEntry` interfaces exactly, so logic functions consume DB rows unchanged.

Server also exposes a role check so the UI can hide admin controls from teachers (roster view stays visible).

## 3. Routes (all under `_authenticated/`)

```text
src/routes/_authenticated/enrollment.tsx              layout: sub-nav + <Outlet />
src/routes/_authenticated/enrollment.index.tsx        Snapshot (default)
src/routes/_authenticated/enrollment.children.tsx     Children table + inline edit
src/routes/_authenticated/enrollment.transitions.tsx  Timeline (30/60/90)
src/routes/_authenticated/enrollment.roster.tsx       Weekly Roster grid (teacher-readable)
src/routes/_authenticated/enrollment.waitlist.tsx     Waitlist + match panel
src/routes/_authenticated/enrollment.import.tsx       Brightwheel diff/apply
src/routes/_authenticated/enrollment.print.$room.tsx  Print view per classroom
```

All non-roster tabs redirect teachers to the roster with a toast. Layout renders the Deuteronomy 32:2 footer verse.

## 4. Page details

- **Snapshot** — per-room cards (census/capacity/open/held/available/staff via `staffRequired`/`heldSeats`, weekly revenue via `weeklyRate`, open-seat value). Sprouts composition widget (`sproutsComposition`). Fall SAC outlook: J/K children grouped by `fallPlan` + SAC-eligible waitlist deposits vs SAC capacity. Data-flags list: missing DOB, `room !== eligibleRoomAtAge(ageInMonths(dob))` labeled "placement differs — director's call". "Copy Monday Snapshot" builds plaintext and copies to clipboard.
- **Children** — sortable table with inline edit (name, DOB, room, schedule, fallPlan for K-bound). Weekly rate is computed, read-only. `nextTransition` renders date + destination; F→I gets an "estimate" badge. Add + Withdraw (status flip, never DELETE).
- **Transitions** — flat-map `nextTransition` over active children, sort ascending, group by 30/60/90-day buckets. K rows render "Last day Aug 21, 20XX". Each row shows opened seat (from-room) and consumed seat (to-room).
- **Weekly Roster** — Mondays as columns (default: this Monday + 52 weeks, date-range selectable). Rows = children grouped by current room, with birthday column. Each cell colored by `roomOnDate(child, monday, campEnds=2026-08-21)` — F blue, I teal, G/H green, J/K gold, SAC purple, SUMMER gray. Waitlist deposits appear as rows starting at their `desiredStart` Monday, name suffixed with `*`. Frozen name/birthday columns via sticky positioning; horizontal scroll. Print view at `enrollment.print.$room` filters and drops UI chrome.
- **Waitlist** — table + status pipeline. "Match" panel: for each entry, project openings from `nextTransition`s where `to === eligibleRoomAtAge(...)` and date ≤ desiredStart; render the first fit. "Convert to Enrolled" inserts an `enrollment_children` row (`schedule` copied from Extended-note detection, else Standard) and marks waitlist Enrolled.
- **Import** — file input for .xlsx/.csv. Parse client-side with `xlsx` (already in project? — will `bun add` if not). Column normalizer: `first_name` + `last_name`, `homeroom` fallback `room_1` with quote stripping, `birthdate`, `enrollment_status`, `parent_1_*`. Diff vs current children by name: `New`, `Departure → Withdrawn`, `Room change`, `Birthday change`. Diff table with row-level accept, then Apply-with-confirmation.

## 5. Wiring

- Add "Enrollment" nav link in `PageBanner` (admin-visible, plus teachers see the Roster tab via the layout redirect).
- Sub-nav inside `enrollment.tsx` layout with Tabs.
- Snapshot is the default at `/enrollment`.
- Palette: existing sage green + warm gold tokens already in `styles.css`; add room-color CSS vars (`--room-f`, `--room-i`, etc.) so the roster grid uses semantic tokens, not hex literals.

## 6. Non-goals confirmed by prompt

- No summer program UI (SUMMER RoomCode reserved in logic).
- No medical/allergy fields.
- No public routes — everything under `_authenticated/`.
- No AI "Ask" box in this pass (stretch goal; separate turn if you want it).

## Order of work after approval

1. Migration + seed (one call, awaits your approval).
2. Copy `enrollment-logic.ts` verbatim + server functions + roles helper.
3. Layout + Snapshot + Children (main daily-use pages).
4. Transitions + Roster + Waitlist.
5. Import (with the xlsx dependency add).
6. PageBanner nav link + role-based visibility.

Approve and I'll start with the migration.
