import { describe, expect, it } from "vitest";
import { computeGapFlags } from "./gap-flags";

describe("gap flags", () => {
  it("fires on a thin record", () => {
    const gaps = computeGapFlags({
      title: "Something",
      description: "Does a thing",
    });
    expect(gaps).toContain("No owner named");
    expect(gaps).toContain("No authors credited");
    expect(gaps).toContain("No success criterion");
    expect(gaps).toContain("AI tool & approach not identified");
    expect(gaps).toContain("No adoption evidence beyond the authors");
  });

  it("clears as fields are filled", () => {
    const gaps = computeGapFlags({
      title: "T",
      description: "D",
      department: "css",
      owner: { personId: null, userId: null, displayName: "Katie Clarkson" },
      authors: [{ personId: null, userId: null, displayName: "A" }],
      aiTools: ["Claude"],
      approaches: ["prompt"],
      successCriterion: "First response under 2 hours",
      roiStatus: "in_progress",
      baselineValue: 6,
      revisitOn: "2026-12-01",
      gateAdoption: true,
    });
    expect(gaps).toEqual([]);
  });

  it("asks for a revisit date whatever the ROI status, until the actual number is in", () => {
    expect(
      computeGapFlags({ title: "T", description: "D", roiStatus: "not_yet_measurable" }),
    ).toContain("No revisit date for ROI");
    expect(
      computeGapFlags({ title: "T", description: "D", roiStatus: "in_progress" }),
    ).toContain("No revisit date for ROI");
    expect(
      computeGapFlags({ title: "T", description: "D", roiStatus: "in_progress", postValue: 2 }),
    ).not.toContain("No revisit date for ROI");
  });

  it("flags a missing baseline once measurement is claimed", () => {
    const gaps = computeGapFlags({
      title: "T",
      description: "D",
      roiStatus: "in_progress",
      baselineValue: null,
    });
    expect(gaps).toContain("ROI baseline missing");
  });

  it("asks a launched time-saved workflow for its expected ROI, and nothing else", () => {
    const launched = { title: "T", description: "D", status: "launched" as const };
    expect(computeGapFlags({ ...launched, valueType: "time_saved" })).toContain(
      "No expected ROI at launch",
    );
    expect(
      computeGapFlags({ ...launched, valueType: "time_saved", expectedValue: 1 }),
    ).not.toContain("No expected ROI at launch");
    // Not sure yet, or revenue, or not yet launched: no prompt.
    expect(computeGapFlags({ ...launched })).not.toContain("No expected ROI at launch");
    expect(computeGapFlags({ ...launched, valueType: "revenue" })).not.toContain(
      "No expected ROI at launch",
    );
    expect(
      computeGapFlags({ ...launched, status: "in_testing", valueType: "time_saved" }),
    ).not.toContain("No expected ROI at launch");
  });
});
