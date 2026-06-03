import type { ScheduleData, Day, Slot } from "@/data/schedule";

/** Standard 30-min slot grid the center operates on. */
export const DEFAULT_TIMES: string[] = [
  "7:00 AM","7:30 AM","8:00 AM","8:30 AM",
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
];

export const DEFAULT_ROOMS = ["M.O.D.", "Room F", "Room I", "G/H", "J/K", "SAC"];

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function parseTime(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Returns the minimum number of staff for a room at a given time slot. */
export function minimumFor(room: string, time: string): number | null {
  const m = parseTime(time);
  const HM = (h: number, mn: number) => h * 60 + mn;
  if (room === "SAC") {
    // Active 2:30 PM through 5:30 PM inclusive.
    return m >= HM(14, 30) && m <= HM(17, 30) ? 1 : null;
  }
  if (room === "G/H") {
    // 2 staff 9:00 AM–12:00 PM and 3:00 PM–4:30 PM (inclusive), else 1.
    // 7:00–9:00 AM and 12:30 PM–2:30 PM only need 1 staff.
    if ((m >= HM(9, 0) && m <= HM(12, 0)) || (m >= HM(15, 0) && m <= HM(16, 30))) return 2;
    return 1;
  }
  if (room === "J/K") {
    // 2 staff 9:00 AM–12:00 PM and 3:00 PM–4:30 PM (inclusive), else 1.
    // 7:00–9:00 AM and 12:30 PM–2:30 PM only need 1 staff.
    if ((m >= HM(9, 0) && m <= HM(12, 0)) || (m >= HM(15, 0) && m <= HM(16, 30))) return 2;
    return 1;
  }
  return 1;
}

/** Rebuilds days[].slots from staff_daily + minimums so the room-grid view
 *  stays in sync with the per-staff schedule that admins edit. */
export function deriveDays(s: ScheduleData): Day[] {
  const rooms = s.rooms?.length ? s.rooms : DEFAULT_ROOMS;
  return s.days.map((d) => {
    const times = d.slots?.length ? d.slots.map((sl) => sl.time) : DEFAULT_TIMES;
    const slots: Slot[] = times.map((time) => {
      const assignments: Record<string, string[] | null> = {};
      const minimums: Record<string, number> = {};
      const understaffed: string[] = [];
      for (const r of rooms) {
        const min = minimumFor(r, time);
        if (min === null) {
          assignments[r] = null;
          continue;
        }
        minimums[r] = min;
        const staffed: string[] = [];
        for (const [name, byDay] of Object.entries(s.staff_daily ?? {})) {
          const blocks = byDay?.[d.day] ?? [];
          if (blocks.some((b) => b.time === time && b.rooms.includes(r))) {
            staffed.push(name);
          }
        }
        assignments[r] = staffed;
        if (staffed.length < min) understaffed.push(r);
      }
      return { time, assignments, minimums, understaffed };
    });
    return { day: d.day, date: d.date, slots };
  });
}

/** Convert a list of compressed blocks back into 30-min slot entries. */
export function expandBlocks(blocks: { start: string; end: string; rooms: string[] }[]): { time: string; rooms: string[] }[] {
  const out: { time: string; rooms: string[] }[] = [];
  for (const b of blocks) {
    const si = DEFAULT_TIMES.indexOf(b.start);
    const ei = DEFAULT_TIMES.indexOf(b.end);
    if (si < 0 || ei < 0 || ei <= si) continue;
    for (let i = si; i < ei; i++) {
      out.push({ time: DEFAULT_TIMES[i], rooms: [...b.rooms] });
    }
  }
  return out;
}

/** Build an empty week scaffold. */
export function blankSchedule(weekLabel: string): ScheduleData {
  return {
    center: "Tender Years of Deale",
    week: weekLabel,
    rooms: [...DEFAULT_ROOMS],
    days: DAY_NAMES.map((day, i) => ({
      day,
      date: "",
      slots: DEFAULT_TIMES.map((time) => ({
        time,
        assignments: Object.fromEntries(
          DEFAULT_ROOMS.map((r) => [r, minimumFor(r, time) === null ? null : []]),
        ),
        minimums: Object.fromEntries(
          DEFAULT_ROOMS.flatMap((r) => {
            const m = minimumFor(r, time);
            return m === null ? [] : [[r, m] as const];
          }),
        ),
        understaffed: [],
      })),
    })),
    staff: {},
    staff_daily: {},
  };
}