import { describe, expect, it } from "vitest";
import { calculateRoi } from "@/lib/roi";
import {
  calculateRoiForCoach,
  ROI_TOOL_DESCRIPTION,
  roiTools,
} from "./roi-tool";

describe("calculate_roi — the Coach's calculator", () => {
  const mpr = {
    valueType: "time_saved" as const,
    baselineValue: 10,
    baselinePeriod: "month" as const,
    afterValue: 1,
    buildHours: 80,
    maintenanceHoursPerYear: 20,
  };

  it("returns exactly what lib/roi computes, so the Coach and the record page agree", () => {
    const out = calculateRoiForCoach(mpr);
    const r = calculateRoi(mpr);
    expect(out.computed).toBe(true);
    expect(r.ok).toBe(true);
    if (!out.computed || !r.ok) return;
    expect(out.hoursSavedPerYear).toBe(r.figures.hoursSavedPerYear);
    expect(out.yearOneRoiPct).toBe(Math.round(r.figures.yearOneRoiPct));
    expect(out.yearTwoRoiPct).toBe(440);
    expect(out.readout).toBe("ROI, year one: 35% · payback about 9 months · year two 440%");
    expect(out.netImpactDraft).toMatch(/^Saves about 9 hours a month/);
  });

  it("says why a revenue case has no percentage rather than inventing one", () => {
    const out = calculateRoiForCoach({ ...mpr, valueType: "revenue" });
    expect(out.computed).toBe(false);
    if (out.computed) return;
    expect(out.missing).toBe("not_time_saved");
    expect(out.explanation).toMatch(/counts and rates/);
  });

  it("names the first missing input instead of guessing it", () => {
    const out = calculateRoiForCoach({ ...mpr, buildHours: null });
    expect(out.computed).toBe(false);
    if (out.computed) return;
    expect(out.missing).toBe("build_hours");
  });

  it("never mentions dollars", () => {
    const out = calculateRoiForCoach(mpr);
    expect(JSON.stringify(out)).not.toMatch(/\$\s?\d/);
  });

  // It is a read-side tool: it has an execute, and it is not a proposal.
  it("is executable, described for routing, and declared once", () => {
    const tools = roiTools();
    expect(Object.keys(tools)).toEqual(["calculate_roi"]);
    const t = tools.calculate_roi as { execute?: unknown; description?: string };
    expect(typeof t.execute).toBe("function");
    expect(t.description).toBe(ROI_TOOL_DESCRIPTION);
    expect(ROI_TOOL_DESCRIPTION).toMatch(/never do this arithmetic yourself/);
    expect(ROI_TOOL_DESCRIPTION).toMatch(/writes nothing/);
  });
});
