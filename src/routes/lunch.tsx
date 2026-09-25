import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { DAYS } from "@/data/schedule";
import { monthDayFor } from "@/lib/format-date";

export const Route = createFileRoute("/lunch")({
  head: () => ({
    meta: [
      { title: "Today's Lunch Schedule — Tender Years of Deale" },
      { name: "description", content: "Who is on lunch today at Tender Years of Deale and who is covering their room." },
      { property: "og:title", content: "Today's Lunch Schedule — Tender Years of Deale" },
      { property: "og:description", content: "Who is on lunch today at Tender Years of Deale and who is covering their room." },
      { property: "og:url", content: "/lunch" },
    ],
    links: [{ rel: "canonical", href: "/lunch" }],
  }),
  component: LunchPage,
});

type LunchRow = {
  name: string;
  start: string;
  end: string;
  cover: string[];
};

function LunchPage() {
  const { data: schedule, isLoading } = useCurrentSchedule();

  // Figure out which weekday today is (Mon–Fri only)
  const todayIdx = (() => {
    const jsDay = new Date().getDay(); // 0=Sun..6=Sat
    if (jsDay < 1 || jsDay > 5) return -1;
    return jsDay - 1; // Monday=0 … Friday=4
  })();

  const rows: LunchRow[] = [];
  let covered = false;

  if (schedule && todayIdx >= 0) {
    // Does the current schedule's week actually contain today?
    const start = schedule.start_date ?? null;
    if (start) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(start);
      if (m) {
        const monday = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + todayIdx);
        const now = new Date();
        covered =
          dayDate.getFullYear() === now.getFullYear() &&
          dayDate.getMonth() === now.getMonth() &&
          dayDate.getDate() === now.getDate();
      }
    }

    if (covered) {
      const dayName = DAYS[todayIdx];
      const daySlots = schedule.days.find((d) => d.day === dayName)?.slots ?? [];

      for (const name of Object.keys(schedule.staff_daily ?? {})) {
        const slots = schedule.staff_daily[name]?.[dayName] ?? [];
        if (slots.length === 0) continue;

        // Breaks = gaps between consecutive worked slots (non-contiguous times)
        const toMin = (t: string) => {
          const mm = /(\d+):(\d+)\s*(AM|PM)/i.exec(t);
          if (!mm) return 0;
          let h = Number(mm[1]) % 12;
          if (mm[3].toUpperCase() === "PM") h += 12;
          return h * 60 + Number(mm[2]);
        };
        const fmt = (m: number) => {
          const h = Math.floor(m / 60), mi = m % 60;
          return `${h % 12 || 12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
        };
        const sorted = [...slots].sort((a, b) => toMin(a.time) - toMin(b.time));
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = toMin(sorted[i - 1].time) + 30;
          const next = toMin(sorted[i].time);
          if (next <= prevEnd) continue;
          const gapTimes = new Set<string>();
          for (let t = prevEnd; t < next; t += 30) gapTimes.add(fmt(t));
          const cover = new Set<string>();
          for (const ds of daySlots) {
            if (!gapTimes.has(ds.time)) continue;
            for (const room of sorted[i - 1].rooms) {
              for (const person of ds.assignments?.[room] ?? []) {
                if (person !== name) cover.add(person);
              }
            }
          }
          rows.push({ name, start: fmt(prevEnd), end: sorted[i].time, cover: Array.from(cover).sort() });
        }
      }
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const todayLabel =
    schedule?.start_date && todayIdx >= 0
      ? `${DAYS[todayIdx]}, ${monthDayFor(schedule.start_date, todayIdx)}`
      : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Home
          </Link>
          <h1 className="text-xl font-bold tracking-tight mt-3">Lunch Schedule</h1>
          <p className="text-sm mt-1 text-primary-foreground/90">{todayLabel}</p>
        </div>
      </header>

      <main className="px-4 mt-5 max-w-md mx-auto">
        <section className="bg-card rounded-2xl shadow-sm p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : todayIdx < 0 || !covered ? (
            <p className="text-sm text-muted-foreground">
              No lunch schedule for today — the center is closed or this week's schedule isn't posted yet.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lunches scheduled today.</p>
          ) : (
            <ul className="space-y-3 list-none">
              {rows.map((r) => (
                <li key={r.name + r.start} className="text-base text-foreground leading-snug">
                  <span aria-hidden="true">🍽️ </span>
                  <strong>{r.name}</strong>: {r.start} – {r.end}{" "}
                  <span className="text-muted-foreground">
                    ({r.cover.length > 0 ? `covered by ${r.cover.join(", ")}` : "no coverage scheduled"})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
