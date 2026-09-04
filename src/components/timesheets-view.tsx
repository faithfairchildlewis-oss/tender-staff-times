import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { getTimeClockEntries } from "@/lib/time-clock.functions";
import { useLiveSchedules } from "@/hooks/use-schedule";
import { DAYS, dayHours, type ScheduleData } from "@/data/schedule";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3600000;
}

/** Local calendar date (YYYY-MM-DD) for a timestamp. */
function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Day offset (0 = Monday) between a week start date and a date key, or null. */
function dayOffset(start: string, dateKey: string): number | null {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [dy, dm, dd] = dateKey.split("-").map(Number);
  const a = Date.UTC(sy, sm - 1, sd);
  const b = Date.UTC(dy, dm - 1, dd);
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 && diff <= 4 ? diff : null;
}

function scheduledHoursFor(
  schedules: (ScheduleData & { start_date?: string | null })[] | undefined,
  name: string,
  clockIn: string,
): number | null {
  if (!schedules || schedules.length === 0) return null;
  const key = localDateKey(clockIn);
  for (const sched of schedules) {
    if (!sched.start_date) continue;
    const off = dayOffset(sched.start_date, key);
    if (off === null) continue;
    if (!sched.staff || !(name in sched.staff)) return null;
    return dayHours(sched, name, DAYS[off]);
  }
  return null;
}

export function TimesheetsView() {
  const { data: schedules } = useLiveSchedules();
  const fetchEntries = useServerFn(getTimeClockEntries);
  const { data: entries, isLoading } = useQuery({
    queryKey: ["time_clock_entries"],
    queryFn: () => fetchEntries(),
  });
  const [search, setSearch] = useState("");

  const rows = (entries ?? []).filter(
    (e) =>
      search.trim() === "" ||
      e.staff_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Timesheets</h2>
        <span className="text-sm text-muted-foreground">{rows.length} entries</span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by staff name…"
        className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No clock entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-separate border-spacing-y-2 min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Staff</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Clock In</th>
                <th className="px-3 py-2 font-semibold">Clock Out</th>
                <th className="px-3 py-2 font-semibold text-right">Hours</th>
                <th className="px-3 py-2 font-semibold text-right">Scheduled</th>
                <th className="px-3 py-2 font-semibold text-right">Diff</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const actual = e.clock_out ? hoursBetween(e.clock_in, e.clock_out) : null;
                const sched = scheduledHoursFor(schedules, e.staff_name, e.clock_in);
                const diff = actual !== null && sched !== null ? actual - sched : null;
                const notable = diff !== null && Math.abs(diff) > 0.5;
                return (
                <tr key={e.id} className="bg-secondary">
                  <td className="px-3 py-3 font-semibold text-foreground rounded-l-xl">
                    {e.staff_name}
                  </td>
                  <td className="px-3 py-3 text-foreground whitespace-nowrap">
                    {fmtDate(e.clock_in)}
                  </td>
                  <td className="px-3 py-3 text-foreground whitespace-nowrap">
                    {fmtTime(e.clock_in)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {e.clock_out ? (
                      <span className="text-foreground">{fmtTime(e.clock_out)}</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                        Still in
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {actual !== null ? actual.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {sched !== null ? sched.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right rounded-r-xl">
                    {diff === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : notable ? (
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold " +
                          (diff > 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-foreground">
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
