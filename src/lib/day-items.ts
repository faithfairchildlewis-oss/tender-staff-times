/** Parse "8:30 AM" or "12:30 PM" into minutes since midnight. Returns null on parse failure. */
export function parseClockToMin(s: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export type ShiftBlock = { start: string; end: string; rooms: string[] };

export type DayItem =
  | { kind: "shift"; start: string; end: string; rooms: string[]; sort: number }
  | { kind: "lunch"; label: string; time: string; sort: number };

/**
 * Build the ordered list of items shown for one day on the staff schedule:
 * shifts plus an optional lunch/break, sorted chronologically so lunch is
 * embedded between shifts at its actual start time (not appended at the end).
 */
export function buildDayItems(
  blocks: ShiftBlock[],
  lunchTime: string | null,
  lunchLabel: string,
): DayItem[] {
  const items: DayItem[] = blocks.map((b) => ({
    kind: "shift" as const,
    start: b.start,
    end: b.end,
    rooms: b.rooms,
    sort: parseClockToMin(b.start) ?? 0,
  }));
  if (lunchTime) {
    const lunchStartMin = parseClockToMin(lunchTime);
    if (lunchStartMin !== null) {
      items.push({ kind: "lunch", label: lunchLabel, time: lunchTime, sort: lunchStartMin });
    }
  }
  items.sort((a, b) => a.sort - b.sort);
  return items;
}