// Tender Years of Deale — Enrollment Projections: core business logic
// Validated against the master workbook, July 2026. Pure functions, no UI.
// These rules were confirmed by the director — do not "simplify" them.

export type RoomCode = "F" | "I" | "G/H" | "J/K" | "SAC" | "SUMMER";

export interface Child {
  name: string;
  dob: string | null; // ISO date; null = missing in Brightwheel (flag in UI)
  room: RoomCode;
  schedule: "Standard" | "Extended";
  status: "Active" | "Withdrawn";
  fallPlan?: "SAC" | "Inactive" | "TBD" | null; // K-bound children only
  parent?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
}

export interface WaitlistEntry {
  name: string;
  dobOrDueDate: string; // due date for unborn children — age math is identical
  desiredStart: string;
  status: string; // any status containing "deposit" (case-insensitive) holds a seat
  parent?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

// ---------------- Room configuration ----------------
// Rooms are PLACEMENTS. Tuition follows AGE (see RATES below), never the room.
export const ROOMS = {
  F: {
    classroom: "The Acorns",
    // Small babies not yet pulling up / highly active. The 10-month move-up
    // is a PLANNING ESTIMATE — actual F→I moves are developmental readiness.
    ageMin: 0, movesUpAt: 10, nextRoom: "I" as RoomCode,
    capacity: 6, ratio: 3,
  },
  I: {
    classroom: "The Pine Cones",
    // Holding room, ~10–18 months, until an under-2 seat opens in G/H.
    ageMin: 10, movesUpAt: 18, nextRoom: "G/H" as RoomCode,
    capacity: 3, ratio: 3,
  },
  "G/H": {
    classroom: "The Sprouts",
    // 18–36 months with a HARD composition rule: max 3 children under age 2
    // (1:3) + max 6 two-year-olds (1:6). Capacity 9 = 3 + 6. A child moving
    // up from Room I needs an open under-2 seat; children roll from an
    // under-2 seat to a two-year-old seat on their 2nd birthday.
    ageMin: 18, movesUpAt: 36, nextRoom: "J/K" as RoomCode,
    capacity: 9, maxUnder2: 3, maxTwos: 6,
  },
  "J/K": {
    classroom: "Mighty Oaks",
    // 36 months → kindergarten. Departure follows the K rule below.
    ageMin: 36, movesUpAt: 60, nextRoom: "SAC" as RoomCode,
    capacity: 20, ratio: 10,
  },
  SAC: {
    classroom: "Mighty Cedars / School Age",
    ageMin: 60, capacity: 11, ratio: 15,
  },
  SUMMER: {
    classroom: "Summer Bible Adventure (camp)",
    // Summer program: separate pricing, no age-band transitions, ends Aug 21.
    ageMin: 60, capacity: 11, ratio: 15,
  },
} as const;

// Tuition by AGE, regardless of room. A 19-month-old still in Room I bills
// at the toddler rate.
export const RATES = [
  { maxAgeMonthsExclusive: 18, label: "Infant Care", standard: 475, extended: null },
  { maxAgeMonthsExclusive: 24, label: "Toddlers", standard: 425, extended: null },
  { maxAgeMonthsExclusive: 36, label: "Two-Year-Olds", standard: 310, extended: 350 },
  { maxAgeMonthsExclusive: 60, label: "Threes + Fours (Pre-K)", standard: 300, extended: 340 },
  { maxAgeMonthsExclusive: Infinity, label: "School Age (school year)", standard: 175, extended: null },
] as const;

// ---------------- Date & age math ----------------
export function ageInMonths(dobISO: string, asOf: Date): number {
  const dob = new Date(dobISO + "T00:00:00");
  let m = (asOf.getFullYear() - dob.getFullYear()) * 12 + (asOf.getMonth() - dob.getMonth());
  if (asOf.getDate() < dob.getDate()) m -= 1;
  return m;
}

export function addMonths(dateISO: string, months: number): Date {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // clamp month-end
  return d;
}

// ---------------- THE KINDERGARTEN RULE ----------------
// Maryland K entry: age 5 on or before September 1. The child's K year is
// the September on/after their 5th birthday — and their LAST DAY at Tender
// Years is AUGUST 21 of that year. Their preschool seat opens the week of
// August 24. Never compute preschool departures from the 5th birthday alone.
export function kindergartenLastDay(dobISO: string): Date {
  const fifth = addMonths(dobISO, 60);
  const cutoff = new Date(fifth.getFullYear(), 8, 1); // Sept 1 of 5th-bday year
  const kYear = fifth <= cutoff ? fifth.getFullYear() : fifth.getFullYear() + 1;
  return new Date(kYear, 7, 21); // Aug 21
}

// ---------------- Transitions ----------------
export interface Transition {
  child: string; from: RoomCode; to: RoomCode | "K"; date: Date;
  estimate: boolean; // true for developmental (F→I) moves
}

export function nextTransition(c: Child, asOf: Date): Transition | null {
  if (!c.dob || c.status !== "Active") return null;
  if (c.room === "SAC" || c.room === "SUMMER") return null;
  if (c.room === "J/K") {
    const to = c.fallPlan === "SAC" ? ("SAC" as RoomCode) : ("K" as const);
    return { child: c.name, from: "J/K", to, date: kindergartenLastDay(c.dob), estimate: false };
  }
  const cfg = ROOMS[c.room];
  return {
    child: c.name, from: c.room, to: cfg.nextRoom,
    date: addMonths(c.dob, cfg.movesUpAt),
    estimate: c.room === "F", // baby-room moves are readiness-based
  };
}

// ---------------- Rates ----------------
export function weeklyRate(c: Child, asOf: Date): number | null {
  if (!c.dob || c.room === "SUMMER") return null; // summer camp priced separately
  const age = ageInMonths(c.dob, asOf);
  const band = RATES.find((r) => age < r.maxAgeMonthsExclusive)!;
  return c.schedule === "Extended" && band.extended ? band.extended : band.standard;
}

// ---------------- Sprouts composition & staffing ----------------
export function sproutsComposition(children: Child[], asOf: Date) {
  const gh = children.filter((c) => c.room === "G/H" && c.status === "Active" && c.dob);
  const under2 = gh.filter((c) => ageInMonths(c.dob!, asOf) < 24).length;
  return { under2, twos: gh.length - under2, maxUnder2: 3, maxTwos: 6 };
}

export function staffRequired(room: RoomCode, children: Child[], asOf: Date): number {
  const roster = children.filter((c) => c.room === room && c.status === "Active");
  if (roster.length === 0) return 0;
  if (room === "G/H") {
    const { under2, twos } = sproutsComposition(children, asOf);
    return Math.ceil(under2 / 3) + Math.ceil(twos / 6); // mixed-age: 1:3 + 1:6
  }
  const cfg = ROOMS[room] as { ratio?: number };
  return cfg.ratio ? Math.ceil(roster.length / cfg.ratio) : 1;
}

// ---------------- Hold-aware availability ----------------
// Seats "held" = waitlist entries whose status mentions a deposit and whose
// age-eligible room at desired start matches. NOTE: this static number is a
// FLOOR — internal move-ups often free seats before a held start date. The
// weekly projection below is the truth; show both in the UI.
export function eligibleRoomAtAge(ageMonths: number): RoomCode {
  if (ageMonths < ROOMS.F.movesUpAt) return "F";
  if (ageMonths < ROOMS.I.movesUpAt) return "I";
  if (ageMonths < ROOMS["G/H"].movesUpAt) return "G/H";
  if (ageMonths < ROOMS["J/K"].movesUpAt) return "J/K";
  return "SAC";
}

export function heldSeats(waitlist: WaitlistEntry[], room: RoomCode): number {
  return waitlist.filter((w) => {
    if (!/deposit/i.test(w.status)) return false;
    const age = ageInMonths(w.dobOrDueDate, new Date(w.desiredStart + "T00:00:00"));
    return eligibleRoomAtAge(Math.max(age, 0)) === room;
  }).length;
}

// ---------------- Weekly census projection ----------------
// Walks Monday-by-Monday, applying: K departures (last day Aug 21), room
// move-ups on the Monday on/after eligibility, waitlist starts on their
// start date. Summer campers drop after the camp end date.
export function projectWeekly(
  children: Child[], waitlist: WaitlistEntry[],
  fromMonday: Date, weeks: number,
  campEnds: Date, // e.g. 2026-08-21
): { week: Date; census: Record<RoomCode, number> }[] {
  const out: { week: Date; census: Record<RoomCode, number> }[] = [];
  for (let w = 0; w < weeks; w++) {
    const wk = new Date(fromMonday.getTime() + w * 7 * 86400000);
    const census: Record<RoomCode, number> = { F: 0, I: 0, "G/H": 0, "J/K": 0, SAC: 0, SUMMER: 0 };
    for (const c of children) {
      if (c.status !== "Active") continue;
      const room = roomOnDate(c, wk, campEnds);
      if (room) census[room] += 1;
    }
    for (const wl of waitlist) {
      if (!/deposit|hold/i.test(wl.status)) continue;
      const start = new Date(wl.desiredStart + "T00:00:00");
      if (wk >= start) {
        const age = ageInMonths(wl.dobOrDueDate, wk);
        census[eligibleRoomAtAge(Math.max(age, 0))] += 1;
      }
    }
    out.push({ week: wk, census });
  }
  return out;
}

export function roomOnDate(c: Child, date: Date, campEnds: Date): RoomCode | null {
  if (!c.dob) return c.room === "SUMMER" && date > campEnds ? null : c.room;
  if (c.room === "SUMMER") return date <= campEnds ? "SUMMER" : null;
  if (c.room === "SAC") return "SAC";
  // K-bound check applies to whatever room they occupy on their K year
  const kLast = kindergartenLastDay(c.dob);
  if (date > kLast && ageInMonths(c.dob, date) >= 60) {
    return c.fallPlan === "SAC" ? "SAC" : null;
  }
  // Walk forward through room chain by eligibility
  let room: RoomCode = c.room;
  let guard = 0;
  while (guard++ < 5) {
    const cfg = ROOMS[room] as { movesUpAt?: number; nextRoom?: RoomCode };
    if (!cfg.movesUpAt || !cfg.nextRoom) break;
    const moveDate = addMonths(c.dob, cfg.movesUpAt);
    if (date >= moveDate && room !== "J/K") room = cfg.nextRoom;
    else break;
  }
  return room;
}