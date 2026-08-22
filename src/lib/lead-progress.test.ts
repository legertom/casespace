import { describe, expect, it } from "vitest";
import { isLeadSyncMonth, LEAD_SYNC_MONTHS } from "./lead-progress";

describe("AI Lead monthly sync cadence", () => {
  it("covers each month from August through December 2026", () => {
    expect(LEAD_SYNC_MONTHS.map((month) => month.shortLabel)).toEqual([
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });

  it("only accepts months in the program cadence", () => {
    expect(isLeadSyncMonth("2026-08-01")).toBe(true);
    expect(isLeadSyncMonth("2027-01-01")).toBe(false);
  });
});
