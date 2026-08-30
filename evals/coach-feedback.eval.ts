/**
 * Evals for the Coach's product-feedback tool.
 *
 * Unit tests cover `composeFeedback` and the schema — but those run *after* the
 * model has already decided to call `propose_feedback` with those arguments.
 * Tool selection is model judgment, and no unit test can reach it. That is what
 * these check: does a gripe about Casespace route to feedback rather than to a
 * record proposal, and does the Coach ask enough to make the report worth
 * triaging before it proposes.
 *
 * Assertions are deliberately structural — which tool, which fields present —
 * rather than graded prose. `kind` is the one field left unpinned: the schema
 * calls it the Coach's own read, so asserting a specific value would test the
 * model's taste instead of the wiring.
 *
 * `pnpm eval`. Real model calls, so this is slow and costs money — it is not
 * part of `pnpm test`.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import { FEEDBACK_KINDS } from "@/lib/ai/feedback-proposal";
import { describeCalls, feedbackProposal, runCoach } from "./coach-harness";

describe.skipIf(!aiConfigured())("Coach — product feedback", () => {
  // The failure this guards against is a one-line report. "Roster is broken"
  // tells an admin nothing, and the prompt's whole feedback section exists to
  // stop the Coach filing it.
  it("asks what happened before proposing anything", async () => {
    const run = await runCoach([
      { role: "user", content: "the roster page is broken" },
    ]);

    expect(feedbackProposal(run), `called: ${describeCalls(run)}`).toBeNull();
    expect(run.text).toContain("?");
  }, 60_000);

  it("proposes feedback once it has the story, keeping the reporter's words", async () => {
    const run = await runCoach([
      { role: "user", content: "the roster page is broken" },
      {
        role: "assistant",
        content:
          "What were you doing on the roster when it went wrong, and what did you expect to happen?",
      },
      {
        role: "user",
        content:
          "I clicked an AI Lead's email address to edit it, typed the new one, and hit save. The button just spun and never finished. I expected it to save and show the new address in place.",
      },
    ]);

    const proposal = feedbackProposal(run);
    expect(proposal, `called: ${describeCalls(run)}`).not.toBeNull();

    // They said what they expected, so the field the admin triages on must
    // carry it rather than getting folded into the narrative.
    expect(proposal?.expected).toBeTruthy();

    // "Never guess a route": roster is what they named, so roster is what the
    // area may say.
    expect(String(proposal?.area ?? "").toLowerCase()).toContain("roster");

    expect(String(proposal?.whatHappened ?? "")).toMatch(/sav|spin|email/i);

    // Set, because a report this specific is callable — but which call it is
    // stays the Coach's judgment.
    expect(proposal?.kind).toBeTruthy();
    expect(FEEDBACK_KINDS).toContain(proposal?.kind);
  }, 60_000);

  // The tool description draws this line explicitly, and it is the confusion
  // most likely to matter: a wrong owner is a record edit, not a product bug.
  it("does not file feedback about a record's own contents", async () => {
    const run = await runCoach([
      {
        role: "user",
        content:
          "The owner on the invoice triage record is wrong — it says me, but Meera Raghavan owns it now. Can you fix that?",
      },
    ]);

    expect(feedbackProposal(run), `called: ${describeCalls(run)}`).toBeNull();
  }, 60_000);

  // Viewers cannot write to the casebook, but feedback is not a casebook write.
  // The prompt says anyone signed in can file; this is the one place that
  // distinction is load-bearing.
  it("files for a signed-in guest, who cannot log a use case", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "I'm on /graphs and the pipeline drawing renders on top of the footer so I can't read the last stage. I expected the drawing to fit above it. Can you report that?",
        },
      ],
      { userName: "Priya Raman", role: "viewer" },
    );

    expect(feedbackProposal(run), `called: ${describeCalls(run)}`).not.toBeNull();
  }, 60_000);
});
