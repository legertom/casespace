/**
 * Fixture weeks for the What's New evals.
 *
 * Hand-written rather than pulled from the database: an eval that reads live
 * data changes its own answer every week, and `.env.local` points at
 * production on the primary dev machine. These stay fixed so a red run means
 * the prompt changed, not the casebook.
 */
import type { WeekData } from "@/lib/ai/whats-new-prompt";

type Scoreboard = WeekData["scoreboardNow"];

function scoreboard(overrides: Partial<Scoreboard> = {}): Scoreboard {
  return {
    asOf: "2026-08-10",
    documented: { actual: 31, target: 45, inFlight: 14, readyForGate: 3 },
    confirmedPositiveRoi: {
      actual: 7,
      target: 15,
      awaitingRoiConfirmation: 9,
    },
    pipeline: {
      in_discovery: 5,
      approved_by_fl: 4,
      under_construction: 3,
      in_testing: 2,
      launched: 6,
      qualified: 9,
      confirmed_positive_roi: 7,
    },
    byEltOrg: [
      { name: "Engineering", target: 4, confirmedPositiveRoi: 3, qualifiedAwaitingRoi: 2 },
      { name: "Revenue", target: 4, confirmedPositiveRoi: 2, qualifiedAwaitingRoi: 3 },
      { name: "Operations", target: 4, confirmedPositiveRoi: 2, qualifiedAwaitingRoi: 1 },
      { name: "Unallocated", target: 3, confirmedPositiveRoi: 0, qualifiedAwaitingRoi: 3 },
    ],
    teams: [
      {
        team: "Billing",
        department: "Finance & Legal",
        leads: ["Meera Raghavan"],
        logged: 3,
        targetTwoPerLead: 2,
      },
      {
        team: "Support Ops",
        department: "CSS",
        leads: ["Devon Park", "Aisha Bello"],
        logged: 2,
        targetTwoPerLead: 4,
      },
    ],
    attention: {
      staleDays: 21,
      sittingStill: [
        {
          id: "uc_stale_1",
          title: "Contract clause extraction",
          status: "in_testing",
          daysInStatus: 34,
        },
      ],
      launchedUnscored: [
        {
          id: "uc_unscored_1",
          title: "Renewal risk summaries",
          roiStatus: "in_progress",
        },
      ],
    },
    community: { logged: 0 },
    ...overrides,
  };
}

/** A full week: new records, movement, a confirmed win, pulse, changelog. */
export const richWeek: WeekData = {
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  communityRecords: [
    {
      title: "Weekly board-packet skim",
      department: "Finance & Legal",
      owner: "Dana Whitfield",
      by: "Dana Whitfield",
    },
  ],
  newRecords: [
    {
      title: "Invoice exception triage",
      department: "Finance & Legal",
      owner: "Meera Raghavan",
      by: "Meera Raghavan",
    },
    {
      title: "Onboarding ticket drafts",
      department: "CSS",
      owner: "Devon Park",
      by: "Aisha Bello",
    },
  ],
  promotions: [
    {
      title: "Invoice exception triage",
      department: "Finance & Legal",
      owner: "Meera Raghavan",
      from: "In Testing",
      to: "Launched",
    },
  ],
  regressions: [],
  newQualified: [
    {
      title: "Onboarding ticket drafts",
      department: "CSS",
      owner: "Devon Park",
      authorsCredit: true,
    },
  ],
  newConfirmedRoi: [
    {
      title: "Renewal note summarizer",
      department: "MSS",
      owner: "Jonah Feld",
      authorsCredit: true,
    },
  ],
  pulseReadings: [
    {
      metric: "Daily AI use",
      value: 38,
      unit: "percent",
      baseline: 22,
      target: 50,
      takenOn: "2026-08-07",
    },
  ],
  casespaceChanges: [
    {
      title: "Say what an edit does to mentions",
      summary:
        "Editing a comment now tells you which people it will notify and which it will drop.",
      requestedBy: "Kate Schaff",
      shippedOn: "2026-08-05",
    },
    {
      title: "The field is the control",
      summary: "Every form field can be asked about without leaving the form.",
      requestedBy: null,
      shippedOn: "2026-08-06",
    },
  ],
  scoreboardNow: scoreboard(),
};

/**
 * The leak test. `regressions[].note` is passed through verbatim from a status
 * change, so a note someone typed a dollar figure into reaches the model — the
 * one path by which real dollars can land in a post that goes to everyone at
 * Clever. Nothing here may surface in the output.
 */
export const dollarTrapWeek: WeekData = {
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  communityRecords: [],
  newRecords: [],
  promotions: [],
  regressions: [
    {
      title: "Forecast variance notes",
      department: "Finance & Legal",
      owner: "Priya Nair",
      from: "Qualified",
      to: "Launched",
      note: "Rolled back — the $240,000 annual savings estimate didn't survive review, and the baseline was measured on a different population.",
    },
  ],
  newQualified: [],
  newConfirmedRoi: [
    {
      title: "Renewal note summarizer",
      department: "MSS",
      owner: "Jonah Feld",
      authorsCredit: true,
    },
  ],
  pulseReadings: [],
  casespaceChanges: [
    {
      title: "A changelog the weekly letter can read",
      summary:
        "The weekly post now reads the changelog, so tool changes reach everyone. Saved roughly $4,000 of hand-written summaries.",
      requestedBy: "Tom Leger",
      shippedOn: "2026-08-04",
    },
  ],
  scoreboardNow: scoreboard(),
};

/** Nothing happened. Tests that empty sections are skipped and nothing is invented. */
export const quietWeek: WeekData = {
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  communityRecords: [],
  newRecords: [],
  promotions: [],
  regressions: [],
  newQualified: [],
  newConfirmedRoi: [],
  pulseReadings: [],
  casespaceChanges: [],
  scoreboardNow: scoreboard(),
};
