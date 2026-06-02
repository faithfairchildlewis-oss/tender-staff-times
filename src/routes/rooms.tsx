import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, CalendarDays } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { PageBanner } from "@/components/page-banner";
import { useLiveSchedules } from "@/hooks/use-schedule";
import { deriveDays, DAY_NAMES, DEFAULT_ROOMS } from "@/lib/schedule-derive";
import { formatWeekRange } from "@/lib/format-date";

type TabDay = {
  weekIdx: number;
  dayIdx: number;
  dayName: string;
  shortLabel: string; // "Mon"
  mmdd: string;       // "06-01"
};

/** Compute MM-DD for a given day index within a week starting at start_date
 *  (YYYY-MM-DD). Parses parts to avoid timezone shifts. */
function mmddFor(startDate: string | null | undefined, dayOffset: number): string {
  if (!startDate) return "";
  const m = startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + dayOffset));
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [{ title: "Room Schedule — Tender Years of Deale" }],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { data: schedules, isLoading } = useLiveSchedules();
  const [activeIdx, setActiveIdx] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const weeks = useMemo(
    () =>
      (schedules ?? []).map((s) => ({
        schedule: s,
        days: deriveDays(s),
      })),
    [schedules],
  );

  const tabs: TabDay[] = useMemo(() => {
    const out: TabDay[] = [];
    weeks.forEach((w, wi) => {
      DAY_NAMES.forEach((name, di) => {
        out.push({
          weekIdx: wi,
          dayIdx: di,
          dayName: name,
          shortLabel: name.slice(0, 3),
          mmdd: mmddFor(w.schedule.start_date, di),
        });
      });
    });
    return out;
  }, [weeks]);

  const currentWeekStartTab = useMemo(() => {
    if (!schedules || schedules.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    for (let wi = 0; wi < weeks.length; wi++) {
      const sd = weeks[wi].schedule.start_date;
      if (!sd) continue;
      const m = sd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) continue;
      const startUTC = Date.UTC(+m[1], +m[2] - 1, +m[3]);
      const endUTC = startUTC + 4 * 24 * 60 * 60 * 1000; // Friday
      if (todayUTC >= startUTC && todayUTC <= endUTC) {
        return wi * 5; // first day (Mon) of that week
      }
    }
    // Fallback: nearest upcoming week, or last week if all past
    for (let wi = 0; wi < weeks.length; wi++) {
      const sd = weeks[wi].schedule.start_date;
      if (!sd) continue;
      const m = sd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) continue;
      const startUTC = Date.UTC(+m[1], +m[2] - 1, +m[3]);
      if (todayUTC < startUTC) return wi * 5;
    }
    return (weeks.length - 1) * 5;
  }, [schedules, weeks]);

  // Auto-scroll to current week on first load
  useEffect(() => {
    if (tabs.length === 0) return;
    const btn = buttonRefs.current[currentWeekStartTab];
    const strip = stripRef.current;
    if (btn && strip) {
      strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
    }
  }, [tabs.length, currentWeekStartTab]);

  const scrollToCurrentWeek = () => {
    setActiveIdx(currentWeekStartTab);
    const btn = buttonRefs.current[currentWeekStartTab];
    const strip = stripRef.current;
    if (btn && strip) {
      strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return <div className="min-h-dvh bg-background p-6 text-muted-foreground">Loading…</div>;
  }
  if (!schedules || schedules.length === 0) {
    return (
      <div className="min-h-dvh bg-background p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-primary mb-4"
        >
          <Home className="w-4 h-4" /> Home
        </Link>
        <h1 className="text-xl font-bold text-foreground">Our Rooms</h1>
        <p className="text-muted-foreground mt-2">
          No live schedule has been published yet. Check back once the director marks a week as Live.
        </p>
      </div>
    );
  }

  const active = tabs[Math.min(activeIdx, tabs.length - 1)];
  const week = weeks[active.weekIdx];
  const day = week.days[active.dayIdx];
  const schedule = week.schedule;
  const rooms = schedule.rooms?.length ? schedule.rooms : DEFAULT_ROOMS;
  const weekLabel = schedule.start_date ? formatWeekRange(schedule.start_date) : schedule.week;

  return (
    <div className="min-h-dvh bg-background pb-6">
      <PageBanner title="Our Rooms" subline={weekLabel} />

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <div ref={stripRef} className="overflow-x-auto -mx-4 px-4 flex-1">
            <div className="flex gap-1 bg-secondary rounded-xl p-1 w-max min-w-full">
              {tabs.map((t, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={`${t.weekIdx}-${t.dayIdx}`}
                    ref={(el) => { buttonRefs.current[i] = el; }}
                    onClick={() => setActiveIdx(i)}
                    className={`shrink-0 px-3 min-h-11 rounded-lg transition flex flex-col items-center justify-center leading-tight ${
                      weeks.length > 1 ? "min-w-[68px]" : "flex-1"
                    } ${
                      isActive ? "bg-card text-foreground shadow" : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{t.shortLabel}</span>
                    {t.mmdd && <span className="text-[10px] opacity-80">{t.mmdd}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {weeks.length > 1 && (
            <button
              onClick={scrollToCurrentWeek}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition"
              title="Jump to this week"
            >
              <CalendarDays className="w-4 h-4" />
              This week
            </button>
          )}
        </div>

        <section className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{day?.day ?? "—"}</h2>
            <span className="text-sm text-muted-foreground">{day?.date ?? ""}</span>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-1.5 border border-border sticky left-0 bg-card min-w-[60px]">
                    Time
                  </th>
                  {rooms.map((r) => (
                    <th
                      key={r}
                      className={`p-1.5 text-center font-semibold text-foreground border border-border min-w-[70px] ${
                        r === "M.O.D." || r === "Room I" || r === "J/K" ? "bg-lilac text-lilac-foreground" : ""
                      }`}
                    >
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day?.slots.map((slot) => {
                  const hasStaff = rooms.some((r) => {
                    const arr = slot.assignments[r];
                    return arr && arr.length > 0;
                  });
                  if (!hasStaff) return null;
                  return (
                    <tr key={slot.time}>
                      <td className="p-1.5 border border-border font-medium sticky left-0 bg-card">
                        {slot.time}
                      </td>
                      {rooms.map((r) => {
                        const staffed = slot.assignments[r] ?? [];
                        const under = slot.understaffed.includes(r);
                        const highlight = r === "M.O.D." || r === "Room I" || r === "J/K";
                        return (
                          <td
                            key={r}
                            className={`p-1.5 border border-border text-center ${
                              under
                                ? "bg-destructive/10 text-destructive"
                                : highlight
                                  ? "bg-lilac/30"
                                  : ""
                            }`}
                          >
                            {staffed.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {staffed.map((n) => (
                                  <span key={n} className="font-medium text-foreground">{n}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
      </main>
    </div>
  );
}
