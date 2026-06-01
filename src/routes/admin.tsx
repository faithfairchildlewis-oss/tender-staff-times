import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { schedule } from "@/data/schedule";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Full Schedule — Admin" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [dayIdx, setDayIdx] = useState(0);
  const day = schedule.days[dayIdx];
  const rooms = schedule.rooms;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-6 shadow-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-primary-foreground/90 mb-3"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </Link>
        <h1 className="text-xl font-bold">Full schedule</h1>
        <p className="text-sm opacity-90">Week of {schedule.week}</p>
      </header>

      <div className="bg-primary px-2 pb-3 sticky top-0 z-10 shadow">
        <div className="flex gap-1 bg-primary-foreground/10 rounded-xl p-1">
          {schedule.days.map((d, i) => (
            <button
              key={d.day}
              onClick={() => setDayIdx(i)}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition ${
                i === dayIdx
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground/80"
              }`}
            >
              {d.day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary inline-block" /> Staffed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[oklch(0.78_0.15_75)] inline-block" /> SAC
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-destructive inline-block" /> Understaffed
          </span>
        </div>

        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="sticky left-0 bg-secondary text-left px-2 py-2 font-semibold text-secondary-foreground border-b border-border min-w-[68px]">
                    Time
                  </th>
                  {rooms.map((r) => (
                    <th
                      key={r}
                      className={`px-2 py-2 font-semibold border-b border-border text-center min-w-[88px] ${
                        r === "SAC"
                          ? "bg-[oklch(0.78_0.15_75)] text-[oklch(0.25_0.05_60)]"
                          : "text-secondary-foreground"
                      }`}
                    >
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.slots.map((slot) => (
                  <tr key={slot.time} className="border-b border-border last:border-0">
                    <td className="sticky left-0 bg-card px-2 py-2 font-medium text-foreground whitespace-nowrap border-r border-border">
                      {slot.time}
                    </td>
                    {rooms.map((r) => {
                      const staff = slot.assignments[r];
                      const under = slot.understaffed.includes(r);
                      const isSac = r === "SAC";
                      const sacActive = isSac && staff !== null && staff !== undefined;
                      return (
                        <td
                          key={r}
                          className={`px-1.5 py-1.5 align-top ${
                            under
                              ? "bg-destructive/15"
                              : isSac && sacActive
                                ? "bg-[oklch(0.78_0.15_75)]/25"
                                : ""
                          }`}
                        >
                          <div className="flex flex-wrap gap-1 justify-center">
                            {staff === null ? (
                              <span className="text-muted-foreground/50">—</span>
                            ) : staff.length === 0 ? (
                              <span className="text-destructive font-semibold">empty</span>
                            ) : (
                              staff.map((n) => (
                                <span
                                  key={n}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                    under
                                      ? "bg-destructive text-destructive-foreground"
                                      : isSac
                                        ? "bg-[oklch(0.78_0.15_75)] text-[oklch(0.25_0.05_60)]"
                                        : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  {n}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}