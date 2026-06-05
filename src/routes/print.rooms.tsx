import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { DAYS } from "@/data/schedule";
import { DEFAULT_TIMES, DEFAULT_ROOMS, deriveDays } from "@/lib/schedule-derive";
import { useCurrentSchedule, useLiveSchedules } from "@/hooks/use-schedule";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/print/rooms")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Print Room View — Tender Years of Deale" }],
  }),
  component: PrintRoomsPage,
});

const CLASSROOMS = ["Room F", "Room I", "G/H", "J/K"];

function PrintRoomsPage() {
  const { data: current, isLoading } = useCurrentSchedule();
  const { data: weeks } = useLiveSchedules();
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("print:selectedWeek");
  });

  const handleWeekChange = (key: string) => {
    setSelectedKey(key);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("print:selectedWeek", key);
    }
  };
  const [day, setDay] = useState<string>("Monday");
  const [roomFilter, setRoomFilter] = useState<"all" | "classrooms">("all");

  const schedule = useMemo(() => {
    if (!selectedKey) return current;
    return weeks?.find((w) => (w.start_date ?? w.week) === selectedKey) ?? current;
  }, [selectedKey, weeks, current]);

  if (isLoading || !schedule) {
    return <div className="p-8 text-center text-muted-foreground">Loading schedule…</div>;
  }

  const derivedDays = deriveDays(schedule, schedule.start_date);
  const allRooms = schedule.rooms?.length ? schedule.rooms : DEFAULT_ROOMS;
  const rooms =
    roomFilter === "classrooms" ? allRooms.filter((r) => CLASSROOMS.includes(r)) : allRooms;

  const dayData = derivedDays.find((d) => d.day === day);
  const slotsByTime = new Map(dayData?.slots.map((s) => [s.time, s]) ?? []);
  const subtitle = `${day} — ${roomFilter === "classrooms" ? "Classrooms Only" : "All Rooms"}`;

  return (
    <div className="min-h-dvh bg-background">
      <style>{`
        @page { size: landscape; margin: 0.35in; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          header { margin-bottom: 4px !important; }
          table { font-size: 9px !important; }
          th, td { padding: 2px 4px !important; }
          tr { page-break-inside: avoid; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          {weeks && weeks.length > 1 && (
            <select
              value={selectedKey ?? (current?.start_date ?? current?.week ?? "")}
              onChange={(e) => handleWeekChange(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Select week"
            >
              {weeks.map((w) => {
                const key = w.start_date ?? w.week;
                return (
                  <option key={key} value={key}>
                    Week of {w.week}
                  </option>
                );
              })}
            </select>
          )}
          <Button onClick={() => window.print()} size="sm">
            <Printer className="w-4 h-4" /> Print this page
          </Button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold no-print">{schedule.center}</h1>
          <p className="text-sm text-muted-foreground mt-1 no-print">Week of {schedule.week}</p>
          <h2 className="text-lg font-semibold mt-3 no-print">Daily Room Schedule</h2>
          <p className="print-only text-sm mt-1">{subtitle}</p>
        </header>

        <div className="no-print mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border bg-muted p-1 text-xs">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  day === d ? "bg-background shadow text-foreground" : "text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setRoomFilter("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                roomFilter === "all" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              All Rooms
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter("classrooms")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                roomFilter === "classrooms" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Classrooms Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
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
      </main>
    </div>
  );
}