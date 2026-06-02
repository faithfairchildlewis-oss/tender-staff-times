import { describe, it, expect } from "vitest";
import { verses, encouragements, getDailyContent } from "./daily-content";

describe("getDailyContent", () => {
  it("returns a valid verse and encouragement for every calendar day 1–31", () => {
    for (let day = 1; day <= 31; day++) {
      const result = getDailyContent(day);
      expect(result.verse).toBeDefined();
      expect(result.verse.text).toBeTypeOf("string");
      expect(result.verse.ref).toBeTypeOf("string");
      expect(result.encouragement).toBeTypeOf("string");
    }
  });

  it("maps day 1 to index 1 for both arrays", () => {
    const result = getDailyContent(1);
    expect(result.verse).toEqual(verses[1]);
    expect(result.encouragement).toEqual(encouragements[1]);
  });

  it("maps day 2 to index 2 for both arrays", () => {
    const result = getDailyContent(2);
    expect(result.verse).toEqual(verses[2]);
    expect(result.encouragement).toEqual(encouragements[2]);
  });

  it("wraps verse index at array length (30)", () => {
    const result = getDailyContent(30);
    expect(result.verse).toEqual(verses[0]); // 30 % 30 === 0
  });

  it("wraps verse index after array length", () => {
    const result = getDailyContent(31);
    expect(result.verse).toEqual(verses[1]); // 31 % 30 === 1
  });

  it("wraps encouragement index at array length (33)", () => {
    const result = getDailyContent(33);
    expect(result.encouragement).toEqual(encouragements[0]); // 33 % 33 === 0
  });

  it("wraps encouragement index after array length", () => {
    const result = getDailyContent(34);
    expect(result.encouragement).toEqual(encouragements[1]); // 34 % 33 === 1
  });

  it("handles day 0 (edge case) by mapping to index 0", () => {
    const result = getDailyContent(0);
    expect(result.verse).toEqual(verses[0]);
    expect(result.encouragement).toEqual(encouragements[0]);
  });

  it("handles large day numbers with stable wraparound", () => {
    const result60 = getDailyContent(60);
    expect(result60.verse).toEqual(verses[60 % verses.length]);
    expect(result60.encouragement).toEqual(encouragements[60 % encouragements.length]);
  });
});
