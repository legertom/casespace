import { describe, expect, it } from "vitest";
import {
  composeFeedback,
  feedbackProposalSchema,
  type FeedbackProposal,
} from "./feedback-proposal";

function proposal(overrides: Partial<FeedbackProposal> = {}): FeedbackProposal {
  return {
    summary: "The funnel chart empties when a program filter is on.",
    whatHappened:
      "Opened /graphs, switched to the funnel view, turned on the program filter. The chart rendered with no bars.",
    expected: "Bars filtered to program records.",
    area: "/graphs",
    kind: "bug",
    ...overrides,
  };
}

describe("composeFeedback", () => {
  it("leads with the summary and keeps the account structured", () => {
    const { message } = composeFeedback(proposal(), "contributor");
    expect(message).toContain("The funnel chart empties when a program filter is on.");
    expect(message).toContain("What happened: Opened /graphs");
    expect(message).toContain("Expected: Bars filtered to program records.");
  });

  it("says who filed it, in the program's words for the role", () => {
    expect(composeFeedback(proposal(), "contributor").message).toContain(
      "Filed through the Coach by an AI Lead.",
    );
    expect(composeFeedback(proposal(), "employee").message).toContain(
      "Filed through the Coach by someone at Clever.",
    );
    expect(composeFeedback(proposal(), "viewer").message).toContain(
      "Filed through the Coach by a signed-in guest.",
    );
  });

  // The whole reason the trailer exists: an admin must be able to see which
  // sentence is the Coach's guess and which is the reporter's account.
  it("attributes the Coach's read to the Coach, not the reporter", () => {
    const { message } = composeFeedback(proposal({ kind: "request" }), "admin");
    expect(message).toContain("Coach's read: reads as a feature request.");
  });

  it("omits the read entirely when the Coach has no call to make", () => {
    const { message } = composeFeedback(proposal({ kind: null }), "admin");
    expect(message).not.toContain("Coach's read");
    expect(message).toContain("Filed through the Coach by an admin.");
  });

  it("drops the expected line when they never said", () => {
    const { message } = composeFeedback(proposal({ expected: null }), "admin");
    expect(message).not.toContain("Expected:");
  });

  it("puts the area in path, not in the message body", () => {
    expect(composeFeedback(proposal(), "admin").path).toBe("/graphs");
    expect(composeFeedback(proposal({ area: null }), "admin").path).toBeNull();
    expect(composeFeedback(proposal({ area: "   " }), "admin").path).toBeNull();
  });
});

describe("feedbackProposalSchema", () => {
  it("requires a summary and an account of what happened", () => {
    expect(feedbackProposalSchema.safeParse({ summary: "x" }).success).toBe(false);
    expect(
      feedbackProposalSchema.safeParse({ summary: "", whatHappened: "y" }).success,
    ).toBe(false);
    expect(
      feedbackProposalSchema.safeParse({ summary: "x", whatHappened: "y" }).success,
    ).toBe(true);
  });

  it("rejects a kind it has no label for", () => {
    expect(
      feedbackProposalSchema.safeParse({
        summary: "x",
        whatHappened: "y",
        kind: "catastrophe",
      }).success,
    ).toBe(false);
  });
});
