import { createFileRoute, Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useState, useMemo } from "react";
import { PageBanner } from "@/components/page-banner";
import { useLiveSchedule } from "@/hooks/use-schedule";
import { deriveDays, DAY_NAMES, DEFAULT_ROOMS } from "@/lib/schedule-derive";
import { formatWeekRange } from "@/lib/format-date";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [{ title: "Room Schedule — Tender Years of Deale" }],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { data: schedule, isLoading } = useLiveSchedule();
  const [dayIdx, setDayIdx] = useState(0);
  const derivedDays = useMemo(() => (schedule ? deriveDays(schedule) : []), [schedule]);

  if (isLoading) {
    return <div className="min-h-dvh bg-background p-6 text-muted-foreground">Loading…</div>;
  }
  if (!schedule) {
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

  const day = derivedDays[dayIdx];
  const rooms = schedule.rooms?.length ? schedule.rooms : DEFAULT_ROOMS;
  const weekLabel = schedule.start_date ? formatWeekRange(schedule.start_date) : schedule.week;

  return (
    <div className="min-h-dvh bg-background pb-6">
      <PageBanner title="Our Rooms" subline={weekLabel} />

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-4">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {DAY_NAMES.map((d, i) => (
            <button
              key={d}
              onClick={() => setDayIdx(i)}
              className={`flex-1 text-sm font-semibold min-h-11 rounded-lg transition ${
                i === dayIdx ? "bg-card text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
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
