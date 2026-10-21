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

const NO_DOLLARS = /\$\s?\d/;

describe.skipIf(!aiConfigured())("Coach — Kate's ROI method", () => {
  // Knowledge check #5. The wrong move is a guessed baseline; the right one
  // is the calendar question, and no number until they answer it.
  it("asks the calendar question when there is no baseline, and proposes no number", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "Logging the RFP answerer. It drafts answers to repeat RFP questions from our approved bank. Built it in about two days, it's launched, the proposals team uses it every week. ROI-wise, honestly no idea how long the old way took — nobody ever tracked it.",
        },
      ],
      { intent: "wizard" },
    );

    expect(run.text.toLowerCase(), describeCalls(run)).toMatch(/calendar|block/);
    for (const call of roiCalls(run)) {
      expect(call.baselineValue, "a baseline the human never gave").toBeNull();
    }
    const proposal = useCaseProposal(run);
    if (proposal) expect(proposal.baselineValue ?? null).toBeNull();
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
      { intent: "qa", multiStep: true },
    );

    const calls = roiCalls(run);
    expect(calls.length, `called: ${describeCalls(run)}`).toBeGreaterThan(0);
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
      { intent: "qa", multiStep: true },
    );

    const calls = roiCalls(run);
    expect(calls.length, `called: ${describeCalls(run)}`).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({
      valueType: "time_saved",
      baselineValue: 10,
      afterValue: 1,
      buildHours: 80,
    });
    expect(run.text).toMatch(/35\s?%/);
    expect(run.text).not.toMatch(NO_DOLLARS);
  }, 90_000);

  // Dollars never reach a record. Given a dollar figure, the Coach asks for
  // the hours behind it rather than converting or filing it.
  it("keeps a dollar figure off the record and asks for the hours behind it", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "Log the invoice matcher for me. Finance team, I own it, built with Claude Code, launched last month, two of us use it. The ROI is about $9,000 a year in saved time at $75 an hour — build was 80 hours.",
        },
      ],
      { intent: "wizard" },
    );

    const proposal = useCaseProposal(run);
    if (proposal) {
      expect(JSON.stringify(proposal)).not.toMatch(NO_DOLLARS);
      expect(JSON.stringify(proposal).toLowerCase()).not.toMatch(/dollar/);
    }
    for (const call of roiCalls(run)) {
      expect(JSON.stringify(call)).not.toMatch(NO_DOLLARS);
    }
    expect(run.text.toLowerCase(), describeCalls(run)).toMatch(/hour/);
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
      { intent: "qa" },
    );

    const text = run.text.toLowerCase();
    expect(text, describeCalls(run)).toMatch(/separate|its own record|second record|two records/);
    expect(text).toMatch(/revisit/);
    expect(text).not.toMatch(/wait until 2027|nothing (yet|for now)/);
  }, 90_000);

  // Negative control. A plan is not a measurement: with only expected numbers
  // in hand, the proposal must leave the outcome and the measurement status
  // alone for a human.
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
        { role: "user", content: "Named, tool, owner — yes. Adoption no, just me so far. Go ahead." },
      ],
      { intent: "wizard" },
    );

    const proposal = useCaseProposal(run);
    expect(proposal, `called: ${describeCalls(run)}`).not.toBeNull();
    expect(proposal?.isPositive ?? null).toBeNull();
    expect(proposal?.postValue ?? null).toBeNull();
    expect(proposal?.roiStatus ?? "not_yet_measurable").not.toBe("complete");
    expect(proposal?.baselineEstimated).toBe(true);
    expect(JSON.stringify(proposal)).not.toMatch(NO_DOLLARS);
  }, 90_000);
});
