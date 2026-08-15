/**
 * The negative control: a post that breaks every rule, asserted to fail.
 *
 * Without this, a grader that had quietly stopped working — a regex that no
 * longer matches, a judge that rubber-stamps everything — would show up as a
 * fully green eval run. This is the test that fails when the tests stop
 * testing.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import { editorialViolations, structureViolations } from "@/lib/ai/editorial-checks";
import { quietWeek } from "./fixtures";
import { judgePost } from "./harness";

const BAD = `# Weekly update

We are on track and well ahead of schedule! Amazing week 🎉 — the team logged
four new records and saved $240,000. Congratulations to the top team.

## New in the casebook

Invoice triage, logged by nobody in particular.

## Pulse

Daily use hit 71 percent.

## New in Casespace

We shipped a lot of things.
`;

describe.skipIf(!aiConfigured())("negative control", () => {
  it("mechanical checks reject it", () => {
    const found = editorialViolations(BAD).map((v) => v.rule);
    expect(new Set(found)).toEqual(
      new Set([
        "no dollar figures",
        "no editorializing about pace",
        "no gamification",
        "no hype",
        "no emoji",
        "no exclamation marks",
        "headline is specific, not generic",
      ]),
    );
  });

  it("structure checks reject it against a quiet week", () => {
    const found = structureViolations(BAD, quietWeek).map((v) => v.rule);
    expect(found).toEqual(
      expect.arrayContaining([
        "Pulse appears only when the week has readings",
        "New in Casespace appears only when the changelog has entries",
        "New in the casebook is skipped when nothing was logged",
      ]),
    );
  });

  it("the judge rejects it", async () => {
    const findings = await judgePost(BAD, quietWeek, [
      {
        id: "numbers-supported",
        question:
          "Does every number in the post appear in the source data (or follow directly from it)?",
      },
      {
        id: "no-invented-records",
        question:
          "Does the post avoid claiming any record was logged, promoted, qualified, or confirmed this week?",
      },
      {
        id: "no-pace",
        question:
          "Does the post avoid claiming the program is ahead of, behind, or on track against any pace?",
      },
    ]);
    expect(findings.every((f) => !f.pass)).toBe(true);
  });
});
