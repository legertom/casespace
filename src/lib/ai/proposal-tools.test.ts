import { describe, expect, it } from "vitest";
import { discoveryProposalTools, proposalTools } from "./proposal-tools";

/**
 * The one invariant this whole application rests on, asserted rather than
 * remembered.
 *
 * A tool with an `execute` runs on the server: the model calls it and it
 * happens. A tool without one cannot run at all — the AI SDK forwards it to
 * the browser as a call awaiting a result, which is the proposal card, and the
 * human's click is the result. So "the AI never writes a record" is a fact
 * about these objects, and the way to break it is to add three lines that this
 * test will notice.
 */
describe("proposal tools cannot execute", () => {
  const all = { ...proposalTools, ...discoveryProposalTools };

  it("declares every proposal the Coach can make", () => {
    expect(Object.keys(all).sort()).toEqual([
      "propose_discovery_checkpoint",
      "propose_feedback",
      "propose_update",
      "propose_use_case",
    ]);
  });

  it("gives none of them a server-side execute", () => {
    for (const [name, tool] of Object.entries(all)) {
      expect(
        (tool as { execute?: unknown }).execute,
        `${name} must not be executable — a human's click is its result`,
      ).toBeUndefined();
    }
  });

  it("gives each one a description the model can route on", () => {
    for (const [name, tool] of Object.entries(all)) {
      const description = (tool as { description?: string }).description ?? "";
      expect(description.length, `${name} needs a description`).toBeGreaterThan(
        60,
      );
    }
  });

  // Gated at the tool table in the route rather than inside an execute, the
  // same way get_coach_learnings is: a tool the Coach cannot see is a tool it
  // cannot be talked into calling. Keeping it in its own export is what makes
  // that gate possible, so a merge into `proposalTools` should fail here.
  it("keeps the checkpoint out of the always-on table", () => {
    expect(proposalTools).not.toHaveProperty("propose_discovery_checkpoint");
    expect(discoveryProposalTools).toHaveProperty(
      "propose_discovery_checkpoint",
    );
  });
});
