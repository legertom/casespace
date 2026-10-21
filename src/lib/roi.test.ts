import { describe, expect, it } from "vitest";
import {
  actualRoi,
  baselineUnitFor,
  calculateRoi,
  expectedRoi,
  fmtHours,
  fmtPayback,
  fmtPct,
  isRevisitDue,
  netImpactDraft,
  pctRemoved,
  roiReadoutLine,
  roiStepFor,
} from "./roi";

/**
 * The worked examples are the training module's own (roi-wksp, Kate Schaff's
 * ROI workshop). They are the contract: a lead who did the worksheet there
 * and types the same numbers here must see the same percentage.
 */
describe("calculateRoi — the workshop's worked examples", () => {
  const mpr = {
    valueType: "time_saved" as const,
    baselineValue: 10,
    baselinePeriod: "month" as const,
    buildHours: 80,
    maintenanceHoursPerYear: 20,
  };

  it("MPR metrics automation, expected: 35%, payback about 9 months, year two 440%", () => {
    const r = calculateRoi({ ...mpr, afterValue: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.hoursSavedPerYear).toBeCloseTo(108);
    expect(r.figures.yearOneNetHours).toBeCloseTo(28);
    expect(r.figures.yearOneRoiPct).toBeCloseTo(35);
    expect(fmtPayback(r.figures.paybackMonths)).toBe("about 9 months");
    expect(r.figures.yearTwoRoiPct).toBeCloseTo(440);
    expect(r.figures.twoYearRoiPct).toBeCloseTo(116);
    expect(roiReadoutLine(r.figures, "Expected")).toBe(
      "Expected ROI, year one: 35% · payback about 9 months · year two 440%",
    );
  });

  it("MPR, actual: 8 hours a month really saved is 20%", () => {
    const r = calculateRoi({ ...mpr, afterValue: 2, maintenanceHoursPerYear: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.hoursSavedPerYear).toBeCloseTo(96);
    expect(r.figures.yearOneRoiPct).toBeCloseTo(20);
    expect(fmtPayback(r.figures.paybackMonths)).toBe("about 10 months");
    expect(r.figures.yearTwoRoiPct).toBeNull();
  });

  it("the training module itself: 10 hours of value for 1 hour of build is 900%", () => {
    // A one-off saving is a baseline per year with nothing left after.
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 10,
      baselinePeriod: "year",
      afterValue: 0,
      buildHours: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.yearOneRoiPct).toBeCloseTo(900);
    expect(fmtPayback(r.figures.paybackMonths)).toBe("about 1 month");
  });

  it("knowledge check #1: 4 hours a month against a 60-hour build is −20%, payback 15 months", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 4,
      baselinePeriod: "month",
      afterValue: 0,
      buildHours: 60,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.yearOneRoiPct).toBeCloseTo(-20);
    expect(fmtPct(r.figures.yearOneRoiPct)).toBe("−20%");
    expect(fmtPayback(r.figures.paybackMonths)).toBe("about 15 months");
  });

  it("normalises a weekly baseline to a year", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 2,
      baselinePeriod: "week",
      afterValue: 0.5,
      buildHours: 39,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.hoursSavedPerYear).toBeCloseTo(78);
    expect(r.figures.yearOneRoiPct).toBeCloseTo(100);
  });

  it("a workflow that made things slower is negative, and never pays back", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 10,
      baselinePeriod: "month",
      afterValue: 12,
      buildHours: 80,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.figures.yearOneRoiPct).toBeLessThan(-100);
    expect(r.figures.paybackMonths).toBeNull();
    expect(fmtPayback(r.figures.paybackMonths)).toBe("never");
  });
});

describe("calculateRoi — what it refuses to compute", () => {
  const base = {
    valueType: "time_saved" as const,
    baselineValue: 10,
    baselinePeriod: "month" as const,
    afterValue: 1,
    buildHours: 80,
  };

  it("needs a value type, and only time saved computes", () => {
    expect(calculateRoi({ ...base, valueType: null })).toEqual({
      ok: false,
      reason: "value_type",
    });
    expect(calculateRoi({ ...base, valueType: "revenue" })).toEqual({
      ok: false,
      reason: "not_time_saved",
    });
  });

  it("names the first missing input, in the order the form asks", () => {
    expect(calculateRoi({ ...base, baselineValue: null })).toEqual({
      ok: false,
      reason: "baseline",
    });
    expect(calculateRoi({ ...base, baselinePeriod: null })).toEqual({
      ok: false,
      reason: "period",
    });
    expect(calculateRoi({ ...base, afterValue: undefined })).toEqual({
      ok: false,
      reason: "after",
    });
    expect(calculateRoi({ ...base, buildHours: null })).toEqual({
      ok: false,
      reason: "build_hours",
    });
  });

  it("treats zero build hours as missing — there is nothing to divide by", () => {
    expect(calculateRoi({ ...base, buildHours: 0 })).toEqual({
      ok: false,
      reason: "build_hours",
    });
  });
});

describe("expected and actual ROI from a record", () => {
  const record = {
    valueType: "time_saved" as const,
    baselineValue: 10,
    baselinePeriod: "month" as const,
    expectedValue: 1,
    postValue: 2,
    buildHours: 80,
    maintenanceHoursPerYear: 20,
  };

  it("reads expected from expectedValue and actual from postValue", () => {
    const e = expectedRoi(record);
    const a = actualRoi(record);
    expect(e.ok && Math.round(e.figures.yearOneRoiPct)).toBe(35);
    expect(a.ok && Math.round(a.figures.yearOneRoiPct)).toBe(20);
  });

  it("a record with no value type computes nothing — legacy records look as they always did", () => {
    expect(expectedRoi({ ...record, valueType: null }).ok).toBe(false);
    expect(actualRoi({ ...record, valueType: null }).ok).toBe(false);
  });

  it("a plan without a measurement has expected but not actual", () => {
    expect(expectedRoi({ ...record, postValue: null }).ok).toBe(true);
    expect(actualRoi({ ...record, postValue: null })).toEqual({
      ok: false,
      reason: "after",
    });
  });
});

