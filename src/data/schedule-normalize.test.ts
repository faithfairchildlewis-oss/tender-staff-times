import { describe, expect, it } from "vitest";
import { normalizeStaffInfo } from "./schedule";

describe("normalizeStaffInfo", () => {
  it("treats a missing lunch object as { type: 'varies' }", () => {
    const info = normalizeStaffInfo({ hours: 10.5 });
    expect(info.lunch).toEqual({ type: "varies" });
    expect(info.hours).toBe(10.5);
    expect(info.rate).toBe(0);
    expect(info.daily_breaks).toEqual({});
  });

  it("treats a non-object lunch (empty string) as { type: 'varies' }", () => {
    const info = normalizeStaffInfo({ rate: 15, lunch: "" });
    expect(info.lunch).toEqual({ type: "varies" });
    expect(info.rate).toBe(15);
  });

  it("keeps a fixed lunch with a valid time", () => {
    const info = normalizeStaffInfo({ lunch: { type: "fixed", time: "12:00 PM" } });
    expect(info.lunch).toEqual({ type: "fixed", time: "12:00 PM" });
  });

  it("drops a fixed lunch with a non-string time", () => {
    const info = normalizeStaffInfo({ lunch: { type: "fixed", time: 42 } });
    expect(info.lunch).toEqual({ type: "fixed", time: undefined });
  });

  it("returns defaults for null/undefined/non-object input", () => {
    expect(normalizeStaffInfo(null)).toEqual({
      rate: 0,
      hours: 0,
      lunch: { type: "varies" },
      daily_breaks: {},
    });
    expect(normalizeStaffInfo("garbage").lunch).toEqual({ type: "varies" });
  });
});
