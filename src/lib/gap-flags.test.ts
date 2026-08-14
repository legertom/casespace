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
      gateAdoption: true,
    });
    expect(gaps).toEqual([]);
  });

  it("asks for a revisit date when ROI is not yet measurable", () => {
    const gaps = computeGapFlags({
      title: "T",
      description: "D",
      roiStatus: "not_yet_measurable",
    });
    expect(gaps).toContain("No revisit date for ROI");
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
});
