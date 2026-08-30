import { describe, expect, it } from "vitest";
import { coachInstructions } from "./coach-prompt";
import { COACH_INTENTS } from "@/lib/domain";

const ctx = {
  userName: "Dana Whitfield",
  role: "employee",
  todayEt: "2026-08-10",
};

const WIZARD_MARKER = "## Intake wizard mode";
const ROI_MARKER = "## ROI review mode";
const DISCOVERY_MARKER = "## Discovery mode";

describe("the shared core", () => {
  it("is in every mode", () => {
    for (const intent of COACH_INTENTS) {
      const p = coachInstructions({ ...ctx, intent });
      expect(p).toContain("You are the Casespace Coach");
      expect(p).toContain("## Voice");
      expect(p).toContain("## What the program measures");
      expect(p).toContain("## Tools");
      expect(p).toContain("## Product feedback mode");
      expect(p).toContain("## Program housekeeping");
      // The counting rule is the one the Coach most easily gets wrong, so it
      // has to survive every way the prompt can be composed.
      expect(p).toContain("Never dollars");
    }
  });

  it("names the person and the day in every mode", () => {
    for (const intent of COACH_INTENTS) {
      const p = coachInstructions({ ...ctx, intent });
      expect(p).toContain("Dana Whitfield");
      expect(p).toContain("2026-08-10");
    }
  });
});

describe("wizard, ROI review, and QA", () => {
  // These three have always carried all of the original mode sections. They
  // still do, and they are identical to each other — the intent changes which
  // *kickoff* is sent, not what the Coach is told it can do.
  it("get the same instructions as each other", () => {
    const wizard = coachInstructions({ ...ctx, intent: "wizard" });
    expect(coachInstructions({ ...ctx, intent: "qa" })).toBe(wizard);
    expect(coachInstructions({ ...ctx, intent: "roi_review" })).toBe(wizard);
    expect(coachInstructions(ctx)).toBe(wizard);
  });

  it("keep the wizard interview and the ROI packet", () => {
    const p = coachInstructions({ ...ctx, intent: "wizard" });
    expect(p).toContain(WIZARD_MARKER);
    expect(p).toContain(ROI_MARKER);
    expect(p).toContain("Kate-ready packet");
    expect(p).not.toContain(DISCOVERY_MARKER);
  });
});

describe("discovery mode", () => {
  const p = coachInstructions({ ...ctx, intent: "discovery" });

  it("replaces the wizard's fixed interview rather than adding to it", () => {
    expect(p).toContain(DISCOVERY_MARKER);
    expect(p).toContain("You are not running the intake wizard");
    // The failure this guards: a Discovery conversation that still has the
    // twelve-step interview in its context will drift into running it.
    expect(p).not.toContain(WIZARD_MARKER);
    expect(p).not.toContain(ROI_MARKER);
  });

  it("says what the job is, and what it is not", () => {
    expect(p).toContain(
      "Improve their understanding of the problem until the next best learning action becomes clear",
    );
    expect(p).toContain("Do not steer toward building software");
  });

  it("carries the four coaching moves and the one-question rule", () => {
    expect(p).toContain("**Ask**");
    expect(p).toContain("**Teach**");
    expect(p).toContain("**Suggest**");
    expect(p).toContain("**Challenge**");
    expect(p).toContain("One main question per reply");
  });

  it("permits non-AI outcomes and refuses to default either way", () => {
    expect(p).toContain("Do not default to building, and do not default to research");
    expect(p).toContain("decide AI doesn't help here");
  });

  it("keeps the checkpoint a proposal and the use case optional", () => {
    expect(p).toContain("propose_discovery_checkpoint");
    expect(p).toContain("nothing is saved until they click");
    expect(p).toContain("Never propose a use case just because a checkpoint exists");
  });

  it("says an unclear constraint is a real answer", () => {
    expect(p).toContain("If it is still unclear, say that too");
  });
});

describe("a discovery conversation anchored to a record", () => {
  it("names the record and tells the Coach to look it up rather than recite it", () => {
    const p = coachInstructions({
      ...ctx,
      intent: "discovery",
      useCase: { id: "uc-42", title: "Invoice triage" },
    });
    expect(p).toContain("Invoice triage");
    expect(p).toContain("uc-42");
    expect(p).toContain("Call get_use_case with that id");
    // Context the app supplied, not something the conversation claimed — the
    // distinction the Coach has to keep straight to stay groundable.
    expect(p).toContain("context this app gave you");
  });

  it("says nothing about a record when there isn't one", () => {
    const p = coachInstructions({ ...ctx, intent: "discovery" });
    expect(p).not.toContain("### This conversation is anchored to a record");
    expect(p).not.toContain("Call get_use_case with that id");
  });

  // The link is Discovery's; it would be noise in the other modes and is not
  // wired into them.
  it("is not smuggled into the wizard prompt", () => {
    const p = coachInstructions({
      ...ctx,
      intent: "wizard",
      useCase: { id: "uc-42", title: "Invoice triage" },
    });
    expect(p).not.toContain("uc-42");
  });
});
