import { describe, it, expect } from "vitest";
import { minimumFor } from "./schedule-derive";

describe("minimumFor — SAC open windows", () => {
  it("is open in its usual morning and afternoon windows", () => {
    expect(minimumFor("SAC", "7:00 AM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "8:00 AM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "2:30 PM", "2026-10-12", "2026-10-12")).toBe(1);
    expect(minimumFor("SAC", "5:00 PM", "2026-10-12", "2026-10-12")).toBe(1);
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
