import { describe, it, expect } from "vitest";
import { minimumFor } from "./schedule-derive";

describe("minimumFor — SAC open windows", () => {
  it("is open in its usual morning and afternoon windows", () => {
    expect(minimumFor("SAC", "7:00 AM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "8:00 AM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "2:30 PM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "5:00 PM", "2026-10-12", "2026-10-12")).toBe(2);
  });

  it("is closed midday by default", () => {
    expect(minimumFor("SAC", "8:30 AM", "2026-10-12", "2026-10-12")).toBeNull();
    expect(minimumFor("SAC", "12:30 PM", "2026-10-12", "2026-10-12")).toBeNull();
    expect(minimumFor("SAC", "5:30 PM", "2026-10-12", "2026-10-12")).toBeNull();
  });

  it("opens from 1:00 PM on Monday, Oct 12 (McKenzie arrives early that day)", () => {
    expect(minimumFor("SAC", "1:00 PM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "2:00 PM", "2026-10-12", "2026-10-12")).toBe(1);
    // Still closed right up to the start of the extra window.
    expect(minimumFor("SAC", "12:30 PM", "2026-10-12", "2026-10-12")).toBeNull();
  });

  it("does not open the extra window on other dates", () => {
    expect(minimumFor("SAC", "1:00 PM", "2026-10-19", "2026-10-19")).toBeNull();
    expect(minimumFor("SAC", "1:00 PM", "2026-10-12", "2026-10-13")).toBeNull();
    // With no day date at all, the extra window cannot apply.
    expect(minimumFor("SAC", "1:00 PM", "2026-10-12")).toBeNull();
  });

  it("keeps the all-day override for Sept 21", () => {
    expect(minimumFor("SAC", "1:00 PM", "2026-09-21", "2026-09-21")).toBe(1);
    expect(minimumFor("SAC", "12:30 PM", "2026-09-21", "2026-09-21")).toBe(1);
  });
});

describe("minimumFor — whole-day room closures", () => {
  it("opens Room I 7:00 AM–12:00 PM only on Wednesday, Oct 21", () => {
    expect(minimumFor("Room I", "7:00 AM", "2026-10-19", "2026-10-21")).toBe(1);
    expect(minimumFor("Room I", "11:30 AM", "2026-10-19", "2026-10-21")).toBe(1);
    expect(minimumFor("Room I", "12:00 PM", "2026-10-19", "2026-10-21")).toBeNull();
    expect(minimumFor("Room I", "12:30 PM", "2026-10-19", "2026-10-21")).toBeNull();
    expect(minimumFor("Room I", "3:30 PM", "2026-10-19", "2026-10-21")).toBeNull();
  });

  it("does not close Room I on other days that week", () => {
    expect(minimumFor("Room I", "9:00 AM", "2026-10-19", "2026-10-19")).toBe(1);
    expect(minimumFor("Room I", "9:00 AM", "2026-10-19", "2026-10-23")).toBe(1);
  });

  it("reopens Room I on Thursday, Oct 22", () => {
    for (const time of ["7:00 AM", "9:00 AM", "12:00 PM", "3:30 PM"]) {
      expect(minimumFor("Room I", time, "2026-10-19", "2026-10-22")).toBe(1);
    }
    expect(minimumFor("Room F", "9:00 AM", "2026-10-19", "2026-10-22")).toBe(1);
  });

  it("closes SAC 7:30 AM to 2:30 PM on Wednesday October 21", () => {
    expect(minimumFor("SAC", "7:00 AM", "2026-10-19", "2026-10-21")).toBe(1);
    for (const time of ["7:30 AM", "8:00 AM", "9:00 AM", "2:00 PM"]) {
      expect(minimumFor("SAC", time, "2026-10-19", "2026-10-21")).toBeNull();
    }
    expect(minimumFor("SAC", "2:30 PM", "2026-10-19", "2026-10-21")).toBe(1);
    expect(minimumFor("SAC", "8:00 AM", "2026-10-19", "2026-10-22")).toBe(1);
  });

  it("does not close other rooms on Oct 21", () => {
    expect(minimumFor("Room F", "9:00 AM", "2026-10-19", "2026-10-21")).toBe(1);
    expect(minimumFor("J/K", "9:00 AM", "2026-10-19", "2026-10-21")).toBe(2);
  });

  it("cannot close a room without a day date", () => {
    expect(minimumFor("Room I", "9:00 AM", "2026-10-19")).toBe(1);
  });
});

describe("minimumFor — week of Oct 26–30, 2026", () => {
  it("needs only 1 staff in J/K all week, with no 2-staff windows", () => {
    for (const d of ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]) {
      expect(minimumFor("J/K", "9:00 AM", "2026-10-26", d)).toBe(1);
      expect(minimumFor("J/K", "3:00 PM", "2026-10-26", d)).toBe(1);
      expect(minimumFor("J/K", "7:00 AM", "2026-10-26", d)).toBe(1);
    }
  });

  it("keeps the usual 2-staff J/K windows on other weeks", () => {
    expect(minimumFor("J/K", "9:00 AM", "2026-11-02", "2026-11-02")).toBe(2);
    expect(minimumFor("J/K", "3:00 PM", "2026-10-19", "2026-10-19")).toBe(2);
  });

  it("opens SAC only 7:00–7:30 AM and 2:30–5:30 PM that week", () => {
    for (const d of ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]) {
      expect(minimumFor("SAC", "7:00 AM", "2026-10-26", d)).toBe(1);
      expect(minimumFor("SAC", "7:30 AM", "2026-10-26", d)).toBeNull();
      expect(minimumFor("SAC", "8:00 AM", "2026-10-26", d)).toBeNull();
      expect(minimumFor("SAC", "12:30 PM", "2026-10-26", d)).toBeNull();
      expect(minimumFor("SAC", "2:30 PM", "2026-10-26", d)).toBe(1);
      expect(minimumFor("SAC", "5:00 PM", "2026-10-26", d)).toBe(2);
    }
  });

  it("does not shorten the SAC morning on other weeks", () => {
    expect(minimumFor("SAC", "8:00 AM", "2026-11-02", "2026-11-02")).toBe(1);
    expect(minimumFor("SAC", "12:00 PM", "2026-09-21", "2026-09-21")).toBe(1);
  });
});

describe("minimumFor — center closes at 5:30 PM", () => {
  it("needs no staff in any room from the 5:30 PM slot onward", () => {
    for (const room of ["G/H", "J/K", "M.O.D."]) {
      expect(minimumFor(room, "5:30 PM", "2026-11-16", "2026-11-16")).toBeNull();
    }
  });

  it("still staffs the 4:00 PM slot", () => {
    // A week with no one-off J/K rules, so the usual 2-staff 3:00–4:30 window applies.
    expect(minimumFor("G/H", "4:00 PM", "2026-12-07", "2026-12-07")).toBe(2);
    expect(minimumFor("J/K", "4:00 PM", "2026-12-07", "2026-12-07")).toBe(2);
    expect(minimumFor("M.O.D.", "4:00 PM", "2026-12-07", "2026-12-07")).toBe(1);
    expect(minimumFor("SAC", "4:00 PM", "2026-12-07", "2026-12-07")).toBe(1);
  });
});

describe("minimumFor — 4:30 PM combine into SAC", () => {
  it("closes every other room from 4:30 PM onward", () => {
    for (const room of ["G/H", "J/K", "M.O.D.", "Room F", "Room I"]) {
      for (const time of ["4:30 PM", "5:00 PM"]) {
        expect(minimumFor(room, time, "2026-11-16", "2026-11-16")).toBeNull();
      }
    }
  });

  it("needs 2 staff in SAC from 4:30 PM until close", () => {
    expect(minimumFor("SAC", "4:30 PM", "2026-11-16", "2026-11-16")).toBe(2);
    expect(minimumFor("SAC", "5:00 PM", "2026-11-16", "2026-11-16")).toBe(2);
    expect(minimumFor("SAC", "5:30 PM", "2026-11-16", "2026-11-16")).toBeNull();
  });

  it("applies on SAC all-day dates too", () => {
    expect(minimumFor("SAC", "4:30 PM", "2026-11-02", "2026-11-02")).toBe(2);
    expect(minimumFor("Room I", "4:30 PM", "2026-11-02", "2026-11-02")).toBeNull();
  });

  it("keeps a room closed for the day as closed at 4:30 PM", () => {
    // Room I is closed from 12:00 PM on Wed Oct 21 — still closed at 4:30 PM.
    expect(minimumFor("Room I", "4:30 PM", "2026-10-19", "2026-10-21")).toBeNull();
    expect(minimumFor("G/H", "4:00 PM", "2026-10-19", "2026-10-21")).toBe(2);
  });
});
