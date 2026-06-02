import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Building2, MessageSquare, Utensils, Share2 } from "lucide-react";
import { useState } from "react";
import { blocksForDay, dayHours, weeklyHours } from "@/data/schedule";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { formatWeekRange } from "@/lib/format-date";
import { getDailyContent } from "@/data/daily-content";
import { PageBanner } from "@/components/page-banner";

export const Route = createFileRoute("/staff/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${params.name} — Schedule` }],
  }),
  component: StaffPage,
});

function buildShareText(
  name: string,
  schedule: NonNullable<ReturnType<typeof useCurrentSchedule>['data']>
): string {
  const weekText = schedule.start_date
    ? formatWeekRange(schedule.start_date)
    : schedule.week ?? "";
  const lines: string[] = [`${name}'s Schedule — Week of ${weekText}`];
  for (const d of schedule.days) {
    const info = schedule.staff[name];
    if (!info) continue;
    const blocks = blocksForDay(schedule, name, d.day);
    if (blocks.length === 0) {
      lines.push(`${d.day}: OFF`);
      continue;
    }
    const hrs = dayHours(schedule, name, d.day);
    const showLunch = hrs >= 6;
    const lunchTime =
      showLunch && info.lunch.type === "fixed" && typeof info.lunch.time === "string"
        ? info.lunch.time
        : null;
    const dayLines: string[] = [];
    for (const b of blocks) {
      const rooms = b.rooms.map(roomToClass).join(", ");
      dayLines.push(`${b.start} – ${b.end} (${rooms})`);
    }
    if (lunchTime) {
      const brk = info.daily_breaks?.[d.day];
      dayLines.push(`${brk?.type === "lunch" ? "Lunch" : "Break"}: ${lunchTime}`);
    }
    lines.push(`${d.day}: ${dayLines.join("; ")}`);
  }
  const total = weeklyHours(schedule, name);
  lines.push(`Total: ${total.toFixed(1)} hours`);
  return lines.join("\n");
}

function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      // fallback to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };
  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1 text-xs font-semibold min-h-9 px-3 rounded-lg bg-primary-foreground/15 text-primary-foreground active:scale-[0.97] transition"
      aria-label="Share schedule"
    >
      <Share2 className="w-4 h-4" />
      {copied ? "Copied" : "Share"}
    </button>
  );
}

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

  const { verse, encouragement: subline } = getDailyContent(new Date().getDate());

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageBanner
        title={`Hello, ${name}`}
        subline={subline}
        rightSlot={<ShareButton text={buildShareText(name, schedule)} />}
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
            className="flex-1 min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 bg-primary-foreground/15 text-primary-foreground"
          >
            <Building2 className="w-4 h-4" /> Our Rooms
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

      <main className="px-4 mt-4 max-w-md mx-auto">
        <section className="bg-card rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-sm font-semibold text-foreground">Verse of Day</p>
          <p className="text-sm italic text-muted-foreground mt-1">"{verse.text}"</p>
          <p className="text-xs text-muted-foreground mt-0.5">{verse.ref}</p>
        </section>

        <div className="bg-lilac text-lilac-foreground rounded-2xl p-5 shadow-sm text-center">
          <div className="text-4xl font-bold">{hours.toFixed(1)}</div>
          <div className="text-sm opacity-90 mt-1">hours this week</div>
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

        <div className="mt-6 text-center">
          <Link to="/rooms" className="text-sm text-primary underline inline-flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Our Rooms
          </Link>
        </div>
      </main>

      <div className="h-6" aria-hidden="true" />
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