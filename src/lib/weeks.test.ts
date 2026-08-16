import { describe, expect, it } from "vitest";
import { isWeekSlug, mondayOf, priorWeekStart } from "./weeks";

describe("mondayOf", () => {
  it("maps every day of a week to its Monday", () => {
    expect(mondayOf("2026-08-10")).toBe("2026-08-10"); // Monday itself
    expect(mondayOf("2026-08-11")).toBe("2026-08-10");
    expect(mondayOf("2026-08-15")).toBe("2026-08-10"); // Saturday
    expect(mondayOf("2026-08-16")).toBe("2026-08-10"); // Sunday
  });

  it("crosses month and year boundaries", () => {
    expect(mondayOf("2026-08-01")).toBe("2026-07-27");
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("priorWeekStart", () => {
  it("is the Monday seven days before this week's", () => {
    expect(priorWeekStart("2026-08-15")).toBe("2026-08-03");
    expect(priorWeekStart("2026-08-10")).toBe("2026-08-03");
  });
});

describe("isWeekSlug", () => {
  it("accepts only Mondays", () => {
    expect(isWeekSlug("2026-08-10")).toBe(true);
    expect(isWeekSlug("2026-08-11")).toBe(false); // Tuesday
    expect(isWeekSlug("2026-08-16")).toBe(false); // Sunday
  });

  it("rejects non-dates and rollover dates", () => {
    expect(isWeekSlug("not-a-date")).toBe(false);
    expect(isWeekSlug("2026-8-10")).toBe(false);
    expect(isWeekSlug("2026-02-31")).toBe(false);
    expect(
      isWeekSlug("3d94f1a2-0000-4000-8000-000000000000"),
    ).toBe(false);
  });
});
