import { describe, it, expect } from "vitest";
import { buildDayItems, parseClockToMin } from "./day-items";

describe("parseClockToMin", () => {
  it("parses AM/PM clock strings", () => {
    expect(parseClockToMin("8:30 AM")).toBe(8 * 60 + 30);
    expect(parseClockToMin("12:30 PM")).toBe(12 * 60 + 30);
    expect(parseClockToMin("12:00 AM")).toBe(0);
    expect(parseClockToMin("1:15 PM")).toBe(13 * 60 + 15);
  });
  it("returns null on bad input", () => {
    expect(parseClockToMin("not a time")).toBeNull();
  });
});

describe("buildDayItems — lunch ordering", () => {
  const morning = { start: "8:30 AM", end: "12:30 PM", rooms: ["Room F"] };
  const afternoon = { start: "1:00 PM", end: "5:00 PM", rooms: ["G/H"] };

  it("embeds lunch chronologically between morning and afternoon shifts", () => {
    const items = buildDayItems([morning, afternoon], "12:30 PM", "Lunch");
    expect(items.map((i) => i.kind)).toEqual(["shift", "lunch", "shift"]);
    expect(items[1]).toMatchObject({ kind: "lunch", time: "12:30 PM" });
    expect(items[0]).toMatchObject({ kind: "shift", start: "8:30 AM" });
    expect(items[2]).toMatchObject({ kind: "shift", start: "1:00 PM" });
  });

  it("does NOT append lunch at the end when it occurs mid-day", () => {
    const items = buildDayItems([morning, afternoon], "12:30 PM", "Lunch");
    expect(items[items.length - 1].kind).toBe("shift");
  });

  it("places early lunch before a later shift", () => {
    const items = buildDayItems([afternoon], "12:00 PM", "Lunch");
    expect(items.map((i) => i.kind)).toEqual(["lunch", "shift"]);
  });

  it("places late lunch after the only shift", () => {
    const items = buildDayItems([morning], "1:00 PM", "Lunch");
    expect(items.map((i) => i.kind)).toEqual(["shift", "lunch"]);
  });

  it("omits lunch when lunchTime is null", () => {
    const items = buildDayItems([morning, afternoon], null, "Lunch");
    expect(items.every((i) => i.kind === "shift")).toBe(true);
    expect(items).toHaveLength(2);
  });

  it("sorts shifts even when supplied out of order, with lunch embedded", () => {
    const items = buildDayItems([afternoon, morning], "12:30 PM", "Lunch");
    expect(items.map((i) => i.kind)).toEqual(["shift", "lunch", "shift"]);
    expect(items[0]).toMatchObject({ start: "8:30 AM" });
    expect(items[2]).toMatchObject({ start: "1:00 PM" });
  });

  it("uses the provided label (e.g. Break vs Lunch)", () => {
    const items = buildDayItems([morning], "12:30 PM", "Break");
    const lunch = items.find((i) => i.kind === "lunch");
    expect(lunch).toMatchObject({ label: "Break" });
  });
});