import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Home, CalendarDays, TreePine, Nut, CalendarOff } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { PageBanner } from "@/components/page-banner";
import { useLiveSchedules } from "@/hooks/use-schedule";
import { deriveDays, DAY_NAMES, DEFAULT_ROOMS } from "@/lib/schedule-derive";

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
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Room Schedule — Tender Years of Deale" },
      { name: "description", content: "Daily classroom staffing assignments and coverage by time slot for Tender Years of Deale." },
      { property: "og:title", content: "Room Schedule — Tender Years of Deale" },
      { property: "og:description", content: "Daily classroom staffing assignments and coverage by time slot for Tender Years of Deale." },
      { property: "og:url", content: "/rooms" },
    ],
    links: [{ rel: "canonical", href: "/rooms" }],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { data: schedules, isLoading } = useLiveSchedules();
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [flashWeek, setFlashWeek] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const triggerFlash = (weekIdx: number) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashWeek(weekIdx);
    flashTimeoutRef.current = setTimeout(() => setFlashWeek(null), 1500);
  };

  // Auto-scroll to current week on first load
  useEffect(() => {
    if (tabs.length === 0) return;
    const btn = buttonRefs.current[currentWeekStartTab];
    const strip = stripRef.current;
    if (btn && strip) {
      strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
    }
    const weekIdx = tabs[currentWeekStartTab]?.weekIdx;
    if (weekIdx !== undefined) triggerFlash(weekIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, currentWeekStartTab]);

  const scrollToCurrentWeek = () => {
    setActiveIdx(currentWeekStartTab);
    const btn = buttonRefs.current[currentWeekStartTab];
    const strip = stripRef.current;
    if (btn && strip) {
      strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
    }
    const weekIdx = tabs[currentWeekStartTab]?.weekIdx;
    if (weekIdx !== undefined) triggerFlash(weekIdx);
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
  return (
    <div className="min-h-dvh bg-background pb-6">
      <PageBanner
        title={
          <span className="inline-flex items-center gap-2">
            <Nut className="w-4 h-4" aria-hidden="true" />
            Our Rooms
            <TreePine className="w-4 h-4" aria-hidden="true" />
          </span>
        }
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground/15 text-primary-foreground"
          >
            <CalendarDays className="w-4 h-4" /> My Week
          </button>
          <span
            aria-current="page"
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground text-primary"
          >
            <TreePine className="w-4 h-4" /> Our Rooms
          </span>
          <button
            type="button"
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground/15 text-primary-foreground"
          >
            <CalendarOff className="w-4 h-4" /> Request Off
          </button>
        </div>
      </PageBanner>

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-4">
        <div ref={stripRef} className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-3 w-max min-w-full items-center">
            {/* Selected day indicator — sticky while scrolling weeks */}
            <div className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2 flex flex-col items-center justify-center gap-0.5 shrink-0 self-stretch">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{active?.shortLabel}</span>
              <span className="text-[10px] text-muted-foreground">{active?.mmdd}</span>
            </div>

            {weeks.map((w, wi) => {
              const weekTabs = tabs
                .map((t, i) => ({ t, i }))
                .filter(({ t }) => t.weekIdx === wi);
              const weekLabel = mmddFor(w.schedule.start_date, 0);
              const isFlashing = wi === flashWeek;
              return (
                <div
                  key={wi}
                  className={`flex flex-col gap-1 rounded-xl p-1 transition-all duration-300 ${
                    wi % 2 === 0 ? "bg-secondary" : "bg-accent/40"
                  } ${isFlashing ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                >
                  <div className="px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Week of {weekLabel}
                  </div>
                  <div className="flex gap-1">
                    {weekTabs.map(({ t, i }) => {
                      const isActive = i === activeIdx;
                      return (
                        <button
                          key={`${t.weekIdx}-${t.dayIdx}`}
                          ref={(el) => { buttonRefs.current[i] = el; }}
                          onClick={() => setActiveIdx(i)}
                          className={`shrink-0 px-3 min-h-11 min-w-[68px] rounded-lg transition-all duration-300 flex flex-col items-center justify-center leading-tight ${
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
              );
            })}
          </div>
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
