import { describe, expect, it } from "vitest";
import {
  ageInMonths,
  departsForKInYear,
  eligibleRoomAtAge,
  heldSeats,
  holdsSeat,
  kindergartenLastDay,
  nextTransition,
  openSeatRate,
  roomOnDate,
  staffRequired,
  weeklyRate,
  type Child,
} from "./enrollment-logic";
import { isActiveStatus, normalizeRoom } from "./brightwheel";

const CAMP_ENDS = new Date(2026, 7, 21);

const child = (over: Partial<Child>): Child => ({
  name: "Test Child",
  dob: "2024-01-15",
  room: "F",
  schedule: "Standard",
  status: "Active",
  ...over,
});

describe("kindergartenLastDay — the Maryland K rule", () => {
  it("child 5 before Sept 1 leaves that same August", () => {
    // 5th birthday June 10, 2027 → K fall 2027 → last day Aug 21, 2027
    expect(kindergartenLastDay("2022-06-10")).toEqual(new Date(2027, 7, 21));
  });
  it("child 5 exactly on Sept 1 makes that year's cutoff", () => {
    expect(kindergartenLastDay("2022-09-01")).toEqual(new Date(2027, 7, 21));
  });
  it("child 5 after Sept 1 waits a full year (the workbook's canonical example)", () => {
    // Born Oct 2, 2022 → 5 on Oct 2, 2027 → misses cutoff → K fall 2028
    expect(kindergartenLastDay("2022-10-02")).toEqual(new Date(2028, 7, 21));
  });
  it("Sept 2 birthday just misses the cutoff", () => {
    expect(kindergartenLastDay("2022-09-02")).toEqual(new Date(2028, 7, 21));
  });
});

describe("departsForKInYear", () => {
  it("counts only this year's K class", () => {
    const thisYear = child({ room: "J/K", dob: "2021-03-01" }); // K fall 2026
    const nextYear = child({ room: "J/K", dob: "2022-03-01" }); // K fall 2027
    expect(departsForKInYear(thisYear, 2026)).toBe(true);
    expect(departsForKInYear(nextYear, 2026)).toBe(false);
  });
});

describe("ageInMonths", () => {
  it("counts a full month only after the day-of-month passes", () => {
    expect(ageInMonths("2024-01-15", new Date(2024, 6, 14))).toBe(5);
    expect(ageInMonths("2024-01-15", new Date(2024, 6, 15))).toBe(6);
  });
});

describe("roomOnDate — placement is the director's call", () => {
  const today = new Date(2026, 6, 6); // Mon Jul 6, 2026
  it("projects a future eligible move", () => {
    // Born Nov 2025 → 8 months now, F→I eligible Sept 2026 (10 mo)
    const c = child({ dob: "2025-11-01", room: "F" });
    expect(roomOnDate(c, new Date(2026, 7, 3), CAMP_ENDS, today)).toBe("F");
    expect(roomOnDate(c, new Date(2026, 9, 5), CAMP_ENDS, today)).toBe("I");
  });
  it("does NOT auto-move a child already past their eligibility date", () => {
    // 20-month-old still placed in F: overdue for I and G/H, but the
    // director hasn't moved them — projection must show F, and the
    // Snapshot flags it instead.
    const c = child({ dob: "2024-11-01", room: "F" });
    expect(roomOnDate(c, new Date(2026, 8, 7), CAMP_ENDS, today)).toBe("F");
  });
  it("still applies the mandatory K departure", () => {
    const c = child({ dob: "2021-03-01", room: "J/K" }); // last day Aug 21 2026
    expect(roomOnDate(c, new Date(2026, 7, 17), CAMP_ENDS, today)).toBe("J/K");
    expect(roomOnDate(c, new Date(2026, 7, 24), CAMP_ENDS, today)).toBe(null);
  });
  it("K-bound child with fallPlan SAC rolls into SAC", () => {
    const c = child({ dob: "2021-03-01", room: "J/K", fallPlan: "SAC" });
    expect(roomOnDate(c, new Date(2026, 7, 24), CAMP_ENDS, today)).toBe("SAC");
  });
  it("summer campers drop off after camp ends", () => {
    const c = child({ dob: "2019-05-01", room: "SUMMER" });
    expect(roomOnDate(c, new Date(2026, 7, 17), CAMP_ENDS, today)).toBe("SUMMER");
    expect(roomOnDate(c, new Date(2026, 7, 24), CAMP_ENDS, today)).toBe(null);
  });
});

describe("staffRequired — Sprouts mixed-age composition", () => {
  const asOf = new Date(2026, 6, 6);
  it("splits under-2 (1:3) and twos (1:6)", () => {
    const kids: Child[] = [
      // three under-2s (born within 24 months of asOf)
      ...["2024-10-01", "2024-11-01", "2024-12-01"].map((dob) => child({ dob, room: "G/H" })),
      // four two-year-olds
      ...["2023-09-01", "2023-10-01", "2023-11-01", "2023-12-01"].map((dob) => child({ dob, room: "G/H" })),
    ];
    // ceil(3/3) + ceil(4/6) = 1 + 1 = 2
    expect(staffRequired("G/H", kids, asOf)).toBe(2);
  });
  it("uses simple ratios elsewhere", () => {
    const kids: Child[] = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"].map((dob) =>
      child({ dob, room: "F" }),
    );
    expect(staffRequired("F", kids, asOf)).toBe(2); // ceil(4/3)
  });
});

