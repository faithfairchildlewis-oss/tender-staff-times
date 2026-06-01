import data from "./schedule.json";

export type RoomName = "M.O.D." | "Room F" | "Room I" | "G/H" | "J/K" | "SAC";

export type Slot = {
  time: string;
  assignments: Record<string, string[] | null>;
  minimums: Record<string, number>;
  understaffed: string[];
};

export type Day = {
  day: string;
  date: string;
  slots: Slot[];
};

export type StaffDailyBlock = { time: string; rooms: string[] };

export type StaffInfo = {
  rate: number;
  hours: number;
  lunch: { type: "fixed" | "varies"; time?: string };
  daily_breaks: Record<string, { type: string; duration: string; time: string } | null>;
};

export type ScheduleData = {
  center: string;
  week: string;
  rooms: string[];
  days: Day[];
  staff: Record<string, StaffInfo>;
  staff_daily: Record<string, Record<string, StaffDailyBlock[]>>;
};

export const schedule = data as unknown as ScheduleData;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export function staffNames(): string[] {
  return Object.keys(schedule.staff);
}

/** Compress consecutive 30-min blocks into time ranges with rooms. */
export function blocksForDay(name: string, day: string) {
  const slots = schedule.staff_daily?.[name]?.[day] ?? [];
  if (slots.length === 0) return [] as { start: string; end: string; rooms: string[] }[];
  const out: { start: string; end: string; rooms: string[] }[] = [];
  let cur: { start: string; end: string; rooms: string[] } | null = null;
  for (const s of slots) {
    const end = addHalfHour(s.time);
    const sameRooms = cur && arrEq(cur.rooms, s.rooms) && cur.end === s.time;
    if (sameRooms && cur) {
      cur.end = end;
    } else {
      if (cur) out.push(cur);
      cur = { start: s.time, end, rooms: [...s.rooms] };
    }
  }
  if (cur) out.push(cur);
  return out;
}

function arrEq(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

function parseTime(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function fmtTime(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
}

function addHalfHour(t: string): string {
  return fmtTime(parseTime(t) + 30);
}

export function dayHours(name: string, day: string): number {
  return (schedule.staff_daily?.[name]?.[day]?.length ?? 0) * 0.5;
}

export function weeklyHours(name: string): number {
  return schedule.staff[name]?.hours ?? 0;
}