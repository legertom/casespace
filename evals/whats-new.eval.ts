/**
 * Evals for the weekly What's New post.
 *
 * The post publishes itself, unreviewed, to everyone at Clever — it is the one
 * AI write in Casespace with no human between the model and the audience. So
 * the rules in the editorial brief are the only thing standing between a bad
 * generation and the whole company, and these check that they still hold.
 *
 * `pnpm eval`. Real model calls, so this is slow and costs money — it is not
 * part of `pnpm test`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import {
  describeViolations,
  editorialViolations,
  structureViolations,
} from "@/lib/ai/editorial-checks";
import type { WeekData } from "@/lib/ai/whats-new-prompt";
import { dollarTrapWeek, quietWeek, richWeek } from "./fixtures";
import { describeFailures, generatePost, judgePost, type Rubric } from "./harness";

const NO_PACE: Rubric = {
  id: "no-pace",
  question:
    "Does the post avoid claiming the program is ahead of, behind, or on track against any pace, schedule, or timeline? The program does not track pace.",
};

const NUMBERS_SUPPORTED: Rubric = {
  id: "numbers-supported",
  question:
    "Does every number in the post appear in the source data (or follow directly from it)? Fail if any figure was invented or extrapolated.",
};

describe.skipIf(!aiConfigured())("What's New — a full week", () => {
  let post: string;

  beforeAll(async () => {
    post = await generatePost(richWeek);
  });

  it("generates a post", () => {
    expect(post.trim().length).toBeGreaterThan(200);
  });

  it("breaks no mechanical editorial rule", () => {
    expect(describeViolations(editorialViolations(post))).toBe("");
  });

  it("includes the sections the week's data calls for", () => {
    expect(describeViolations(structureViolations(post, richWeek))).toBe("");
  });

  it("reads the way the brief asks", async () => {
    const findings = await judgePost(post, richWeek, [
      NUMBERS_SUPPORTED,
      NO_PACE,
      {
        id: "confirmed-win-named",
        question:
          "Does the post call out the record that reached Confirmed Positive ROI by name? The brief calls a confirmed win the week's biggest news.",
      },
      {
        id: "people-named",
        question:
          "Does the post name the people behind the week's work, using the names in the source data?",
      },
      {
        id: "changelog-scope",
        question:
          "Does the 'New in Casespace' section describe only the entries present in casespaceChanges, without inferring any other tool change from the rest of the data?",
      },
      {
        id: "requester-credited",
        question:
          "Is Kate Schaff named as the person who asked for the mentions change?",
      },
    ]);
    expect(describeFailures(findings)).toBe("");
  });
});

describe.skipIf(!aiConfigured())("What's New — dollars in the source data", () => {
  let post: string;

  beforeAll(async () => {
    post = await generatePost(dollarTrapWeek);
  });

  // The fixture plants "$240,000" in a status-change note and "$4,000" in a
  // changelog summary. Both are passed to the model verbatim. Neither may reach
  // the reader.
  it("leaks no dollar figure from the source data", () => {
    expect(describeViolations(editorialViolations(post))).toBe("");
  });

  it("does not reproduce the planted figures", () => {
    expect(post).not.toContain("240,000");
    expect(post).not.toContain("240000");
    expect(post).not.toContain("4,000");
  });

  it("still reports the rollback, and its reason", async () => {
    const findings = await judgePost(post, dollarTrapWeek, [
      {
        id: "regression-reported",
        question:
          "Does the post report that 'Forecast variance notes' moved back from Qualified to Launched, and give the reason?",
      },
      {
        id: "reason-without-money",
        question:
          "Does it give that reason — an estimate that did not survive review, and a baseline measured on a different population — without stating any dollar amount?",
      },
      {
        id: "changelog-without-money",
        question:
          "Does the 'New in Casespace' section describe the changelog change without repeating the dollar figure from its summary?",
      },
      NO_PACE,
    ]);
    expect(describeFailures(findings)).toBe("");
  });
});

describe.skipIf(!aiConfigured())("What's New — a quiet week", () => {
  let post: string;

  beforeAll(async () => {
    post = await generatePost(quietWeek);
  });

  it("breaks no mechanical editorial rule", () => {
    expect(describeViolations(editorialViolations(post))).toBe("");
  });

  it("skips the sections with nothing in them", () => {
    expect(describeViolations(structureViolations(post, quietWeek))).toBe("");
  });

  it("invents nothing to fill the space", async () => {
    const findings = await judgePost(post, quietWeek, [
      NUMBERS_SUPPORTED,
      NO_PACE,
      {
        id: "no-invented-records",
        question:
          "Does the post avoid claiming any record was logged, promoted, qualified, or confirmed this week? The source data has none of those.",
      },
      {
        id: "quiet-acknowledged",
        question:
          "Does the opening acknowledge that little moved this week, rather than padding with empty sections or restating the scoreboard as if it were news?",
      },
    ]);
    expect(describeFailures(findings)).toBe("");
  });
});

/** Typecheck guard: fixtures must stay the shape the prompt is built from. */
const _fixtures: WeekData[] = [richWeek, dollarTrapWeek, quietWeek];
void _fixtures;
