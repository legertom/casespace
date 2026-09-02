/**
 * Evals for what the Coach is allowed to say about someone's place on the
 * roster, and about whether a record counts.
 *
 * Written from a real failure. An AI Lead logged two use cases back to back;
 * the first went through without comment, and on the second the Coach
 * volunteered that she was "not listed as an AI Lead" so the record would
 * "start as a community record". She said "No — I am the AI lead, please fix
 * that", and it referred her to an admin. Pushed a third time it finally
 * called get_progress, found her on the roster, and agreed the record counted
 * all along.
 *
 * Nothing in the data differed between the two records. The Coach was reading
 * the `role:` line in its own prompt — which says whether that *login* matched
 * a roster address, not whether the person is a lead — and treating it as a
 * fact about her. The tool that settles it was available the whole time.
 *
 * `pnpm eval`. Real model calls, so this is slow and costs money — it is not
 * part of `pnpm test`.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import { describeCalls, runCoach } from "./coach-harness";

/** The role a lead has when her sign-in address isn't the one on her row. */
const UNLINKED_LEAD = { userName: "Marley Koschel", role: "employee" };

const saidNotALead = (text: string) =>
  /not (?:listed |registered |shown )?(?:as )?an? ai lead|you'?re not on the roster|aren'?t an ai lead/i.test(
    text,
  );

describe.skipIf(!aiConfigured())("Coach — roster claims", () => {
  it("looks it up when told it has someone's lead status wrong", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content: "log my help center localization workflow, I own it",
        },
        {
          role: "assistant",
          content:
            "Logged: Help Center Localization & Translation Workflow, status In Testing, owner Marley Koschel. Since you're not listed as an AI Lead, it'll start as a community record.",
        },
        { role: "user", content: "No- I am the AI lead, please fix that" },
      ],
      UNLINKED_LEAD,
    );

    // The whole failure in one assertion: it had get_progress and used the
    // role string instead.
    expect(
      run.toolCalls.some((c) => c.toolName === "get_progress"),
      `called: ${describeCalls(run)}`,
    ).toBe(true);

    // Referring her to an admin was the part that stung — it turned "I got
    // this wrong" into "go and prove it to someone else".
    expect(saidNotALead(run.text)).toBe(false);
  }, 60_000);

  it("does not call someone a non-lead from the role in its prompt", async () => {
    const run = await runCoach(
      [{ role: "user", content: "am I an AI lead? do my records count?" }],
      UNLINKED_LEAD,
    );

    // Either it looks, or it says it needs to. What it may not do is answer
    // "no" from a role string that cannot carry that meaning.
    const looked = run.toolCalls.some((c) => c.toolName === "get_progress");
    expect(looked || !saidNotALead(run.text), `called: ${describeCalls(run)}`).toBe(
      true,
    );
  }, 60_000);

  it("doesn't volunteer a community verdict on a record it just proposed", async () => {
    const run = await runCoach(
      [
        {
          role: "user",
          content:
            "log this: help center localization workflow, we run articles through Claude for first-pass translation and a human reviews. I'm the owner. it's in testing.",
        },
      ],
      UNLINKED_LEAD,
    );

    // Membership is stamped from the OWNER, server-side. Her being named owner
    // is what makes it a program record, whoever typed it in — so a community
    // warning here is not a hedge, it is wrong.
    expect(/community record/i.test(run.text), run.text).toBe(false);
  }, 60_000);
});
