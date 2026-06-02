import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Check, Coffee, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ScheduleRow } from "@/hooks/use-schedule";
import type { ScheduleData } from "@/data/schedule";
import {
  DAY_NAMES,
  DEFAULT_ROOMS,
  DEFAULT_TIMES,
  deriveDays,
  minimumFor,
} from "@/lib/schedule-derive";
import { formatWeekRange } from "@/lib/format-date";

type DragPayload = {
  name: string;
  fromTime: string | null;
  fromRoom: string | null;
};

/** Drag-and-drop shift editor for a single week.
 *  Rows = 30-minute slots, columns = rooms plus a Lunch/Off sink. */
export function ShiftGrid({ row }: { row: ScheduleRow }) {
  const qc = useQueryClient();
  const [data, setData] = useState<ScheduleData>(row.data);
  const [dayIdx, setDayIdx] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dataRef = useRef(data);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const rowIdRef = useRef(row.id);
  const AUTOSAVE_MS = 800;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    setData(row.data);
    setStatus("idle");
    setErrorMsg(null);
    setLastSavedAt(null);
    rowIdRef.current = row.id;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingRef.current = false;
  }, [row.id]);

  const day = DAY_NAMES[dayIdx];
  const rooms = data.rooms?.length ? data.rooms : DEFAULT_ROOMS;
  const allStaff = useMemo(() => Object.keys(data.staff ?? {}).sort(), [data.staff]);

  /** Staff name → set of times worked on this day (any room). */
  const workingByTime = useMemo(() => {
    const m = new Map<string, Map<string, Set<string>>>(); // time → room → names
    for (const t of DEFAULT_TIMES) m.set(t, new Map());
    for (const name of allStaff) {
      const blocks = data.staff_daily?.[name]?.[day] ?? [];
      for (const b of blocks) {
        const byRoom = m.get(b.time);
        if (!byRoom) continue;
        for (const r of b.rooms) {
          if (!byRoom.has(r)) byRoom.set(r, new Set());
          byRoom.get(r)!.add(name);
        }
      }
    }
    return m;
  }, [data, day, allStaff]);

  /** Per-time list of staff that are "on the clock" somewhere this day,
   *  used to compute who is on lunch (working day overall but unassigned at t). */
  const onClockToday = useMemo(() => {
    const s = new Set<string>();
    for (const name of allStaff) {
      if ((data.staff_daily?.[name]?.[day]?.length ?? 0) > 0) s.add(name);
    }
    return s;
  }, [data, day, allStaff]);

  function update(mutate: (d: ScheduleData) => ScheduleData) {
    setData((d) => mutate(d));
    scheduleAutosave();
  }

  function assignAt(d: ScheduleData, name: string, time: string, room: string): ScheduleData {
    const sd = { ...(d.staff_daily ?? {}) };
    const byDay = { ...(sd[name] ?? {}) };
    const list = [...(byDay[day] ?? [])];
    const idx = list.findIndex((b) => b.time === time);
    if (idx >= 0) {
      const rooms = list[idx].rooms.includes(room) ? list[idx].rooms : [...list[idx].rooms, room];
      list[idx] = { time, rooms };
    } else {
      list.push({ time, rooms: [room] });
      list.sort((a, b) => DEFAULT_TIMES.indexOf(a.time) - DEFAULT_TIMES.indexOf(b.time));
    }
    byDay[day] = list;
    sd[name] = byDay;
    return { ...d, staff_daily: sd };
  }

  function unassignAt(d: ScheduleData, name: string, time: string, room: string): ScheduleData {
    const sd = { ...(d.staff_daily ?? {}) };
    const byDay = { ...(sd[name] ?? {}) };
    const list = [...(byDay[day] ?? [])];
    const idx = list.findIndex((b) => b.time === time);
    if (idx < 0) return d;
    const rooms = list[idx].rooms.filter((r) => r !== room);
    if (rooms.length === 0) list.splice(idx, 1);
    else list[idx] = { time, rooms };
    byDay[day] = list;
    sd[name] = byDay;
    return { ...d, staff_daily: sd };
  }

  function clearAt(d: ScheduleData, name: string, time: string): ScheduleData {
    const sd = { ...(d.staff_daily ?? {}) };
    const byDay = { ...(sd[name] ?? {}) };
    const list = (byDay[day] ?? []).filter((b) => b.time !== time);
    byDay[day] = list;
    sd[name] = byDay;
    return { ...d, staff_daily: sd };
  }

  function clearWholeDay(d: ScheduleData, name: string): ScheduleData {
    const sd = { ...(d.staff_daily ?? {}) };
    const byDay = { ...(sd[name] ?? {}) };
    byDay[day] = [];
    sd[name] = byDay;
    return { ...d, staff_daily: sd };
  }

  function onChipDragStart(e: React.DragEvent, p: DragPayload) {
    e.dataTransfer.setData("text/plain", JSON.stringify(p));
    e.dataTransfer.effectAllowed = "move";
    setDrag(p);
  }

  function onDragEnd() {
    setDrag(null);
    setHover(null);
  }

  function getPayload(e: React.DragEvent): DragPayload | null {
    try {
      const raw = e.dataTransfer.getData("text/plain");
      return raw ? (JSON.parse(raw) as DragPayload) : drag;
    } catch {
      return drag;
    }
  }

  function dropToCell(e: React.DragEvent, time: string, room: string) {
    e.preventDefault();
    const p = getPayload(e);
    setHover(null);
    setDrag(null);
    if (!p) return;
    if (p.fromTime === time && p.fromRoom === room) return;
    update((d) => {
      let next = d;
      if (p.fromTime && p.fromRoom) next = unassignAt(next, p.name, p.fromTime, p.fromRoom);
      next = assignAt(next, p.name, time, room);
      return next;
    });
  }

  function dropToLunch(e: React.DragEvent, time: string) {
    e.preventDefault();
    const p = getPayload(e);
    setHover(null);
    setDrag(null);
    if (!p) return;
    update((d) => clearAt(d, p.name, time));
  }

  function dropToOff(e: React.DragEvent) {
    e.preventDefault();
    const p = getPayload(e);
    setHover(null);
    setDrag(null);
    if (!p) return;
    update((d) => clearWholeDay(d, p.name));
  }

  const save = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    const snapshot = dataRef.current;
    const targetRowId = rowIdRef.current;
    const staff = { ...(snapshot.staff ?? {}) };
    for (const name of Object.keys(staff)) {
      let h = 0;
      for (const d of DAY_NAMES) {
        h += (snapshot.staff_daily?.[name]?.[d]?.length ?? 0) * 0.5;
      }
      staff[name] = { ...staff[name], hours: h };
    }
    const next: ScheduleData = { ...snapshot, staff };
    next.days = deriveDays(next);
    const { error } = await supabase
      .from("schedules")
      .update({ data: next as any })
      .eq("id", targetRowId);
    savingRef.current = false;
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setLastSavedAt(new Date());
    setErrorMsg(null);
    await qc.invalidateQueries({ queryKey: ["schedules"] });
    await qc.invalidateQueries({ queryKey: ["schedule"] });
    // If more edits landed mid-save, flush them now.
    if (pendingRef.current) {
      pendingRef.current = false;
      setStatus("pending");
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void save();
      }, AUTOSAVE_MS);
    } else {
      setStatus("idle");
    }
  }, [qc]);

  const scheduleAutosave = useCallback(() => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    setStatus("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save();
    }, AUTOSAVE_MS);
  }, [save]);

  function saveNow() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    void save();
  }

  // Warn the operator if they navigate away with unsaved or in-flight changes.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (status === "pending" || status === "saving" || status === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  // Flush a pending autosave on unmount so quick tab/row switches don't drop edits.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void save();
      }
    };
  }, [save]);

  function resetChanges() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingRef.current = false;
    setData(row.data);
    setStatus("idle");
    setErrorMsg(null);
  }

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-foreground">
          Drag-and-drop — {formatWeekRange(row.start_date)}
        </h2>
        <AutosaveStatus
          status={status}
          lastSavedAt={lastSavedAt}
          errorMsg={errorMsg}
          onRetry={saveNow}
          onDiscard={resetChanges}
        />
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

      <StaffPalette
        allStaff={allStaff}
        onClockToday={onClockToday}
        onDragStart={(name, e) => onChipDragStart(e, { name, fromTime: null, fromRoom: null })}
        onDragEnd={onDragEnd}
        onDropOff={dropToOff}
        hover={hover}
        setHover={setHover}
      />

      <p className="text-[11px] text-muted-foreground">
        Drag a staff chip into any room cell to assign. Drop on the
        <span className="inline-flex items-center gap-1 mx-1 align-baseline">
          <Coffee className="w-3 h-3" /> Lunch
        </span>
        column at a specific time to clear that 30-minute slot. Drop in the staff palette's
        <span className="inline-flex items-center gap-1 mx-1 align-baseline">
          <X className="w-3 h-3" /> Off
        </span>
        zone to clear the whole day.
      </p>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1 border border-border sticky left-0 bg-card z-10 w-16">
                Time
              </th>
              {rooms.map((r) => (
                <th
                  key={r}
                  className="p-1 text-center font-semibold text-foreground border border-border min-w-[110px]"
                >
                  {r}
                </th>
              ))}
              <th className="p-1 text-center font-semibold border border-border bg-amber-50 text-amber-900 min-w-[100px]">
                <span className="inline-flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Lunch
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_TIMES.map((time) => {
              const byRoom = workingByTime.get(time)!;
              const assignedNames = new Set<string>();
              for (const set of byRoom.values()) for (const n of set) assignedNames.add(n);
              const onLunch = [...onClockToday].filter((n) => !assignedNames.has(n));
              return (
                <tr key={time} className="align-top">
                  <td className="p-1 whitespace-nowrap font-medium text-muted-foreground border border-border sticky left-0 bg-card z-10">
                    {time}
                  </td>
                  {rooms.map((r) => {
                    const min = minimumFor(r, time);
                    const cellId = `${time}|${r}`;
                    const names = [...(byRoom.get(r) ?? [])];
                    if (min === null) {
                      return (
                        <td
                          key={r}
                          className="p-1 border border-border bg-closed/40 text-closed-foreground"
                        />
                      );
                    }
                    const under = names.length < min;
                    const isHover = hover === cellId;
                    return (
                      <td
                        key={r}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (hover !== cellId) setHover(cellId);
                        }}
                        onDragLeave={() => {
                          if (hover === cellId) setHover(null);
                        }}
                        onDrop={(e) => dropToCell(e, time, r)}
                        className={`p-1 border align-top transition-colors ${
                          isHover
                            ? "bg-primary/15 border-primary"
                            : under
                              ? "bg-destructive/10 border-destructive/40"
                              : "border-border"
                        }`}
                      >
                        <div className="flex flex-wrap gap-1 min-h-7">
                          {names.map((n) => (
                            <Chip
                              key={n}
                              name={n}
                              tone={under ? "danger" : "default"}
                              onDragStart={(e) =>
                                onChipDragStart(e, { name: n, fromTime: time, fromRoom: r })
                              }
                              onDragEnd={onDragEnd}
                            />
                          ))}
                          {names.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/60 italic">
                              need {min}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const id = `lunch|${time}`;
                      if (hover !== id) setHover(id);
                    }}
                    onDragLeave={() => {
                      const id = `lunch|${time}`;
                      if (hover === id) setHover(null);
                    }}
                    onDrop={(e) => dropToLunch(e, time)}
                    className={`p-1 border align-top transition-colors ${
                      hover === `lunch|${time}` ? "bg-amber-200 border-amber-500" : "bg-amber-50/70 border-amber-200"
                    }`}
                  >
                    <div className="flex flex-wrap gap-1 min-h-7">
                      {onLunch.map((n) => (
                        <Chip
                          key={n}
                          name={n}
                          tone="lunch"
                          onDragStart={(e) =>
                            onChipDragStart(e, { name: n, fromTime: null, fromRoom: null })
                          }
                          onDragEnd={onDragEnd}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Chip({
  name,
  tone,
  onDragStart,
  onDragEnd,
}: {
  name: string;
  tone: "default" | "danger" | "lunch" | "muted";
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const cls =
    tone === "danger"
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : tone === "lunch"
        ? "bg-amber-200 text-amber-900 border-amber-300"
        : tone === "muted"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-primary/15 text-primary border-primary/30";
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[11px] font-medium cursor-grab active:cursor-grabbing select-none ${cls}`}
      title={`Drag ${name}`}
    >
      <GripVertical className="w-2.5 h-2.5 opacity-60" />
      {name}
    </span>
  );
}

function StaffPalette({
  allStaff,
  onClockToday,
  onDragStart,
  onDragEnd,
  onDropOff,
  hover,
  setHover,
}: {
  allStaff: string[];
  onClockToday: Set<string>;
  onDragStart: (name: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDropOff: (e: React.DragEvent) => void;
  hover: string | null;
  setHover: (v: string | null) => void;
}) {
  const off = allStaff.filter((n) => !onClockToday.has(n));
  if (allStaff.length === 0) {
    return (
      <div className="bg-secondary/40 rounded-xl p-3 text-sm text-muted-foreground">
        Add staff in the Edit Schedule tab first.
      </div>
    );
  }
  return (
    <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          Off today — drag into the grid to schedule
        </span>
        <span
          onDragOver={(e) => {
            e.preventDefault();
            if (hover !== "off") setHover("off");
          }}
          onDragLeave={() => {
            if (hover === "off") setHover(null);
          }}
          onDrop={onDropOff}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${
            hover === "off"
              ? "bg-destructive/15 text-destructive border-destructive"
              : "bg-card text-muted-foreground border-border"
          }`}
          title="Drop here to remove from this day entirely"
        >
          <X className="w-3 h-3" /> Off
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {off.length === 0 && (
          <span className="text-[11px] text-muted-foreground italic">
            Everyone is scheduled today.
          </span>
        )}
        {off.map((n) => (
          <Chip
            key={n}
            name={n}
            tone="muted"
            onDragStart={(e) => onDragStart(n, e)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}