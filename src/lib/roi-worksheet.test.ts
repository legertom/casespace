import { describe, expect, it } from "vitest";
import { parseRoiWorksheet } from "./roi-worksheet";

/**
 * The exact text the module's "Copy for CaseSpace" button produces for the
 * MPR example (its wsText, with "Load the MPR example" and a revisit date
 * four months out), and the revenue variant.
 */
const MPR = `CaseSpace entry — MPR metrics automation
Value type: Productivity
Intended impact: Make MPR prep more efficient for the BizOps team so the monthly deck is ready without a manual metrics pull.
Metric that should move: Hours per month BizOps spends pulling metrics
Baseline: 10 h/month
Expected improvement: 90% of that time removed → 108 h/year
Build: 80 h × $75 = $6,000
Recurring: 20 h/year maintenance; no material token cost
Expected ROI, year one: 35% · payback about 9 months · year two 440%
Revisit date: 2027-02-21
How I will confirm actual ROI: Compare BizOps hours on MPR prep across three monthly runs after launch.
Estimates are directional (calendar heuristic) unless noted.`;

const WIN_RATE = `CaseSpace entry — Sales follow-up drafts
Value type: Revenue
Intended impact: Win more of the deals we already pitch
Metric that should move: win rate
Baseline: 50% of 50 opportunities/year at $2,500
Expected improvement: 55% → $6,250 incremental/year
Build: 50 h × $75 = $3,750
Recurring: no material maintenance; $240/year tokens
Expected ROI, year one: 67% · payback about 7 months · year two ∞
Revisit date: —
How I will confirm actual ROI: —
Estimates are directional (calendar heuristic) unless noted.`;

describe("parseRoiWorksheet", () => {
  it("reads the MPR worksheet into the record's fields, in hours", () => {
    expect(parseRoiWorksheet(MPR)).toEqual({
      title: "MPR metrics automation",
      valueType: "time_saved",
      baselineMetric: "Hours per month BizOps spends pulling metrics",
      baselineValue: 10,
      baselineUnit: "hours",
      baselinePeriod: "month",
      expectedValue: 1,
      buildHours: 80,
      maintenanceHoursPerYear: 20,
      revisitOn: "2027-02-21",
      measurementMethod:
        "Compare BizOps hours on MPR prep across three monthly runs after launch.",
    });
  });

  it("drops every dollar amount the module printed", () => {
    expect(JSON.stringify(parseRoiWorksheet(MPR))).not.toMatch(/\$/);
    expect(JSON.stringify(parseRoiWorksheet(WIN_RATE))).not.toMatch(/\$/);
  });

  it("reads a revenue worksheet as rates and leaves the blanks blank", () => {
    expect(parseRoiWorksheet(WIN_RATE)).toEqual({
      title: "Sales follow-up drafts",
      valueType: "revenue",
      baselineMetric: "win rate",
      baselineValue: 50,
      baselineUnit: "%",
      expectedValue: 55,
      buildHours: 50,
    });
  });

  it("ignores the module's own computed ROI line — Casespace recomputes", () => {
    const out = parseRoiWorksheet(MPR);
    expect(JSON.stringify(out)).not.toMatch(/35|440|payback/);
  });

  it("leaves the placeholder name alone and returns null for anything else", () => {
    const blank = parseRoiWorksheet(
      "CaseSpace entry — (workflow name)\nValue type: Productivity\nBaseline: —",
    );
    expect(blank).toEqual({ valueType: "time_saved" });
    expect(parseRoiWorksheet("Met with Lotte about the metrics pull; takes her ages.")).toBeNull();
  });

  it("accepts a plain hyphen in the header and a weekly baseline", () => {
    const out = parseRoiWorksheet(
      "CaseSpace entry - Weekly digest\nValue type: Productivity\nBaseline: 2.5 h/week\nExpected improvement: 80% of that time removed → 104 h/year\nBuild: 12 h × $75 = $900",
    );
    expect(out).toMatchObject({
      title: "Weekly digest",
      baselineValue: 2.5,
      baselinePeriod: "week",
      expectedValue: 0.5,
      buildHours: 12,
    });
  });
});