describe("rates follow age, not room", () => {
  const asOf = new Date(2026, 6, 6);
  it("a 19-month-old still in Room I bills at the toddler rate", () => {
    const c = child({ dob: "2024-12-01", room: "I" }); // 19 months
    expect(weeklyRate(c, asOf)).toBe(425);
  });
  it("extended schedule applies only where an extended rate exists", () => {
    const two = child({ dob: "2024-01-15", room: "G/H", schedule: "Extended" }); // 29 mo
    expect(weeklyRate(two, asOf)).toBe(350);
    const infant = child({ dob: "2025-11-01", room: "F", schedule: "Extended" });
    expect(weeklyRate(infant, asOf)).toBe(475); // no extended infant rate
  });
  it("openSeatRate derives from RATES at the room's entry age", () => {
    expect(openSeatRate("F")).toBe(475);
    expect(openSeatRate("I")).toBe(475); // entry at 10 mo = still infant rate
    expect(openSeatRate("G/H")).toBe(425); // entry at 18 mo = toddler band
    expect(openSeatRate("J/K")).toBe(300);
    expect(openSeatRate("SAC")).toBe(175);
  });
});

describe("holdsSeat", () => {
  it("deposit and hold statuses hold seats; Enrolled/Withdrawn never do", () => {
    expect(holdsSeat("Deposit paid")).toBe(true);
    expect(holdsSeat("Hold – deposit pending")).toBe(true);
    expect(holdsSeat("Enrolled")).toBe(false);
    expect(holdsSeat("Withdrawn")).toBe(false);
    expect(holdsSeat("Inquiry")).toBe(false);
  });
  it("heldSeats places unborn children by due date", () => {
    const wl = [{ name: "Baby G", dobOrDueDate: "2026-09-15", desiredStart: "2026-11-02", status: "Deposit paid" }];
    expect(heldSeats(wl, "F")).toBe(1);
  });
});

describe("Brightwheel normalization", () => {
  it("maps classroom names and codes to room codes", () => {
    expect(normalizeRoom("The Acorns")).toBe("F");
    expect(normalizeRoom("acorns")).toBe("F");
    expect(normalizeRoom("Room F")).toBe("F");
    expect(normalizeRoom("Pine Cones")).toBe("I");
    expect(normalizeRoom("The Sprouts")).toBe("G/H");
    expect(normalizeRoom("G/H")).toBe("G/H");
    expect(normalizeRoom("g-h")).toBe("G/H");
    expect(normalizeRoom("Mighty Oaks")).toBe("J/K");
    expect(normalizeRoom("Mighty Cedars")).toBe("SAC");
    expect(normalizeRoom("School Age")).toBe("SAC");
    expect(normalizeRoom("Summer Bible Adventure")).toBe("SUMMER");
    expect(normalizeRoom('"The Acorns"')).toBe("F"); // stray quotes
  });
  it("refuses to guess unknown names", () => {
    expect(normalizeRoom("Butterfly Room")).toBe(null);
    expect(normalizeRoom("")).toBe(null);
    expect(normalizeRoom(null)).toBe(null);
  });
  it("filters inactive Brightwheel statuses", () => {
    expect(isActiveStatus("Active")).toBe(true);
    expect(isActiveStatus(null)).toBe(true); // no status column
    expect(isActiveStatus("Inactive")).toBe(false);
    expect(isActiveStatus("Graduated")).toBe(false);
    expect(isActiveStatus("Withdrawn")).toBe(false);
  });
});

describe("nextTransition", () => {
  const now = new Date(2026, 6, 6);
  it("F→I is flagged as an estimate (developmental readiness)", () => {
    const t = nextTransition(child({ dob: "2025-11-01", room: "F" }), now)!;
    expect(t.to).toBe("I");
    expect(t.estimate).toBe(true);
  });
  it("Oaks child heads to K on the last-day date unless fallPlan is SAC", () => {
    const k = nextTransition(child({ dob: "2021-03-01", room: "J/K" }), now)!;
    expect(k.to).toBe("K");
    expect(k.date).toEqual(new Date(2026, 7, 21));
    const sac = nextTransition(child({ dob: "2021-03-01", room: "J/K", fallPlan: "SAC" }), now)!;
    expect(sac.to).toBe("SAC");
  });
});

describe("eligibleRoomAtAge boundaries", () => {
  it("matches the room chain thresholds", () => {
    expect(eligibleRoomAtAge(0)).toBe("F");
    expect(eligibleRoomAtAge(9)).toBe("F");
    expect(eligibleRoomAtAge(10)).toBe("I");
    expect(eligibleRoomAtAge(17)).toBe("I");
    expect(eligibleRoomAtAge(18)).toBe("G/H");
    expect(eligibleRoomAtAge(35)).toBe("G/H");
    expect(eligibleRoomAtAge(36)).toBe("J/K");
    expect(eligibleRoomAtAge(59)).toBe("J/K");
    expect(eligibleRoomAtAge(60)).toBe("SAC");
  });
});
