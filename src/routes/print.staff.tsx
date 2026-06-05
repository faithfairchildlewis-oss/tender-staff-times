import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { blocksForDay, staffNames, weeklyHours, DAYS } from "@/data/schedule";
import { useCurrentSchedule, useLiveSchedules } from "@/hooks/use-schedule";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/print/staff")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Print Staff Schedule — Tender Years of Deale" }],
  }),
  component: PrintStaffPage,
});

function PrintStaffPage() {
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

  const schedule = useMemo(() => {
    if (!selectedKey) return current;
    return weeks?.find((w) => (w.start_date ?? w.week) === selectedKey) ?? current;
  }, [selectedKey, weeks, current]);

  if (isLoading || !schedule) {
    return <div className="p-8 text-center text-muted-foreground">Loading schedule…</div>;
  }

  const names = staffNames(schedule).sort();

  return (
    <div className="min-h-dvh bg-background">
      <style>{`
        @page { size: landscape; margin: 0.35in; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          table { font-size: 9px !important; }
          th, td { padding: 2px 4px !important; }
          .print-tight ul { margin: 0 !important; }
          .print-tight li { line-height: 1.15 !important; }
          .print-tight li + li { margin-top: 1px !important; }
          tr { page-break-inside: avoid; }
        }
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
                const label = w.week.replace(/^\s*copy of\s+/i, "");
                return (
                  <option key={key} value={key}>
                    Week of {label}
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

      <main className="max-w-6xl mx-auto px-4 py-6 print:p-0 print:max-w-none print-tight">
        <header className="mb-6 text-center no-print">
          <h1 className="text-2xl font-bold">{schedule.center}</h1>
          <p className="text-sm text-muted-foreground mt-1">Week of {schedule.week}</p>
          <h2 className="text-lg font-semibold mt-3">Weekly Staff Hours</h2>
        </header>

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
      </main>
    </div>
  );
}