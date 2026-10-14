import { describe, expect, it } from "vitest";
import { makeIdentity } from "./people-match";
import {
  teamCoverageCount,
  type CoverageLead,
  type CoverageRecord,
} from "./team-coverage";

const ONBOARDING = "team-onboarding";
const PRESALES = "team-presales";
const POPS = "team-pops";
const TA = "team-ta";

// The case that prompted this module: the roster says "Jonathan Boutin", the
// record was linked to his directory row, and the Coach left Team blank.
const jon: CoverageLead = {
  teamIds: [ONBOARDING],
  identity: makeIdentity({
    personId: "person-jon",
    userId: "user-jon",
    names: ["Jonathan Boutin", "Jon Boutin"],
  }),
};
const david: CoverageLead = {
  teamIds: [PRESALES],
  identity: makeIdentity({ personId: "person-david", names: ["David McGeary"] }),
};
// One lead, two rows.
const jen: CoverageLead = {
  teamIds: [POPS, TA],
  identity: makeIdentity({ personId: "person-jen", names: ["Jen Kampf"] }),
};

let n = 0;
const record = (over: Partial<CoverageRecord> = {}): CoverageRecord => ({
  id: `uc-${++n}`,
  teamId: null,
  ownerPersonId: null,
  ownerUserId: null,
  ownerName: null,
  authors: [],
  ...over,
});
const authoredBy = (personId: string, displayName: string) => ({
  personId,
  userId: null,
  displayName,
});

describe("team coverage counts what the leads logged", () => {
  it("counts a lead's record whose Team was left blank", () => {
    const r = record({ ownerPersonId: "person-jon", ownerName: "Jon Boutin" });
    expect(teamCoverageCount(ONBOARDING, [jon], [r])).toBe(1);
  });

  it("counts a record the lead only authored", () => {
    const r = record({
      teamId: ONBOARDING,
      ownerName: "Someone Else",
      authors: [authoredBy("person-david", "David McGeary")],
    });
    expect(teamCoverageCount(PRESALES, [david], [r])).toBe(1);
  });

  it("matches free-text credit by name, as the lead's own page does", () => {
    const r = record({ ownerName: "Jon Boutin" });
    expect(teamCoverageCount(ONBOARDING, [jon], [r])).toBe(1);
  });

  it("does not count a record filed under the team that credits none of its leads", () => {
    const r = record({ teamId: ONBOARDING, ownerName: "A Colleague" });
    expect(teamCoverageCount(ONBOARDING, [jon], [r])).toBe(0);
  });

  it("counts a record crediting two co-leads once", () => {
    const r = record({
      ownerPersonId: "person-jon",
      authors: [authoredBy("person-david", "David McGeary")],
    });
    const coLed: CoverageLead[] = [
      { ...jon, teamIds: [ONBOARDING] },
      { ...david, teamIds: [ONBOARDING, PRESALES] },
    ];
    expect(teamCoverageCount(ONBOARDING, coLed, [r])).toBe(1);
  });

  it("counts nothing for a team with no assigned lead", () => {
    const r = record({ teamId: ONBOARDING, ownerPersonId: "person-jon" });
    expect(teamCoverageCount(ONBOARDING, [], [r])).toBe(0);
  });
});

describe("a lead who covers two teams", () => {
  it("counts a record filed under one of their teams on that row only", () => {
    const r = record({ teamId: POPS, ownerPersonId: "person-jen" });
    expect(teamCoverageCount(POPS, [jen], [r])).toBe(1);
    expect(teamCoverageCount(TA, [jen], [r])).toBe(0);
  });

  it("counts an unfiled record on both of their rows", () => {
    const r = record({ ownerPersonId: "person-jen" });
    expect(teamCoverageCount(POPS, [jen], [r])).toBe(1);
    expect(teamCoverageCount(TA, [jen], [r])).toBe(1);
  });

  it("counts a record filed under a team they don't cover on both rows", () => {
    const r = record({ teamId: ONBOARDING, ownerPersonId: "person-jen" });
    expect(teamCoverageCount(POPS, [jen], [r])).toBe(1);
    expect(teamCoverageCount(TA, [jen], [r])).toBe(1);
  });
});
