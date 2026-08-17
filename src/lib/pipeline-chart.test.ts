import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIPELINE_CHART,
  PIPELINE_CHARTS,
  PIPELINE_CHART_HINTS,
  PIPELINE_CHART_LABELS,
  otherPipelineChart,
  parsePipelineChart,
} from "./pipeline-chart";

describe("pipeline chart preference", () => {
  it("defaults to the funnel", () => {
    expect(DEFAULT_PIPELINE_CHART).toBe("conversion");
    expect(PIPELINE_CHARTS).toContain(DEFAULT_PIPELINE_CHART);
  });

  it("keeps a recognized choice", () => {
    for (const choice of PIPELINE_CHARTS) {
      expect(parsePipelineChart(choice)).toBe(choice);
    }
  });

  it("falls back rather than throwing on anything else", () => {
    for (const junk of [null, undefined, "", "bars", 7, {}, [], "CONVERSION"]) {
      expect(parsePipelineChart(junk)).toBe(DEFAULT_PIPELINE_CHART);
    }
  });

  it("toggles between exactly the two choices", () => {
    for (const choice of PIPELINE_CHARTS) {
      const other = otherPipelineChart(choice);
      expect(other).not.toBe(choice);
      expect(PIPELINE_CHARTS).toContain(other);
      expect(otherPipelineChart(other)).toBe(choice);
    }
  });

  it("labels and explains every choice", () => {
    for (const choice of PIPELINE_CHARTS) {
      expect(PIPELINE_CHART_LABELS[choice]).toBeTruthy();
      expect(PIPELINE_CHART_HINTS[choice]).toBeTruthy();
    }
  });
});
