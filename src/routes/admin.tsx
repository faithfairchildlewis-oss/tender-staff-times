import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, Plus, Trash2, Copy, Check, Home, DollarSign, Eye, EyeOff, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useAllSchedules, type ScheduleRow } from "@/hooks/use-schedule";
import { fallbackSchedule, type ScheduleData } from "@/data/schedule";
import {
  DAY_NAMES,
  DEFAULT_ROOMS,
  DEFAULT_TIMES,
  blankSchedule,
  deriveDays,
  expandBlocks,
} from "@/lib/schedule-derive";
import { blocksForDay } from "@/data/schedule";
import { formatMDY, formatWeekRange, parseMDYToIso } from "@/lib/format-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Edit Schedules" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin(user);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || roleLoading || !user) {
    return <div className="min-h-dvh p-6 text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-dvh p-6">
        <p className="text-foreground">This account is not an admin.</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 text-primary underline"
        >
          Sign out
        </button>
      </div>
    );
  }
  return <AdminEditor />;
}

function AdminEditor() {
  const qc = useQueryClient();
  const { data: schedules, isLoading } = useAllSchedules();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "rooms" | "payroll">("edit");

  useEffect(() => {
    if (!selectedId && schedules?.length) {
      const cur = schedules.find((s) => s.is_current) ?? schedules[0];
      setSelectedId(cur.id);
    }
  }, [schedules, selectedId]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["schedules"] });
    await qc.invalidateQueries({ queryKey: ["schedule"] });
  }

  async function seedFromBundled() {
    const data = fallbackSchedule;
    const startDate = "2026-06-01";
    const label = formatWeekRange(startDate);
    data.week = label;
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: label,
        start_date: startDate,
        is_current: true,
        is_live: true,
        data: data as any,
      })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setSelectedId(row.id);
    await refresh();
  }

  async function createBlank() {
    const dateInput = prompt("Monday's date (MM-DD-YYYY)");
    if (!dateInput) return;
    const date = parseMDYToIso(dateInput);
    if (!date) {
      alert("Please enter the date as MM-DD-YYYY (e.g. 06-08-2026).");
      return;
    }
    const label = formatWeekRange(date);
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: label,
        start_date: date,
        is_current: false,
        is_live: false,
        data: blankSchedule(label) as any,
      })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setSelectedId(row.id);
    await refresh();
  }

  async function autoFillWeeks() {
    const ans = prompt("How many weeks ahead to auto-fill (Mon–Fri, starting June 1, 2026)?", "12");
    if (!ans) return;
    const count = Math.max(1, Math.min(104, parseInt(ans, 10) || 0));
    if (!count) return;

    const existing = new Set((schedules ?? []).map((s) => s.start_date));
    const start = new Date("2026-06-01T00:00:00");
    const toInsert: { week_label: string; start_date: string; is_current: boolean; is_live: boolean; data: any }[] = [];

    for (let i = 0; i < count; i++) {
      const mon = new Date(start);
      mon.setDate(start.getDate() + i * 7);
      const iso = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
      if (existing.has(iso)) continue;
      const label = formatWeekRange(iso);
      toInsert.push({
        week_label: label,
        start_date: iso,
        is_current: false,
        is_live: false,
        data: blankSchedule(label) as any,
      });
    }

    if (!toInsert.length) {
      alert("All weeks in that range already exist.");
      return;
    }
    const { error } = await supabase.from("schedules").insert(toInsert);
    if (error) return alert(error.message);
    await refresh();
    alert(`Created ${toInsert.length} blank week${toInsert.length === 1 ? "" : "s"}.`);
  }

  async function duplicate(src: ScheduleRow) {
    const dateInput = prompt("Monday's date (MM-DD-YYYY)", formatMDY(src.start_date));
    if (!dateInput) return;
    const date = parseMDYToIso(dateInput);
    if (!date) {
      alert("Please enter the date as MM-DD-YYYY (e.g. 06-08-2026).");
      return;
    }
    const label = formatWeekRange(date);
    // Deep clone so the new row gets its own copy of staff, staff_daily
    // (room assignments) and days — editing it later must not mutate the
    // source week.
    const cloned: ScheduleData = JSON.parse(JSON.stringify(src.data));
    cloned.week = label;
    // Rebuild days[].slots from the duplicated staff_daily so the room
    // grid is in sync with the copied per-staff assignments.
    cloned.days = deriveDays(cloned);
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: label,
        start_date: date,
        is_current: false,
        is_live: false,
        data: cloned as any,
      })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setSelectedId(row.id);
    await refresh();
  }

  async function setCurrent(id: string) {
    await supabase.from("schedules").update({ is_current: false }).neq("id", id);
    const { error } = await supabase
      .from("schedules")
      .update({ is_current: true })
      .eq("id", id);
    if (error) return alert(error.message);
    await refresh();
  }

  async function setLive(id: string, value: boolean) {
    const { error } = await supabase
      .from("schedules")
      .update({ is_live: value })
      .eq("id", id);
    if (error) return alert(error.message);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this week?")) return;
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) return alert(error.message);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  }

  const selected = schedules?.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-6 shadow-md">
        <div className="relative flex items-center mb-4 min-h-11">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary-foreground/15"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold">
            Admin
          </h1>
          <button
            onClick={() => supabase.auth.signOut().then(() => location.reload())}
            className="ml-auto inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary-foreground/15"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("edit")}
            className={`flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold ${
              view === "edit"
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/15 text-primary-foreground"
            }`}
          >
            Edit Schedule
          </button>
          <button
            onClick={() => setView("rooms")}
            className={`flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold ${
              view === "rooms"
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/15 text-primary-foreground"
            }`}
          >
            By Room
          </button>
          <button
            onClick={() => setView("payroll")}
            className={`flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
              view === "payroll"
                ? "bg-lilac text-lilac-foreground shadow-lg ring-2 ring-lilac-light"
                : "bg-lilac-light text-lilac-foreground shadow hover:bg-lilac"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Payroll
          </button>
        </div>
      </header>

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-4">
        {view === "edit" ? (
          <>
        <section className="bg-card rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Weeks</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={autoFillWeeks}
                className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-secondary text-secondary-foreground border border-border"
                title="Auto-create blank Mon–Fri weeks starting June 1, 2026"
              >
                Auto-fill
              </button>
              <button
                onClick={createBlank}
                className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" /> New
              </button>
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !schedules?.length ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No schedules yet. Seed the database with the bundled week (June 1–5, 2026) to get started.
              </p>
              <button
                onClick={seedFromBundled}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg min-h-11"
              >
                Seed bundled week
              </button>
            </div>
          ) : (
            <>
            <ul className="divide-y divide-border">
              {schedules.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`flex-1 text-left min-h-11 px-2 rounded-lg ${
                      selectedId === s.id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="font-medium text-foreground">{formatWeekRange(s.start_date)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {formatMDY(s.start_date)}
                      {s.is_live && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-lilac text-lilac-foreground text-[10px] font-semibold">
                          Live
                        </span>
                      )}
                    </div>
                  </button>
                  {s.is_current ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary min-w-11">
                      Current
                    </span>
                  ) : (
                    <button
                      onClick={() => setCurrent(s.id)}
                      title="Set as current"
                      className="p-2 min-h-11 min-w-11 rounded-lg text-primary"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setLive(s.id, !s.is_live)}
                    title={s.is_live ? "Hide from staff" : "Make visible to staff"}
                    className={`p-2 min-h-11 min-w-11 rounded-lg ${
                      s.is_live ? "text-lilac-foreground bg-lilac-light" : "text-muted-foreground"
                    }`}
                  >
                    {s.is_live ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => duplicate(s)}
                    title="Duplicate"
                    className="p-2 min-h-11 min-w-11 rounded-lg text-muted-foreground"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    title="Delete"
                    className="p-2 min-h-11 min-w-11 rounded-lg text-destructive"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        {selected && (
          <WeekEditor
            row={selected}
            onSaved={refresh}
            schedules={schedules ?? []}
            onSelect={setSelectedId}
          />
        )}
          </>
        ) : view === "rooms" ? (
          <RoomView schedules={schedules ?? []} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <PayrollView schedules={schedules ?? []} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </main>
    </div>
  );
}

