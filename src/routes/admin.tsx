import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: data.week,
        start_date: "2026-06-01",
        is_current: true,
        data: data as any,
      })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setSelectedId(row.id);
    await refresh();
  }

  async function createBlank() {
    const label = prompt("Week label (e.g. June 8–12, 2026)");
    if (!label) return;
    const date = prompt("Monday's date (YYYY-MM-DD)");
    if (!date) return;
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: label,
        start_date: date,
        is_current: false,
        data: blankSchedule(label) as any,
      })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setSelectedId(row.id);
    await refresh();
  }

  async function duplicate(src: ScheduleRow) {
    const label = prompt("New week label", "Copy of " + src.week_label);
    if (!label) return;
    const date = prompt("Monday's date (YYYY-MM-DD)", src.start_date);
    if (!date) return;
    const newData = { ...src.data, week: label };
    const { data: row, error } = await supabase
      .from("schedules")
      .insert({
        week_label: label,
        start_date: date,
        is_current: false,
        data: newData as any,
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
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Admin — Schedules</h1>
          <button
            onClick={() => supabase.auth.signOut().then(() => location.reload())}
            className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary-foreground/15"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-4">
        <section className="bg-card rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Weeks</h2>
            <button
              onClick={createBlank}
              className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" /> New
            </button>
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
            <ul className="divide-y divide-border">
              {schedules.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`flex-1 text-left min-h-11 px-2 rounded-lg ${
                      selectedId === s.id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="font-medium text-foreground">{s.week_label}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.start_date} {s.is_current && "· current"}
                    </div>
                  </button>
                  {!s.is_current && (
                    <button
                      onClick={() => setCurrent(s.id)}
                      title="Set as current"
                      className="p-2 min-h-11 min-w-11 rounded-lg text-primary"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
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
          )}
        </section>

        {selected && <WeekEditor row={selected} onSaved={refresh} />}
      </main>
    </div>
  );
}

type Block = { start: string; end: string; rooms: string[] };

function WeekEditor({ row, onSaved }: { row: ScheduleRow; onSaved: () => void }) {
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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Edit “{row.week_label}”</h2>
        <button
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg min-h-11 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
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