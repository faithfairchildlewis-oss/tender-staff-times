import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { blocksForDay, staffNames, weeklyHours, DAYS } from "@/data/schedule";
import { DEFAULT_TIMES, DEFAULT_ROOMS, deriveDays } from "@/lib/schedule-derive";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/print")({
  head: () => ({
    meta: [{ title: "Print Schedule — Tender Years of Deale" }],
  }),
  component: PrintPage,
});

function PrintPage() {
  const { data: schedule, isLoading } = useCurrentSchedule();
  const [day, setDay] = useState<string>("Monday");

  if (isLoading || !schedule) {
    return <div className="p-8 text-center text-muted-foreground">Loading schedule…</div>;
  }

  const names = staffNames(schedule).sort();
  const derivedDays = deriveDays(schedule, schedule.start_date);
  const rooms = schedule.rooms?.length ? schedule.rooms : DEFAULT_ROOMS;

  return (
    <div className="min-h-dvh bg-background">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-day { display: block !important; page-break-before: always; }
          .print-day:first-of-type { page-break-before: auto; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="w-4 h-4" /> Print this page
        </Button>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{schedule.center}</h1>
          <p className="text-sm text-muted-foreground mt-1">Week of {schedule.week}</p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Weekly Staff Hours</h2>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 border-b font-semibold sticky left-0 bg-muted">Staff</th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-left p-2 border-b border-l font-semibold">{d}</th>
                  ))}
                  <th className="text-right p-2 border-b border-l font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {names.map((n) => (
                  <tr key={n} className="border-b last:border-b-0 align-top">
                    <td className="p-2 font-medium sticky left-0 bg-card">{n}</td>
                    {DAYS.map((d) => {
                      const blocks = blocksForDay(schedule, n, d);
                      return (
                        <td key={d} className="p-2 border-l">
                          {blocks.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <ul className="space-y-1">
                              {blocks.map((b, i) => (
                                <li key={i}>
                                  <span className="whitespace-nowrap">{b.start}–{b.end}</span>
                                  <span className="text-muted-foreground"> · {b.rooms.join(", ")}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 border-l text-right font-semibold whitespace-nowrap">
                      {weeklyHours(schedule, n)} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Daily Room Schedule</h2>

          <Tabs value={day} onValueChange={setDay} className="no-print">
            <TabsList>
              {DAYS.map((d) => (
                <TabsTrigger key={d} value={d}>{d}</TabsTrigger>
              ))}
            </TabsList>
            {DAYS.map((d) => (
              <TabsContent key={d} value={d}>
                <RoomTable day={d} derivedDays={derivedDays} rooms={rooms} />
              </TabsContent>
            ))}
          </Tabs>

          {/* Print: show all days */}
          <div className="hidden">
            {DAYS.map((d) => (
              <div key={d} className="print-day mt-6">
                <h3 className="text-base font-semibold mb-2">{d}</h3>
                <RoomTable day={d} derivedDays={derivedDays} rooms={rooms} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function RoomTable({
  day,
  derivedDays,
  rooms,
}: {
  day: string;
  derivedDays: ReturnType<typeof deriveDays>;
  rooms: string[];
}) {
  const dayData = derivedDays.find((d) => d.day === day);
  const slotsByTime = new Map(dayData?.slots.map((s) => [s.time, s]) ?? []);

  return (
    <div className="overflow-x-auto border rounded-lg mt-2">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-2 border-b font-semibold sticky left-0 bg-muted">Time</th>
            {rooms.map((r) => (
              <th key={r} className="text-left p-2 border-b border-l font-semibold">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEFAULT_TIMES.map((time) => {
            const slot = slotsByTime.get(time);
            return (
              <tr key={time} className="border-b last:border-b-0 align-top">
                <td className="p-2 font-medium whitespace-nowrap sticky left-0 bg-card">{time}</td>
                {rooms.map((r) => {
                  const assigned = slot?.assignments[r];
                  return (
                    <td key={r} className="p-2 border-l">
                      {assigned === null || assigned === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : assigned.length === 0 ? (
                        <span className="text-destructive">(empty)</span>
                      ) : (
                        assigned.join(", ")
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
  );
}