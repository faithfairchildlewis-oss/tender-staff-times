import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, CalendarDays, Building2, MessageSquare, Utensils } from "lucide-react";
import { blocksForDay, dayHours, weeklyHours } from "@/data/schedule";
import { useCurrentSchedule } from "@/hooks/use-schedule";

export const Route = createFileRoute("/staff/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${params.name} — Schedule` }],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { name } = Route.useParams();
  const { data: schedule, isLoading } = useCurrentSchedule();
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

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-md">
        <Link
          to="/"
          aria-label="Home"
          className="inline-flex items-center gap-1 text-primary-foreground/90 hover:text-primary-foreground mb-3 min-h-11 -ml-2 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="text-sm">Home</span>
        </Link>
        <h1 className="text-2xl font-bold">Hello, {name}!</h1>
        <p className="text-base opacity-90 mt-1">Your schedule this week</p>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <div className="bg-lilac text-lilac-foreground rounded-2xl p-5 shadow-sm text-center">
          <div className="text-4xl font-bold">{hours.toFixed(1)}</div>
          <div className="text-sm opacity-90 mt-1">hours this week</div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Link
            to="/schedule"
            className="flex flex-col items-center justify-center gap-1 bg-card border border-border rounded-xl p-3 min-h-[72px] text-foreground hover:bg-accent transition active:scale-[0.98]"
          >
            <CalendarDays className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold">My Week</span>
          </Link>
          <Link
            to="/rooms"
            className="flex flex-col items-center justify-center gap-1 bg-card border border-border rounded-xl p-3 min-h-[72px] text-foreground hover:bg-accent transition active:scale-[0.98]"
          >
            <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold">Our Day</span>
          </Link>
          <a
            href={`sms:+14104744156?&body=${encodeURIComponent("Hi, I would like to request time off.\nMy name: " + name + "\nDate(s) requested: \nReason: ")}`}
            className="flex flex-col items-center justify-center gap-1 bg-card border border-border rounded-xl p-3 min-h-[72px] text-foreground hover:bg-accent transition active:scale-[0.98]"
          >
            <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold">Request Off</span>
          </a>
        </div>

        <h2 className="text-base font-semibold text-foreground mt-6 mb-3 px-1">
          Shifts, Classes &amp; Lunch
        </h2>

        <div className="space-y-3">
          {schedule.days.map((d) => {
            const blocks = blocksForDay(schedule, name, d.day);
            const hrs = dayHours(schedule, name, d.day);
            const off = blocks.length === 0;
            const brk = info.daily_breaks?.[d.day];
            return (
              <div key={d.day} className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <div className="font-semibold text-base text-foreground">{d.day}</div>
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                  </div>
                  {off && (
                    <span
                      aria-label="Not scheduled"
                      className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full"
                    >
                      OFF
                    </span>
                  )}
                </div>
                {!off && (() => {
                  const showLunch = hrs >= 6;
                  const lunchTime =
                    showLunch && info.lunch.type === "fixed" && typeof info.lunch.time === "string"
                      ? info.lunch.time
                      : null;
                  const lunchStartMin = lunchTime ? parseClockToMin(lunchTime) : null;
                  type Item =
                    | { kind: "shift"; start: string; end: string; rooms: string[]; sort: number }
                    | { kind: "lunch"; label: string; time: string; sort: number };
                  const items: Item[] = blocks.map((b) => ({
                    kind: "shift" as const,
                    start: b.start,
                    end: b.end,
                    rooms: b.rooms,
                    sort: parseClockToMin(b.start) ?? 0,
                  }));
                  if (lunchTime && lunchStartMin !== null) {
                    items.push({
                      kind: "lunch",
                      label: brk?.type === "lunch" ? "Lunch" : "Break",
                      time: lunchTime,
                      sort: lunchStartMin,
                    });
                  }
                  items.sort((a, b) => a.sort - b.sort);
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
      </main>

      <nav
        aria-label="Page navigation"
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border px-4 py-2 flex justify-between max-w-md mx-auto"
      >
        <Link
          to="/"
          className="text-sm font-medium text-primary inline-flex items-center min-h-11 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← All names
        </Link>
        <Link
          to="/schedule"
          className="text-sm font-medium text-primary inline-flex items-center min-h-11 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Full schedule →
        </Link>
      </nav>
    </div>
  );
}

/** Replace the word "Room" in a room/class label with "Class". */
function roomToClass(label: string): string {
  return label.replace(/\bRoom\b/gi, "Class");
}

/** Parse "8:30 AM" or "12:30 PM" into minutes since midnight. Returns null on parse failure. */
function parseClockToMin(s: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}