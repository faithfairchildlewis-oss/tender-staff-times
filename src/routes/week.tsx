import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, FileDown, Copy } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { blocksForDay, staffNames, weeklyHours, DAYS, type ScheduleData } from "@/data/schedule";
import { useCurrentSchedule, useAllSchedules } from "@/hooks/use-schedule";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_NAMES } from "@/lib/schedule-derive";
import { holidayForOffset } from "@/lib/holidays";

export const Route = createFileRoute("/week")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "This Week's Schedule — Tender Years of Deale" },
      { name: "description", content: "Working times for all staff this week." },
    ],
  }),
  component: WeekPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive" role="alert">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Schedule not found.</div>,
});

type WeekSchedule = ScheduleData & { start_date?: string | null };

function dateForDay(schedule: WeekSchedule | null | undefined, dayName: string): string {
  if (!schedule) return "";
  const fromDays = schedule.days?.find((d) => d.day === dayName)?.date;
  if (fromDays) return fromDays;
  if (!schedule.start_date) return "";
  const monday = new Date(schedule.start_date + "T00:00:00");
  const idx = DAY_NAMES.indexOf(dayName as typeof DAY_NAMES[number]);
  if (idx < 0) return "";
  const date = new Date(monday);
  date.setDate(monday.getDate() + idx);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function closedFor(schedule: WeekSchedule | null | undefined, dayName: string): string | null {
  const idx = DAY_NAMES.indexOf(dayName as typeof DAY_NAMES[number]);
  if (idx < 0) return null;
  return holidayForOffset(schedule?.start_date, idx);
}

function WeekPage() {
  const { data: current, isLoading: loadingCurrent } = useCurrentSchedule();
  const { data: allRows, isLoading: loadingAll } = useAllSchedules();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weeks = useMemo(() => (allRows ?? []).slice().sort((a, b) => a.start_date.localeCompare(b.start_date)), [allRows]);

  const schedule: WeekSchedule | null = useMemo(() => {
    if (selectedId) {
      const row = weeks.find((w) => w.id === selectedId);
      if (row) return { ...(row.data as ScheduleData), start_date: row.start_date };
    }
    return current ?? null;
  }, [selectedId, weeks, current]);

  if ((loadingCurrent && loadingAll) || !schedule) {
    return <div className="p-8 text-center text-muted-foreground">Loading schedule…</div>;
  }

  const names = staffNames(schedule).sort();

  const buildOverviewText = () => {
    const lines: string[] = [];
    lines.push(`${schedule.center} — Weekly Overview`);
    lines.push(`Week of ${schedule.week}`);
    lines.push("");
    lines.push("STAFF SCHEDULES");
    lines.push("---------------");
    for (const n of names) {
      const total = weeklyHours(schedule, n);
      lines.push(`${n} — ${total} h`);
      for (const d of DAYS) {
        const blocks = blocksForDay(schedule, n, d);
        const dateLabel = dateForDay(schedule, d);
        const dayLabel = `${d.slice(0, 3)}${dateLabel ? ` ${dateLabel}` : ""}`;
        const closed = closedFor(schedule, d);
        if (closed) {
          lines.push(`  ${dayLabel}: CENTER CLOSED — ${closed}`);
        } else if (blocks.length === 0) {
          lines.push(`  ${dayLabel}: OFF`);
        } else {
          const parts = blocks.map((b) => {
            const rooms = b.rooms.length ? ` (${b.rooms.join(", ")})` : "";
            return `${b.start}–${b.end}${rooms}`;
          });
          lines.push(`  ${dayLabel}: ${parts.join(", ")}`);
        }
      }
      lines.push("");
    }

    lines.push("COVERAGE NOTES");
    lines.push("--------------");
    const notes: string[] = [];
    for (const d of DAYS) {
      const day = schedule.days?.find((x) => x.day === d);
      if (!day) continue;
      if (closedFor(schedule, d)) continue;
      const gaps = new Map<string, Set<string>>();
      for (const slot of day.slots) {
        for (const room of slot.understaffed ?? []) {
          if (!gaps.has(room)) gaps.set(room, new Set());
          gaps.get(room)!.add(slot.time);
        }
      }
      if (gaps.size === 0) continue;
      const roomBits = Array.from(gaps.entries())
        .map(([room, times]) => {
          const sorted = Array.from(times);
          return `${room} (${sorted[0]}${sorted.length > 1 ? `–${sorted[sorted.length - 1]}` : ""})`;
        })
        .join("; ");
      notes.push(`  ${d}: ${roomBits}`);
    }
    if (notes.length === 0) {
      lines.push("  All rooms covered.");
    } else {
      lines.push(...notes);
    }
    return lines.join("\n");
  };

  const copyOverview = async () => {
    const text = buildOverviewText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Overview copied — ready to paste or text");
    } catch {
      toast.error("Could not copy. Long-press to select instead.");
    }
  };

  const shareOverview = async () => {
    const text = buildOverviewText();
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `Weekly Overview — ${schedule.week}`, text });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyOverview();
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`${schedule.center} — Weekly Schedule`, pageW / 2, y, { align: "center" });
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Week of ${schedule.week}`, pageW / 2, y, { align: "center" });
    y += 24;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    for (const n of names) {
      ensureSpace(90);
      doc.setDrawColor(220);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, pageW - margin * 2, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(n, margin + 8, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${weeklyHours(schedule, n)} h this week`, pageW - margin - 8, y + 15, { align: "right" });
      y += 28;

      doc.setFontSize(10);
      for (const d of DAYS) {
        ensureSpace(16);
        const blocks = blocksForDay(schedule, n, d);
        const label = `${d}, ${dateForDay(schedule, d)}`;
        const closed = closedFor(schedule, d);
        const value = closed
          ? `CENTER CLOSED — ${closed}`
          : blocks.length === 0
          ? "OFF"
          : blocks.map((b) => `${b.start}–${b.end}`).join(", ");
        doc.setFont("helvetica", "bold");
        doc.text(label, margin + 8, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(value, pageW - margin * 2 - 160);
        doc.text(wrapped, margin + 160, y);
        y += Math.max(14, wrapped.length * 12);
      }
      y += 10;
    }

    const fileLabel = (schedule.week || "schedule").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`weekly-schedule-${fileLabel}.pdf`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-4 no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm opacity-90 hover:opacity-100">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold">This Week's Schedule</h1>
            <p className="text-xs opacity-90">Week of {schedule.week}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportPdf} size="sm" variant="secondary">
              <FileDown className="w-4 h-4" /> Export PDF
            </Button>
            <Button onClick={shareOverview} size="sm" variant="secondary">
              <Copy className="w-4 h-4" /> Copy Overview
            </Button>
            <Button onClick={() => window.print()} size="sm" variant="secondary" className="hidden sm:inline-flex">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>
        {weeks.length > 1 && (
          <div className="max-w-5xl mx-auto mt-3 flex items-center justify-center gap-2">
            <span className="text-xs opacity-90">Week:</span>
            <Select
              value={selectedId ?? weeks.find((w) => w.is_current && w.is_live)?.id ?? weeks[0]?.id}
              onValueChange={(v) => setSelectedId(v)}
            >
              <SelectTrigger className="h-8 w-[260px] bg-primary-foreground text-primary">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.week_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {names.map((n) => {
          const total = weeklyHours(schedule, n);
          return (
            <section key={n} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-baseline justify-between mb-3 gap-2">
                <h2 className="text-base sm:text-lg font-semibold">{n}</h2>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {total} h this week
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm">
                {DAYS.map((d) => {
                  const blocks = blocksForDay(schedule, n, d);
                  const closed = closedFor(schedule, d);
                  return (
                    <li key={d} className="flex justify-between gap-3 border-b border-dashed last:border-b-0 sm:border-b-0 py-1">
                      <span className="font-medium">
                        {d.slice(0, 3)} <span className="text-muted-foreground font-normal">{dateForDay(schedule, d)}</span>
                      </span>
                      <span className="text-right">
                        {closed ? (
                          <span className="text-closed-foreground font-semibold">CENTER CLOSED</span>
                        ) : blocks.length === 0 ? (
                          <span className="text-muted-foreground">OFF</span>
                        ) : (
                          blocks
                            .map((b) => `${b.start}–${b.end}`)
                            .join(", ")
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}