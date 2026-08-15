import { describe, expect, it } from "vitest";
import { editorialViolations, structureViolations } from "./editorial-checks";
import type { WeekData } from "./whats-new-prompt";

const rules = (post: string) =>
  editorialViolations(post).map((v) => v.rule);

/** A clean post that breaks none of the mechanical rules. */
const CLEAN = `# Three teams reach Qualified

Documented use cases stand at 31 of 45, with nine more in flight behind them.
Two records reached Confirmed Positive ROI this week.

## Movement

Meera Raghavan's invoice triage moved to Qualified.
`;

function weekData(overrides: Partial<WeekData> = {}): WeekData {
  return {
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    casespaceChanges: [],
    newRecords: [],
    promotions: [],
    regressions: [],
    newQualified: [],
    newConfirmedRoi: [],
    pulseReadings: [],
    scoreboardNow: {} as WeekData["scoreboardNow"],
    ...overrides,
  };
}

describe("editorialViolations", () => {
  it("passes a clean post", () => {
    expect(editorialViolations(CLEAN)).toEqual([]);
  });

  it("catches a dollar figure", () => {
    expect(rules("# Week\n\nIt saved $180,000 a year.")).toContain(
      "no dollar figures",
    );
  });

  it("catches dollars spelled out", () => {
    expect(rules("# Week\n\nRoughly 40k dollars of effort.")).toContain(
      "no dollar figures",
    );
    expect(rules("# Week\n\nMeasured in USD.")).toContain("no dollar figures");
  });

  it("catches pace editorializing", () => {
    expect(rules("# Week\n\nThe program is behind schedule.")).toContain(
      "no editorializing about pace",
    );
    expect(rules("# Week\n\nWe are on track for 45.")).toContain(
      "no editorializing about pace",
    );
  });

  it("leaves a bare 'behind' alone", () => {
    // The brief itself says "what is in flight behind them".
    expect(rules("# Week\n\nNine are in flight behind them.")).toEqual([]);
  });

  it("leaves percentage points alone", () => {
    expect(rules("# Week\n\nDaily use rose four points to 38 percent.")).toEqual(
      [],
    );
  });

  it("catches gamification and applause", () => {
    expect(rules("# Week\n\nCongratulations to the top team.")).toContain(
      "no gamification",
    );
    expect(rules("# Week\n\nKudos to Data.")).toContain("no gamification");
  });

  it("catches hype", () => {
    expect(rules("# Week\n\nAn amazing result.")).toContain("no hype");
  });

  it("catches emoji and exclamation marks", () => {
    expect(rules("# Week\n\nShipped 🎉")).toContain("no emoji");
    expect(rules("# Week\n\nShipped!")).toContain("no exclamation marks");
  });

  it("requires an h1, and a specific one", () => {
    expect(rules("No heading at all.")).toContain("opens with an h1 headline");
    expect(rules("# Weekly update\n\nBody.")).toContain(
      "headline is specific, not generic",
    );
  });

  it("reports every violation, not just the first", () => {
    const found = rules("# Weekly update\n\nAmazing! We saved $5.");
    expect(found).toEqual(
      expect.arrayContaining([
        "no dollar figures",
        "no hype",
        "no exclamation marks",
        "headline is specific, not generic",
      ]),
    );
  });
});

describe("structureViolations", () => {
  it("is quiet when the sections match the data", () => {
    expect(structureViolations(CLEAN, weekData())).toEqual([]);
  });

  it("flags a Pulse section in a week with no readings", () => {
    const found = structureViolations("# W\n\n## Pulse\n\nUp.", weekData());
    expect(found.map((v) => v.rule)).toContain(
      "Pulse appears only when the week has readings",
    );
  });

  it("flags a missing Pulse section when there are readings", () => {
    const found = structureViolations(
      "# W\n\nNo pulse here.",
      weekData({
        pulseReadings: [
          {
            metric: "Daily use",
            value: 38,
            unit: "percent",
            baseline: 22,
            target: 50,
            takenOn: "2026-08-07",
          },
        ],
      }),
    );
    expect(found.map((v) => v.rule)).toContain(
      "Pulse appears only when the week has readings",
    );
  });

  it("does not confuse the two 'New in' sections", () => {
    const found = structureViolations(
      "# W\n\n## New in the casebook\n\nA record.",
      weekData({
        newRecords: [
          { title: "Invoice triage", department: "Finance", owner: "Meera", by: "Meera" },
        ],
      }),
    );
    expect(found).toEqual([]);
  });

  it("flags an uncredited requester", () => {
    const data = weekData({
      casespaceChanges: [
        {
          title: "Mentions in edits",
          summary: "Edits say what they do to mentions.",
          requestedBy: "Kate Schaff",
          shippedOn: "2026-08-05",
        },
      ],
    });
    const found = structureViolations(
      "# W\n\n## New in Casespace\n\nEdits now explain themselves.",
      data,
    );
    expect(found.map((v) => v.rule)).toContain(
      "credits the person who requested a change",
    );

    const credited = structureViolations(
      "# W\n\n## New in Casespace\n\nKate Schaff asked for this one.",
      data,
    );
    expect(credited).toEqual([]);
  });
});
