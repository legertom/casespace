import { describe, expect, it } from "vitest";
import {
  canSetStatus,
  countsTowardDocumented,
  documentedGatesComplete,
  etDateString,
  isQualifiedPlus,
  isStale,
  roiComplete,
  roiGaps,
  suggestEltOrg,
  targetSumWarning,
  type QualifiedPlusFields,
} from "./domain";

const completeRoi: QualifiedPlusFields = {
  status: "qualified",
  successCriterion: "Ticket first-response time under 2 hours",
  successCriterionMet: "yes",
  baselineMetric: "Median first-response time",
  baselineValue: 6.5,
  postValue: 1.4,
  measurementMethod: "Zendesk report, trailing 4 weeks, same queue",
  netImpactStatement:
    "First responses now land in a quarter of the time with no quality drop.",
  isPositive: true,
  roiStatus: "complete",
};

describe("Qualified+ derivation", () => {
  it("is Qualified+ when qualified and ROI scoring is complete", () => {
    expect(isQualifiedPlus(completeRoi)).toBe(true);
  });

  it("is not Qualified+ below Qualified even with complete ROI", () => {
    expect(isQualifiedPlus({ ...completeRoi, status: "launched" })).toBe(false);
  });

  it.each([
    ["successCriterion", { successCriterion: null }],
    ["successCriterionMet", { successCriterionMet: "not_yet" as const }],
    ["success criterion missed", { successCriterionMet: "no" as const }],
    ["baselineMetric", { baselineMetric: "  " }],
    ["baselineValue", { baselineValue: null }],
    ["postValue", { postValue: null }],
    ["measurementMethod", { measurementMethod: null }],
    ["netImpactStatement", { netImpactStatement: null }],
    ["isPositive null", { isPositive: null }],
    ["negative outcome", { isPositive: false }],
    ["roiStatus in_progress", { roiStatus: "in_progress" as const }],
  ])("fails without %s", (_label, patch) => {
    expect(isQualifiedPlus({ ...completeRoi, ...patch })).toBe(false);
  });

  it("lists gaps for a thin record", () => {
    const gaps = roiGaps({
      ...completeRoi,
      successCriterion: null,
      postValue: null,
      roiStatus: "in_progress",
    });
    expect(gaps).toContain("No success criterion defined");
    expect(gaps).toContain("No post-measurement");
    expect(gaps).toContain("ROI scoring not marked complete");
    expect(roiGaps(completeRoi)).toEqual([]);
  });

  it("roiComplete requires a positive outcome", () => {
    expect(roiComplete({ ...completeRoi, isPositive: false })).toBe(false);
  });
});

describe("documented gates", () => {
  it("requires all four gates", () => {
    const gates = {
      gateNamed: true,
      gateTool: true,
      gateAdoption: true,
      gateOwner: true,
    };
    expect(documentedGatesComplete(gates)).toBe(true);
    expect(documentedGatesComplete({ ...gates, gateAdoption: false })).toBe(
      false,
    );
  });

  it("the 45 counts Qualified only", () => {
    expect(countsTowardDocumented("qualified")).toBe(true);
    expect(countsTowardDocumented("launched")).toBe(false);
  });
});

describe("status transitions", () => {
  it("admins may promote to and demote from Qualified", () => {
    expect(canSetStatus("admin", "launched", "qualified")).toBe(true);
    expect(canSetStatus("admin", "qualified", "launched")).toBe(true);
  });

  it("contributors may move among pre-Qualified statuses, both directions", () => {
    expect(canSetStatus("contributor", "in_discovery", "approved_by_fl")).toBe(
      true,
    );
    expect(canSetStatus("contributor", "in_testing", "under_construction")).toBe(
      true,
    );
  });

  it("contributors may not touch Qualified in either direction", () => {
    expect(canSetStatus("contributor", "launched", "qualified")).toBe(false);
    expect(canSetStatus("contributor", "qualified", "launched")).toBe(false);
  });

  it("viewers may not change status; no-ops are rejected", () => {
    expect(canSetStatus("viewer", "in_discovery", "launched")).toBe(false);
    expect(canSetStatus("admin", "launched", "launched")).toBe(false);
  });
});

describe("dates", () => {
  it("converts instants to ET calendar dates", () => {
    // 03:00 UTC on Aug 5 is still Aug 4 in New York (EDT, UTC-4).
    expect(etDateString(new Date("2026-08-05T03:00:00Z"))).toBe("2026-08-04");
    expect(etDateString(new Date("2026-08-05T12:00:00Z"))).toBe("2026-08-05");
  });
});

describe("ELT allocation", () => {
  const orgs: import("./domain").EltOrgLike[] = [
    { id: "1", name: "Amy Lee (CFO)", target: 2, departments: ["finance_legal"] },
    { id: "2", name: "Eric Krugler (CTO)", target: 3, departments: ["engineering"] },
    { id: "3", name: "Jamie Reffell (CPO)", target: 2, departments: ["product_design"] },
    { id: "4", name: "Phillip Mikula (CRO)", target: 3, departments: ["mss"] },
    { id: "5", name: "Kate Schaff", target: 3, departments: [] },
    { id: "6", name: "Trish Sparks (CEO)", target: 2, departments: ["people"] },
  ];

  it("suggests the mapped org from a department", () => {
    expect(suggestEltOrg("engineering", orgs)?.name).toBe(
      "Eric Krugler (CTO)",
    );
  });

  it("leaves unmapped departments unallocated — never force a mapping", () => {
    expect(suggestEltOrg("css", orgs)).toBeNull();
    expect(suggestEltOrg("business_operations", orgs)).toBeNull();
    expect(suggestEltOrg(null, orgs)).toBeNull();
  });

  it("warns (not blocks) when targets stop summing to 15", () => {
    expect(targetSumWarning(orgs)).toBeNull();
    const warned = targetSumWarning([{ target: 4 }, { target: 4 }]);
    expect(warned).toMatch(/sum to 8, not 15/);
  });
});

describe("attention flags", () => {
  it("flags records sitting in one status too long (default 21 days)", () => {
    const now = new Date("2026-08-04T12:00:00Z");
    const twentyTwoDaysAgo = new Date("2026-07-13T12:00:00Z");
    const tenDaysAgo = new Date("2026-07-25T12:00:00Z");
    expect(isStale(twentyTwoDaysAgo, now)).toBe(true);
    expect(isStale(tenDaysAgo, now)).toBe(false);
    expect(isStale(tenDaysAgo, now, 7)).toBe(true);
  });
});
