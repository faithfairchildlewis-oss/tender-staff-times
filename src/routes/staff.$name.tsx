import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, TreePine, MessageSquare, Utensils, PartyPopper } from "lucide-react";

import { blocksForDay, dayHours, weeklyHours } from "@/data/schedule";
import { useCurrentSchedule, useLiveSchedules } from "@/hooks/use-schedule";
import { formatWeekRange } from "@/lib/format-date";
import { PageBanner } from "@/components/page-banner";
import { holidayForOffset } from "@/lib/holidays";
import { buildDayItems } from "@/lib/day-items";

export const Route = createFileRoute("/staff/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name}'s Schedule — Tender Years of Deale` },
      { name: "description", content: `Weekly shift schedule, room assignments, and lunch times for ${params.name} at Tender Years of Deale.` },
      { property: "og:title", content: `${params.name}'s Schedule — Tender Years of Deale` },
      { property: "og:description", content: `Weekly shift schedule, room assignments, and lunch times for ${params.name} at Tender Years of Deale.` },
      { property: "og:url", content: `/staff/${params.name}` },
    ],
    links: [{ rel: "canonical", href: `/staff/${params.name}` }],
  }),
  component: StaffPage,
});


function StaffPage() {
  const { name } = Route.useParams();
  const { data: schedule, isLoading } = useCurrentSchedule();
  const { data: liveSchedules } = useLiveSchedules();
  if (isLoading || !schedule) {
    return <div className="min-h-dvh bg-background p-6 text-muted-foreground">Loading…</div>;
  }
  const info = schedule.staff[name];
  if (!info) {
    return (
      <div className="min-h-dvh bg-background p-6">
        <p className="text-foreground">No schedule found for {name}.</p>
        <Link to="/" className="text-primary underline mt-3 inline-block">Back to names</Link>
      </div>
    );
  }
  const hours = weeklyHours(schedule, name);

  // Pay period: every 2 weeks, anchored to May 25, 2026 (Mon)
  const ANCHOR = new Date(2026, 4, 25);
  const today = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const msPerPeriod = 14 * msPerDay;
  const periodsElapsed = Math.floor((today.getTime() - ANCHOR.getTime()) / msPerPeriod);
  const periodStart = new Date(ANCHOR.getTime() + periodsElapsed * msPerPeriod);
  const periodEnd = new Date(periodStart.getTime() + msPerPeriod - 1);
  // Next payday = first Friday strictly after periodEnd
  const payday = new Date(periodEnd);
  payday.setHours(0, 0, 0, 0);
  const dow = payday.getDay(); // 0=Sun..6=Sat
  const daysToFri = ((5 - dow + 7) % 7) || 7;
  payday.setDate(payday.getDate() + daysToFri);
  const daysUntilPayday = Math.max(
    0,
    Math.ceil((payday.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / msPerDay),
  );
  const formatShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatFull = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Sum hours across all live schedules whose start_date falls inside the pay period.
  const periodHours = (liveSchedules ?? []).reduce((sum, s) => {
    if (!s.start_date) return sum;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.start_date);
    if (!m) return sum;
    const sd = new Date(+m[1], +m[2] - 1, +m[3]);
    if (sd >= periodStart && sd <= periodEnd) {
      return sum + weeklyHours(s, name);
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageBanner
        title={`${name}'s Schedule`}
      >
        <div className="flex gap-2">
          <Link
            to="/staff/$name"
            params={{ name }}
            activeOptions={{ exact: true }}
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground text-primary"
          >
            <CalendarDays className="w-4 h-4" /> My Week
          </Link>
          <Link
            to="/rooms"
            search={{ from: name }}
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground/15 text-primary-foreground"
          >
            <TreePine className="w-4 h-4" /> Our Rooms
          </Link>
          <a
            href={`sms:+14104744156?&body=${encodeURIComponent(
              "Hi, I would like to request time off.\nMy name: " +
                name +
                "\nWeek: " +
                (schedule.start_date ? formatWeekRange(schedule.start_date) : schedule.week ?? "—") +
                "\nDate(s) requested: \nReason: "
            )}`}
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground/15 text-primary-foreground"
          >
            <MessageSquare className="w-4 h-4" /> Request Off
          </a>
        </div>
      </PageBanner>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <div className="bg-lilac text-lilac-foreground rounded-2xl p-5 shadow-sm">
          <div className="text-center">
            <div className="text-4xl font-bold">{hours.toFixed(1)}</div>
            <div className="text-sm opacity-90 mt-1">hours this week</div>
          </div>
          <div className="mt-4 pt-4 border-t border-lilac-foreground/20 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="font-semibold whitespace-nowrap">Pay Period</span>
              <div className="flex-1 text-right">
                <div>{formatShort(periodStart)} – {formatShort(periodEnd)}</div>
                <div className="opacity-80 text-xs mt-0.5">{periodHours.toFixed(1)} hrs to date</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold whitespace-nowrap">💰 Payday</span>
              <div className="flex-1 text-right">
                <div>{formatFull(payday)}</div>
                <div className="opacity-80 text-xs mt-0.5">
                  {daysUntilPayday === 0 ? "today" : `${daysUntilPayday} day${daysUntilPayday === 1 ? "" : "s"} away`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-base font-semibold text-foreground mt-6 mb-3 px-1">
          Shifts, Classes &amp; Lunch
        </h2>

        <div>
          {(() => {
            const weeks =
              liveSchedules && liveSchedules.length > 0
                ? liveSchedules.slice().sort((a, b) =>
                    (a.start_date ?? "").localeCompare(b.start_date ?? ""),
                  )
                : [schedule];
            const showDividers = !!(liveSchedules && liveSchedules.length > 0);
            return weeks.map((sched) => {
              const weekLabel = sched.start_date
                ? formatWeekRange(sched.start_date)
                : sched.week ?? "—";
              const sInfo = sched.staff[name] ?? info;
              return (
                <div key={sched.start_date ?? weekLabel}>
                  {showDividers && (
                    <div className="flex items-center gap-3 py-2">
                      <hr className="flex-1 border-border" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {weekLabel}
                      </span>
                      <hr className="flex-1 border-border" />
                    </div>
                  )}
                  <div className="space-y-3 mb-6">
                    {sched.days.map((d, dayIdx) => {
                      const blocks = blocksForDay(sched, name, d.day);
                      const hrs = dayHours(sched, name, d.day);
                      const off = blocks.length === 0;
                      const brk = sInfo.daily_breaks?.[d.day];
                      const closedReason = holidayForOffset(sched.start_date, dayIdx);
                      return (
              <div key={`${weekLabel}-${d.day}`} className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <div className="font-semibold text-base text-foreground inline-flex items-center gap-1.5">
                      {d.day}
                      {closedReason && (
                        <PartyPopper className="w-4 h-4 text-closed-foreground" aria-label="Closed" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                  </div>
                  {closedReason ? (
                    <span
                      aria-label={`Closed for ${closedReason}`}
                      className="bg-closed text-closed-foreground text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1"
                    >
                      <PartyPopper className="w-3 h-3" /> CLOSED
                    </span>
                  ) : off && (
                    <span
                      aria-label="Not scheduled"
                      className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full"
                    >
                      OFF
                    </span>
                  )}
                </div>
                {closedReason ? (
                  <div className="px-4 py-4 bg-closed/20 text-sm text-closed-foreground font-medium">
                    Center closed — {closedReason}
                  </div>
                ) : !off && (() => {
                  const showLunch = hrs >= 6;
                  const lunchTime =
                    showLunch && sInfo.lunch.type === "fixed" && typeof sInfo.lunch.time === "string"
                      ? sInfo.lunch.time
                      : null;
                  const items = buildDayItems(
                    blocks,
                    lunchTime,
                    brk?.type === "lunch" ? "Lunch" : "Break",
                  );
                  return (
                    <ul className="divide-y divide-border list-none">
                      {items.map((it, i) =>
                        it.kind === "shift" ? (
                          <li key={i} className="flex items-center justify-between px-4 py-3">
                            <div className="text-base text-foreground">
                              {it.start} – {it.end}
                            </div>
                            <div
                              className="flex flex-wrap gap-1 justify-end"
                              aria-label={`Classes: ${it.rooms.map(roomToClass).join(", ")}`}
                            >
                              {it.rooms.map((r) => (
                                <span
                                  key={r}
                                  className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full"
                                >
                                  {roomToClass(r)}
                                </span>
                              ))}
                            </div>
                          </li>
                        ) : (
                          <li key={i} className="flex items-center gap-3 px-4 py-3 bg-secondary/50">
                            <Utensils className="w-4 h-4 text-primary" aria-hidden="true" />
                            <span className="text-sm text-foreground">
                              {it.label}: {it.time}
                            </span>
                          </li>
                        )
                      )}
                      {showLunch && !lunchTime && (
                        <li className="flex items-center gap-3 px-4 py-3 bg-secondary/50">
                          <Utensils className="w-4 h-4 text-primary" aria-hidden="true" />
                          <span className="text-sm text-muted-foreground italic">
                            Check with director
                          </span>
                        </li>
                      )}
                    </ul>
                  );
                })()}
              </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        <div className="mt-6" />
      </main>

      <div className="h-6" aria-hidden="true" />
    </div>
  );
}

/** Replace the word "Room" in a room/class label with "Class". */
function roomToClass(label: string): string {
  return label.replace(/\bRoom\b/gi, "Class");
}