describe("formatting", () => {
  it("rounds percentages and uses a real minus sign", () => {
    expect(fmtPct(35.4)).toBe("35%");
    expect(fmtPct(-19.6)).toBe("−20%");
    expect(fmtPct(0)).toBe("0%");
  });

  it("spells payback the way the module does", () => {
    expect(fmtPayback(0.4)).toBe("under a month");
    expect(fmtPayback(1.2)).toBe("about 1 month");
    expect(fmtPayback(8.89)).toBe("about 9 months");
    expect(fmtPayback(40)).toBe("over 3 years");
    expect(fmtPayback(null)).toBe("never");
  });

  it("pluralises hours and keeps one decimal", () => {
    expect(fmtHours(1)).toBe("1 hour");
    expect(fmtHours(0.5)).toBe("0.5 hours");
    expect(fmtHours(108)).toBe("108 hours");
    expect(fmtHours(1234.56)).toBe("1,234.6 hours");
  });

  it("gives the percentage of time removed, the way the worksheet phrases it", () => {
    expect(pctRemoved(10, 1)).toBeCloseTo(90);
    expect(pctRemoved(10, 12)).toBeCloseTo(-20);
    expect(pctRemoved(null, 1)).toBeNull();
    expect(pctRemoved(0, 0)).toBeNull();
  });

  it("fixes the unit for a value type and leaves it free otherwise", () => {
    expect(baselineUnitFor("time_saved")).toBe("hours");
    expect(baselineUnitFor("revenue")).toBe("%");
    expect(baselineUnitFor(null)).toBeNull();
  });
});

describe("netImpactDraft", () => {
  it("writes the MPR actual in hours, with payback beside ROI", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 10,
      baselinePeriod: "month",
      afterValue: 2,
      buildHours: 80,
      maintenanceHoursPerYear: 20,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(netImpactDraft(r.figures)).toBe(
      "Saves about 8 hours a month, 96 hours a year. The 80-hour build pays back in about 10 months. Year-one ROI 20%. Year two, after 20 hours of maintenance: 380%.",
    );
  });

  it("says so when the workflow costs time rather than saving it", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 10,
      baselinePeriod: "month",
      afterValue: 12,
      buildHours: 80,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(netImpactDraft(r.figures)).toMatch(/^Takes about 2 hours more a month/);
  });

  it("never mentions dollars", () => {
    const r = calculateRoi({
      valueType: "time_saved",
      baselineValue: 10,
      baselinePeriod: "month",
      afterValue: 1,
      buildHours: 80,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(netImpactDraft(r.figures)).not.toMatch(/\$/);
  });
});

describe("roiStepFor — which step opens first", () => {
  const today = "2026-10-21";

  it("opens the plan while the workflow is being scoped or built", () => {
    for (const status of ["in_discovery", "approved_by_fl", "under_construction"] as const) {
      expect(roiStepFor({ status, revisitOn: null, today })).toBe(1);
    }
  });

  it("opens expected ROI once it is in testing or launched", () => {
    expect(roiStepFor({ status: "in_testing", revisitOn: null, today })).toBe(2);
    expect(roiStepFor({ status: "launched", revisitOn: null, today })).toBe(2);
  });

  it("opens actual ROI once the revisit date has passed, whatever the status", () => {
    expect(roiStepFor({ status: "launched", revisitOn: "2026-10-01", today })).toBe(3);
    expect(roiStepFor({ status: "in_discovery", revisitOn: today, today })).toBe(3);
    expect(roiStepFor({ status: "launched", revisitOn: "2026-12-01", today })).toBe(2);
  });

  it("opens actual ROI for Kate's two stages", () => {
    expect(roiStepFor({ status: "qualified", revisitOn: null, today })).toBe(3);
    expect(roiStepFor({ status: "confirmed_positive_roi", revisitOn: null, today })).toBe(3);
  });
});

describe("isRevisitDue — Kate's step 6", () => {
  const today = "2026-10-21";
  const launched = { status: "launched" as const, revisitOn: "2026-10-01", postValue: null };

  it("is due once the date has passed with nothing measured", () => {
    expect(isRevisitDue(launched, today)).toBe(true);
    expect(isRevisitDue({ ...launched, revisitOn: today }, today)).toBe(true);
  });

  it("is not due before the date, without a date, or once measured", () => {
    expect(isRevisitDue({ ...launched, revisitOn: "2026-12-01" }, today)).toBe(false);
    expect(isRevisitDue({ ...launched, revisitOn: null }, today)).toBe(false);
    expect(isRevisitDue({ ...launched, postValue: 2 }, today)).toBe(false);
  });

  it("is never due on a confirmed record", () => {
    expect(isRevisitDue({ ...launched, status: "confirmed_positive_roi" }, today)).toBe(false);
  });

  it("is due at any other stage — a plan with a date is a plan", () => {
    expect(isRevisitDue({ ...launched, status: "in_discovery" }, today)).toBe(true);
    expect(isRevisitDue({ ...launched, status: "qualified" }, today)).toBe(true);
  });
});