type Block = { start: string; end: string; rooms: string[] };

function RoomView({
  schedules,
  selectedId,
  onSelect,
}: {
  schedules: ScheduleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = schedules.find((s) => s.id === selectedId) ?? schedules[0] ?? null;
  const [dayIdx, setDayIdx] = useState(0);

  if (!selected) {
    return (
      <section className="bg-card rounded-2xl shadow-sm p-4">
        <p className="text-sm text-muted-foreground">No schedules yet.</p>
      </section>
    );
  }

  const data: ScheduleData = selected.data;
  const derivedDays = useMemo(() => deriveDays(data), [data]);
  const day = derivedDays[dayIdx];
  const rooms = data.rooms?.length ? data.rooms : DEFAULT_ROOMS;

  const LILAC_ROOMS = new Set(["M.O.D.", "Room I", "J/K"]);
  const CLOSED_AT_4 = new Set(["Room F", "Room I"]);

  function parseMinutes(t: string): number {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }

  function rowStripe(time: string): string {
    const m = parseMinutes(time);
    if (m < 7 * 60 || m > 17 * 60 + 30) return "";
    // 7:00 white, 7:30 light blue, 8:00 white, ...
    return m % 60 === 30 ? "bg-row-stripe" : "";
  }

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Rooms — {formatWeekRange(selected.start_date)}</h2>
        {schedules.length > 1 && (
          <select
            value={selected.id}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-secondary rounded-lg px-2 py-2 min-h-11 text-sm max-w-[55%]"
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {formatWeekRange(s.start_date)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {DAY_NAMES.map((d, i) => (
          <button
            key={d}
            onClick={() => setDayIdx(i)}
            className={`flex-1 text-sm font-semibold min-h-11 rounded-lg ${
              i === dayIdx ? "bg-card text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      <div
        aria-label="Legend"
        className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-lilac border border-border" />
          Tutor / shared rooms
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-closed border border-border" />
          Closed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-row-stripe border border-border" />
          Half hour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-destructive/15 border border-destructive/40" />
          <span className="text-destructive font-semibold">Understaffed</span>
        </span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1 border border-border sticky left-0 bg-card">
                Time
              </th>
              {rooms.map((r) => (
                <th
                  key={r}
                  className={`p-1 text-center font-semibold text-foreground border border-border ${
                    LILAC_ROOMS.has(r) ? "bg-lilac text-lilac-foreground" : ""
                  }`}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {day.slots.map((sl) => {
              const stripe = rowStripe(sl.time);
              const mins = parseMinutes(sl.time);
              return (
                <tr key={sl.time} className="align-top">
                  <td
                    className={`p-1 whitespace-nowrap font-medium text-muted-foreground border border-border sticky left-0 ${
                      stripe || "bg-card"
                    }`}
                  >
                    {sl.time}
                  </td>
                  {rooms.map((r) => {
                    const a = sl.assignments[r];
                    const closed = CLOSED_AT_4.has(r) && mins >= 16 * 60;
                    if (closed) {
                      return (
                        <td
                          key={r}
                          className="p-1 border border-border bg-closed text-closed-foreground"
                        />
                      );
                    }
                    const lilac = LILAC_ROOMS.has(r);
                    const bg = lilac ? "bg-lilac" : stripe;
                    if (a === null) {
                      return (
                        <td
                          key={r}
                          className={`p-1 border border-border text-muted-foreground/40 ${bg}`}
                        >
                          —
                        </td>
                      );
                    }
                    const under = sl.understaffed.includes(r);
                    return (
                      <td
                        key={r}
                        className={`p-1 border border-border ${
                          under ? "bg-destructive/10 text-destructive font-semibold" : bg
                        } ${
                          !under && lilac ? "text-lilac-foreground" : !under ? "text-foreground" : ""
                        }`}
                      >
                        {a.length ? a.join(", ") : <span className="text-destructive">empty</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WeekEditor({
  row,
  onSaved,
  schedules,
  onSelect,
}: {
  row: ScheduleRow;
  onSaved: () => void;
  schedules: ScheduleRow[];
  onSelect: (id: string) => void;
}) {
  const [data, setData] = useState<ScheduleData>(row.data);
  const [dayIdx, setDayIdx] = useState(0);
  const [staffName, setStaffName] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(row.data);
    const names = Object.keys(row.data.staff ?? {});
    setStaffName(names[0] ?? "");
  }, [row.id]);

  const day = DAY_NAMES[dayIdx];
  const staffNames = Object.keys(data.staff ?? {});
  const blocks: Block[] = useMemo(
    () => (staffName ? blocksForDay(data, staffName, day) : []),
    [data, staffName, day],
  );

  function updateBlocks(next: Block[]) {
    const slots = expandBlocks(next);
    const sd = { ...(data.staff_daily ?? {}) };
    sd[staffName] = { ...(sd[staffName] ?? {}), [day]: slots };
    setData({ ...data, staff_daily: sd });
  }

  function addBlock() {
    updateBlocks([...blocks, { start: "9:00 AM", end: "12:00 PM", rooms: [] }]);
  }
  function removeBlock(i: number) {
    updateBlocks(blocks.filter((_, idx) => idx !== i));
  }
  function patchBlock(i: number, p: Partial<Block>) {
    updateBlocks(blocks.map((b, idx) => (idx === i ? { ...b, ...p } : b)));
  }

  function addStaff() {
    const name = prompt("Staff name");
    if (!name) return;
    const staff = { ...(data.staff ?? {}) };
    if (staff[name]) return alert("Already exists");
    staff[name] = { rate: 0, hours: 0, lunch: { type: "varies" }, daily_breaks: {} };
    setData({ ...data, staff });
    setStaffName(name);
  }
  function importStaffFrom(sourceId: string) {
    const src = schedules.find((s) => s.id === sourceId);
    if (!src) return;
    const srcStaff = src.data.staff ?? {};
    const names = Object.keys(srcStaff);
    if (!names.length) return alert("That week has no staff to import.");
    const staff = { ...(data.staff ?? {}) };
    let added = 0;
    for (const n of names) {
      if (staff[n]) continue;
      // Copy roster info (rate, lunch, daily_breaks) but reset hours;
      // do NOT copy staff_daily — assignments stay empty for the new week.
      staff[n] = {
        rate: srcStaff[n].rate ?? 0,
        hours: 0,
        lunch: srcStaff[n].lunch ?? { type: "varies" },
        daily_breaks: srcStaff[n].daily_breaks ?? {},
      };
      added++;
    }
    setData({ ...data, staff });
    if (!staffName && names[0]) setStaffName(names[0]);
    alert(`Imported ${added} staff member${added === 1 ? "" : "s"}.`);
  }
  function removeStaff() {
    if (!staffName) return;
    if (!confirm(`Remove ${staffName}?`)) return;
    const staff = { ...(data.staff ?? {}) };
    const sd = { ...(data.staff_daily ?? {}) };
    delete staff[staffName];
    delete sd[staffName];
    setData({ ...data, staff, staff_daily: sd });
    setStaffName(Object.keys(staff)[0] ?? "");
  }
  function patchStaffInfo(p: Partial<ScheduleData["staff"][string]>) {
    if (!staffName) return;
    const staff = { ...(data.staff ?? {}) };
    staff[staffName] = { ...staff[staffName], ...p };
    setData({ ...data, staff });
  }

  async function save() {
    setSaving(true);
    // recompute weekly hours per staff and rebuild days[].slots
    const staff = { ...(data.staff ?? {}) };
    for (const name of Object.keys(staff)) {
      let h = 0;
      for (const d of DAY_NAMES) {
        h += (data.staff_daily?.[name]?.[d]?.length ?? 0) * 0.5;
      }
      staff[name] = { ...staff[name], hours: h };
    }
    const next: ScheduleData = { ...data, staff };
    next.days = deriveDays(next);
    const { error } = await supabase
      .from("schedules")
      .update({ data: next as any })
      .eq("id", row.id);
    setSaving(false);
    if (error) return alert(error.message);
    await onSaved();
    alert("Saved");
  }

  const info = staffName ? data.staff[staffName] : null;

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Edit</h2>
        <button
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg min-h-11 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <Select value={row.id} onValueChange={(v) => onSelect(v)}>
        <SelectTrigger className="w-full min-h-11">
          <SelectValue placeholder="Choose a week" />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
          {schedules.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {formatWeekRange(s.start_date)}
              {s.is_current ? " · current" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {DAY_NAMES.map((d, i) => (
          <button
            key={d}
            onClick={() => setDayIdx(i)}
            className={`flex-1 text-sm font-semibold min-h-11 rounded-lg ${
              i === dayIdx ? "bg-card text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          className="flex-1 bg-secondary rounded-xl px-3 py-2 min-h-11 text-base"
        >
          {staffNames.length === 0 && <option value="">(no staff yet)</option>}
          {staffNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={addStaff}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg min-h-11 text-sm"
        >
          <Plus className="w-4 h-4 inline" /> Staff
        </button>
        {staffName && (
          <button
            onClick={removeStaff}
            className="bg-destructive text-destructive-foreground px-3 py-2 rounded-lg min-h-11 text-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <Select value="" onValueChange={importStaffFrom}>
        <SelectTrigger className="w-full min-h-11 text-sm">
          <SelectValue placeholder="Import staff roster from another week…" />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
          {schedules
            .filter((s) => s.id !== row.id && Object.keys(s.data.staff ?? {}).length > 0)
            .map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {formatWeekRange(s.start_date)} ({Object.keys(s.data.staff ?? {}).length})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {staffNames.length === 0 && (
        <div className="bg-secondary/50 rounded-2xl p-6 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No staff yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              This week doesn't have any staff. Add staff manually or import a roster from another week.
            </p>
          </div>
          {schedules.some((s) => s.id !== row.id && Object.keys(s.data.staff ?? {}).length > 0) && (
            <Select value="" onValueChange={importStaffFrom}>
              <SelectTrigger className="w-full min-h-11 text-sm mx-auto max-w-xs">
                <SelectValue placeholder="Import staff from another week…" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="center" sideOffset={4} avoidCollisions={false}>
                {schedules
                  .filter((s) => s.id !== row.id && Object.keys(s.data.staff ?? {}).length > 0)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatWeekRange(s.start_date)} ({Object.keys(s.data.staff ?? {}).length})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {info && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="block">
            <span className="text-muted-foreground">Pay rate ($/hr)</span>
            <input
              type="number"
              step="0.01"
              value={info.rate}
              onChange={(e) => patchStaffInfo({ rate: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full bg-secondary rounded-lg px-3 py-2 min-h-11"
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Lunch</span>
            <select
              value={info.lunch.type}
              onChange={(e) =>
                patchStaffInfo({
                  lunch: {
                    type: e.target.value as "fixed" | "varies",
                    time: info.lunch.time,
                  },
                })
              }
              className="mt-1 w-full bg-secondary rounded-lg px-3 py-2 min-h-11"
            >
              <option value="varies">varies</option>
              <option value="fixed">fixed</option>
            </select>
          </label>
          {info.lunch.type === "fixed" && (
            <label className="block col-span-2">
              <span className="text-muted-foreground">Lunch time (e.g. 12:00 PM)</span>
              <input
                value={info.lunch.time ?? ""}
                onChange={(e) => patchStaffInfo({ lunch: { type: "fixed", time: e.target.value } })}
                className="mt-1 w-full bg-secondary rounded-lg px-3 py-2 min-h-11"
              />
            </label>
          )}
        </div>
      )}

      {staffName && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{day} blocks</h3>
            <button
              onClick={addBlock}
              className="text-sm text-primary inline-flex items-center gap-1 min-h-11 px-2"
            >
              <Plus className="w-4 h-4" /> Add block
            </button>
          </div>
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground">Off this day.</p>
          )}
          {blocks.map((b, i) => (
            <div key={i} className="bg-secondary rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TimeSelect
                  value={b.start}
                  onChange={(v) => patchBlock(i, { start: v })}
                />
                <span className="text-muted-foreground">to</span>
                <TimeSelect
                  value={b.end}
                  onChange={(v) => patchBlock(i, { end: v })}
                  includeEnd
                />
                <button
                  onClick={() => removeBlock(i)}
                  className="ml-auto p-2 text-destructive min-h-11"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ROOMS.map((r) => {
                  const on = b.rooms.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        patchBlock(i, {
                          rooms: on ? b.rooms.filter((x) => x !== r) : [...b.rooms, r],
                        })
                      }
                      className={`px-3 py-2 rounded-lg text-sm min-h-11 ${
                        on ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TimeSelect({
  value,
  onChange,
  includeEnd,
}: {
  value: string;
  onChange: (v: string) => void;
  includeEnd?: boolean;
}) {
  const opts = includeEnd ? DEFAULT_TIMES.slice(1) : DEFAULT_TIMES.slice(0, -1);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-card rounded-lg px-2 py-2 min-h-11 text-sm"
    >
      {opts.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

function PayrollView({
  schedules,
  selectedId,
  onSelect,
}: {
  schedules: ScheduleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = schedules.find((s) => s.id === selectedId) ?? schedules[0] ?? null;

  if (!selected) {
    return (
      <section className="bg-card rounded-2xl shadow-sm p-4">
        <p className="text-sm text-muted-foreground">No schedules yet.</p>
      </section>
    );
  }

  const data: ScheduleData = selected.data;
  const names = Object.keys(data.staff ?? {});

  const rows = names.map((name) => {
    const perDay: Record<string, number> = {};
    let total = 0;
    for (const d of DAY_NAMES) {
      const hrs = (data.staff_daily?.[name]?.[d]?.length ?? 0) * 0.5;
      perDay[d] = hrs;
      total += hrs;
    }
    const rate = data.staff[name]?.rate ?? 0;
    return { name, perDay, total, rate, pay: total * rate };
  });

  const totalHours = rows.reduce((a, r) => a + r.total, 0);
  const totalPay = rows.reduce((a, r) => a + r.pay, 0);

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-semibold text-foreground">Payroll</h2>
        <select
          value={selected.id}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-background border border-border rounded-lg px-2 py-2 min-h-11 text-sm"
        >
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {formatWeekRange(s.start_date)}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="text-left p-2 border border-border">Staff</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="text-center p-2 border border-border">{d.slice(0, 3)}</th>
              ))}
              <th className="text-right p-2 border border-border">Hours</th>
              <th className="text-right p-2 border border-border">Rate</th>
              <th className="text-right p-2 border border-border">Pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="bg-card">
                <td className="p-2 border border-border font-medium text-foreground">{r.name}</td>
                {DAY_NAMES.map((d) => (
                  <td key={d} className="p-2 border border-border text-center text-muted-foreground">
                    {r.perDay[d] || ""}
                  </td>
                ))}
                <td className="p-2 border border-border text-right font-semibold">{r.total}</td>
                <td className="p-2 border border-border text-right">${r.rate.toFixed(2)}</td>
                <td className="p-2 border border-border text-right font-semibold">${r.pay.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-secondary font-semibold">
              <td className="p-2 border border-border" colSpan={1 + DAY_NAMES.length}>Total</td>
              <td className="p-2 border border-border text-right">{totalHours}</td>
              <td className="p-2 border border-border" />
              <td className="p-2 border border-border text-right">${totalPay.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}