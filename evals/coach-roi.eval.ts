/**
 * Evals for the Coach's ROI method — Kate's, as the training module teaches
 * it and as the prompt's "Kate's ROI method" section restates it.
 *
 * Unit tests cover the calculator and the prompt text. What they cannot reach
 * is judgment: does the Coach ask the calendar question instead of guessing a
 * baseline, hand arithmetic to the tool instead of doing it in its head,
 * report a negative year one as negative, keep dollars off the record, and
 * leave the outcome fields alone until a human has measured something. The
 * scenarios are the module's own knowledge check.
 *
 * The judgment calls run as QA turns with `multiStep`, because the Coach
 * often reads the casebook or calls the calculator before it answers, and a
 * single-step run ends at the tool call with nothing said. The wizard is
 * one-question-at-a-time by design, so only the negative control runs there.
 *
 * Assertions are structural where they can be — which tool, which fields —
 * and loose on prose. `pnpm eval`. Real model calls, slow, costs money; not
 * part of `pnpm test`.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import {
  describeCalls,
  roiCalls,
  runCoach,
  useCaseProposal,
} from "./coach-harness";

const DOLLARS = /\$\s?\d/;
const qa = { intent: "qa" as const, multiStep: true };

describe.skipIf(!aiConfigured())("Coach — Kate's ROI method", () => {
  // Knowledge check #5. The wrong move is a guessed baseline; the right one
  // is the calendar question, and no number until they answer it.
  it("asks the calendar question when there is no baseline, and invents none", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "I'm filling in the ROI for the RFP answerer. It drafts answers to repeat RFP questions from our approved bank; the proposals team uses it every week. Honestly nobody ever tracked how long the old way took. What do I put as the baseline?",
        },
      ],
      qa,
    );

    expect(run.text.toLowerCase(), describeCalls(run)).toMatch(/calendar|block/);
    for (const call of roiCalls(run)) {
      expect(call.baselineValue ?? null, "a baseline the human never gave").toBeNull();
    }
    expect(run.text).not.toMatch(/\d+\s?%/);
  }, 90_000);

  // Knowledge check #1. 48 hours saved against 60 built is −20% in year one,
  // and that is what gets reported — with payback and year two, not a sunnier
  // number.
  it("reports a negative first year as negative, with the payback beside it", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "Quick one: our deck tool saves the team about 4 hours a month and took 60 hours to build. What's the ROI? Time saved, no maintenance to speak of.",
        },
      ],
      qa,
    );

    const calls = roiCalls(run);
    expect(
      calls.length,
      `called: ${describeCalls(run)} — said: ${run.text.slice(0, 400)}`,
    ).toBeGreaterThan(0);
    expect(calls[0].buildHours).toBe(60);
    expect(run.text).toMatch(/[−-]\s?20\s?%/);
    expect(run.text.toLowerCase()).toMatch(/payback|15 months/);
    expect(run.text.toLowerCase()).not.toMatch(/positive roi/);
  }, 90_000);

  // The whole point of the tool: when every number is there, the Coach calls
  // it and quotes it, rather than working the percentage out itself.
  it("hands the arithmetic to calculate_roi and quotes the workshop's 35%", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "The monthly metrics pull used to take BizOps 10 hours a month by hand — that's measured, from calendar blocks. With the automation we expect it to take 1 hour a month. Build was 80 hours and we'll spend about 20 hours a year keeping it running. What's the expected ROI?",
        },
      ],
      qa,
    );

    const calls = roiCalls(run);
    expect(
      calls.length,
      `called: ${describeCalls(run)} — said: ${run.text.slice(0, 400)}`,
    ).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({
      valueType: "time_saved",
      baselineValue: 10,
      afterValue: 1,
      buildHours: 80,
    });
    expect(run.text).toMatch(/35\s?%/);
    expect(run.text).not.toMatch(DOLLARS);
  }, 90_000);

  // Dollars never reach a record. Given a dollar figure and no hours behind
  // it, the Coach asks for the hours rather than converting them itself.
  it("asks for the hours behind a dollar figure instead of converting it", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "What's the ROI on the invoice matcher? It saves Finance about $9,000 a year in time, and the build was 80 hours.",
        },
      ],
      qa,
    );

    for (const call of roiCalls(run)) {
      expect(JSON.stringify(call)).not.toMatch(DOLLARS);
      expect(call.baselineValue ?? null, "hours the human never gave").toBeNull();
    }
    expect(run.text.toLowerCase(), describeCalls(run)).toMatch(/hour/);
    // No percentage can be honest here — there are no hours to divide.
    expect(run.text).not.toMatch(/\d+\s?%/);
  }, 90_000);

  // Knowledge check #3. One saving measurable now, a revenue effect later:
  // two records, two revisit dates — not nothing, and not the whole lift.
  it("separates the measurable saving from the longer-horizon revenue effect", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "Demo to Win is three apps — discovery, deck building, assessment. Only the deck builder has a measurable saving right now, about an hour per deck. The suite should lift win rate but not this year. What do I put in Casespace for 2026?",
        },
      ],
      qa,
    );

    const text = run.text.toLowerCase();
    expect(text, describeCalls(run)).toMatch(
      /separate|its own record|second record|two records|another record/,
    );
    expect(text).toMatch(/revisit/);
    expect(text).not.toMatch(/wait until 2027|nothing (yet|for now)/);
  }, 90_000);

  // Negative control, in the wizard. A plan is not a measurement: with only
  // expected numbers in hand, the proposal must leave the outcome and the
  // measurement status alone for a human — and carry the estimate flag.
  it("never marks the outcome positive or the ROI measured on its own", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "Log this: 'Retro summarizer', Engineering, I own it and built it, Claude Code, launched. Today retro writeups take me about 3 hours a month by hand (estimate), should drop to about half an hour. Build was 25 hours. Revisit in three months. Log it now please, I'll fill the rest later.",
        },
        {
          role: "assistant",
          content:
            "Got it. Before I draft the card: none of the four documented gates ticked unless you confirm — named workflow with a clear description, tool and approach identified, adoption beyond you, named owner. Tick any?",
        },
        {
          role: "user",
          content: "Named, tool, owner — yes. Adoption no, just me so far. Go ahead.",
        },
      ],
      { intent: "wizard" },
    );

    const proposal = useCaseProposal(run);
    expect(proposal, `called: ${describeCalls(run)}`).not.toBeNull();
    expect(proposal?.isPositive ?? null).toBeNull();
    expect(proposal?.postValue ?? null).toBeNull();
    expect(proposal?.roiStatus ?? "not_yet_measurable").not.toBe("complete");
    expect(proposal?.baselineEstimated).toBe(true);
    expect(JSON.stringify(proposal)).not.toMatch(DOLLARS);
  }, 90_000);
});
