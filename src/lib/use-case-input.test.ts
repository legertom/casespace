import { describe, expect, it } from "vitest";
import {
  applyCreateDefaults,
  useCaseCreateSchema,
} from "./use-case-input";

describe("sparse API create", () => {
  it("accepts title + description alone and fills the emptiest honest defaults", () => {
    const parsed = useCaseCreateSchema.parse({
      title: "Meeting-notes summarizer",
      description: "Summarizes CS call notes into CRM-ready updates.",
    });
    const row = applyCreateDefaults(parsed, {
      source: "mcp",
      createdById: "user-1",
    });
    expect(row.status).toBe("in_discovery");
    expect(row.source).toBe("mcp");
    expect(row.gateNamed).toBe(false);
    expect(row.gateAdoption).toBe(false);
    expect(row.roiStatus).toBe("not_yet_measurable");
    expect(row.successCriterionMet).toBe("not_yet");
    expect(row.aiTools).toEqual([]);
    expect(row.currentSteps).toEqual([]);
    expect(row.department).toBeNull();
    expect(row.ownerName).toBeNull();
    expect(row.isPositive).toBeNull();
  });

  it("rejects records without title or description", () => {
    expect(() => useCaseCreateSchema.parse({ title: "x" })).toThrow();
    expect(() =>
      useCaseCreateSchema.parse({ title: "  ", description: "y" }),
    ).toThrow();
  });

  it("never allows creating directly at Qualified", () => {
    expect(() =>
      useCaseCreateSchema.parse({
        title: "t",
        description: "d",
        status: "qualified",
      }),
    ).toThrow();
    const ok = useCaseCreateSchema.parse({
      title: "t",
      description: "d",
      status: "launched",
    });
    expect(ok.status).toBe("launched");
  });

  it("bounds ratings to 1–5", () => {
    expect(() =>
      useCaseCreateSchema.parse({
        title: "t",
        description: "d",
        ratingPain: 6,
      }),
    ).toThrow();
  });
});
